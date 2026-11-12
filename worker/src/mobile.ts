import { isRateLimited } from "./rate-limit";

interface MailerBinding {
  fetch(request: Request): Promise<Response>;
}
interface MobileEnv {
  DB: D1Database;
  MOBILE_AUTH_PEPPER?: string;
  MAILER?: MailerBinding;
}

const OTP_TTL = 300;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_TTL = 30 * 24 * 60 * 60;
const MAX_MESSAGE_LENGTH = 2000;
const json = (data: Record<string, unknown>, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  },
});
const nowSeconds = () => Math.floor(Date.now() / 1000);
const hex = (bytes: Uint8Array) => Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
const randomHex = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return hex(bytes);
};
async function hmac(value: string, pepper: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}
function constantTimeEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return mismatch === 0;
}
async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 8192) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown> : null;
  } catch {
    await reader.cancel().catch(() => {});
    return null;
  }
}
function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
async function consumeLimit(env: MobileEnv, scope: string, identity: string, limit: number, windowSeconds: number) {
  const keyHash = await hmac("rate-limit:" + identity, env.MOBILE_AUTH_PEPPER!);
  const now = nowSeconds();
  const row = await env.DB.prepare(
    `INSERT INTO mobile_rate_limits(scope, key_hash, window_start, count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(scope, key_hash) DO UPDATE SET
       count = CASE WHEN mobile_rate_limits.window_start <= ? THEN 1 ELSE mobile_rate_limits.count + 1 END,
       window_start = CASE WHEN mobile_rate_limits.window_start <= ? THEN excluded.window_start ELSE mobile_rate_limits.window_start END
     RETURNING count`
  ).bind(scope, keyHash, now, now - windowSeconds, now - windowSeconds).first<{ count: number }>();
  return (row?.count ?? limit + 1) > limit;
}
async function createCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}
async function authenticate(request: Request, env: MobileEnv) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer ([a-f0-9]{64})$/i);
  if (!match || !env.MOBILE_AUTH_PEPPER!) return null;
  const tokenHash = await hmac("session:" + match[1], env.MOBILE_AUTH_PEPPER!);
  const now = nowSeconds();
  const session = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name AS displayName
     FROM mobile_sessions s JOIN mobile_users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND u.status = 'active'`
  ).bind(tokenHash, now).first<{ id: string; email: string; displayName: string }>();
  if (session) {
    await env.DB.prepare("UPDATE mobile_sessions SET last_seen_at = ? WHERE token_hash = ? AND revoked_at IS NULL AND last_seen_at < ?")
      .bind(now, tokenHash, now - 300).run();
  }
  return session ? { ...session, tokenHash } : null;
}
function ipOf(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}
async function messagesFor(env: MobileEnv, conversationId: string, before: number, limit: number) {
  const result = await env.DB.prepare(
    `SELECT id, sender_id AS senderId, content, created_at AS createdAt
     FROM mobile_messages
     WHERE conversation_id = ? AND deleted_at IS NULL AND (? = 0 OR created_at < ?)
     ORDER BY created_at DESC, id DESC LIMIT ?`
  ).bind(conversationId, before, before, limit).all();
  return result.results.reverse();
}
async function isMember(env: MobileEnv, conversationId: string, userId: string) {
  return Boolean(await env.DB.prepare(
    "SELECT 1 AS ok FROM mobile_conversation_members WHERE conversation_id = ? AND user_id = ?"
  ).bind(conversationId, userId).first());
}
async function isBlocked(env: MobileEnv, one: string, two: string) {
  return Boolean(await env.DB.prepare(
    "SELECT 1 AS blocked FROM mobile_user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)"
  ).bind(one, two, two, one).first());
}
async function handleMobile(request: Request, env: MobileEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/v2/mobile/")) return null;
  if (!env.MOBILE_AUTH_PEPPER!) return json({ error: "Mobile authentication is not configured" }, 503);
  const path = url.pathname;
  const method = request.method;

  if (method === "POST" && path === "/v2/mobile/auth/email/request-code") {
    const body = await readJson(request);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!validEmail(email)) return json({ error: "Enter a valid email address" }, 400);
    if (!env.MAILER) return json({ error: "Email delivery is not configured; no code was generated" }, 503);
    const emailLimited = await consumeLimit(env, "otp-email", email, 3, 900);
    const ipLimited = await consumeLimit(env, "otp-ip", ipOf(request), 10, 900);
    if (emailLimited || ipLimited || isRateLimited(request, "mobile-otp-isolate", 10, 900_000)) {
      return json({ error: "Too many requests. Try again later." }, 429);
    }
    const now = nowSeconds();
    await env.DB.prepare("DELETE FROM mobile_email_challenges WHERE expires_at <= ? OR consumed_at IS NOT NULL").bind(now).run();
    const recent = await env.DB.prepare(
      "SELECT id FROM mobile_email_challenges WHERE email = ? AND created_at > ? AND consumed_at IS NULL LIMIT 1"
    ).bind(email, now - 60).first();
    if (recent) return json({ error: "Please wait before requesting another code" }, 429);
    const code = await createCode();
    const challengeId = crypto.randomUUID();
    const codeHash = await hmac("otp:" + `${challengeId}: ${email}: ${code}`, env.MOBILE_AUTH_PEPPER!);
    await env.DB.prepare(
      "INSERT INTO mobile_email_challenges(id, email, code_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(challengeId, email, codeHash, now, now + OTP_TTL).run();
    let delivery: Response;
    try {
      delivery = await env.MAILER.fetch(new Request("https://mailer.internal/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: email, subject: "Your ZervxHub sign-in code", text: `Your ZervxHub verification code is ${code}. It expires in 5 minutes and can be used once.` }),
      }));
    } catch {
      delivery = new Response(null, { status: 502 });
    }
    if (!delivery.ok) {
      await env.DB.prepare("DELETE FROM mobile_email_challenges WHERE id = ? AND consumed_at IS NULL").bind(challengeId).run();
      return json({ error: "Email delivery failed. Please try again later." }, 503);
    }
    return json({ accepted: true, challengeId, expiresInSeconds: OTP_TTL }, 202);
  }

  if (method === "POST" && path === "/v2/mobile/auth/email/verify-code") {
    const body = await readJson(request);
    const challengeId = typeof body?.challengeId === "string" ? body.challengeId : "";
    const code = typeof body?.code === "string" ? body.code : "";
    if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) {
      return json({ error: "Invalid or expired verification code" }, 400);
    }
    if (await consumeLimit(env, "otp-verify-ip", ipOf(request), 20, 900)) return json({ error: "Too many attempts" }, 429);
    const challenge = await env.DB.prepare(
      "SELECT email, code_hash, expires_at, attempts, consumed_at FROM mobile_email_challenges WHERE id = ?"
    ).bind(challengeId).first<{ email: string; code_hash: string; expires_at: number; attempts: number; consumed_at: number | null }>();
    const now = nowSeconds();
    if (!challenge || challenge.consumed_at !== null || challenge.expires_at <= now || challenge.attempts >= OTP_MAX_ATTEMPTS) {
      return json({ error: "Invalid or expired verification code" }, 400);
    }
    const candidate = await hmac("otp:" + `${challengeId}: ${challenge.email}: ${code}`, env.MOBILE_AUTH_PEPPER!);
    if (!constantTimeEqual(candidate, challenge.code_hash)) {
      await env.DB.prepare(
        "UPDATE mobile_email_challenges SET attempts = attempts + 1 WHERE id = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < ?"
      ).bind(challengeId, now, OTP_MAX_ATTEMPTS).run();
      return json({ error: "Invalid or expired verification code" }, 400);
    }
    const consumed = await env.DB.prepare(
      "UPDATE mobile_email_challenges SET consumed_at = ? WHERE id = ? AND code_hash = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < ?"
    ).bind(now, challengeId, candidate, now, OTP_MAX_ATTEMPTS).run();
    if (consumed.meta.changes !== 1) return json({ error: "Invalid or expired verification code" }, 400);

    const userId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO mobile_users(id, email, display_name, created_at, updated_at) VALUES (?, ?, '', ?, ?) ON CONFLICT(email) DO NOTHING"
    ).bind(userId, challenge.email, now, now).run();
    const user = await env.DB.prepare(
      "SELECT id, email, display_name AS displayName, status FROM mobile_users WHERE email = ?"
    ).bind(challenge.email).first<{ id: string; email: string; displayName: string; status: string }>();
    if (!user || user.status !== "active") return json({ error: "Account unavailable" }, 403);
    const token = randomHex(32);
    const tokenHash = await hmac("session:" + token, env.MOBILE_AUTH_PEPPER!);
    await env.DB.prepare(
      "INSERT INTO mobile_sessions(token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(tokenHash, user.id, now, now + SESSION_TTL, now).run();
    return json({ authenticated: true, token, tokenType: "Bearer", expiresAt: now + SESSION_TTL, user: { id: user.id, email: user.email, displayName: user.displayName } }, 200);
  }


  if (method === "POST" && path === "/v2/mobile/auth/session/refresh") {
    const user = await authenticate(request, env);
    if (!user) return json({ error: "Authentication required" }, 401);
    const now = nowSeconds();
    const token = randomHex(32);
    const tokenHash = await hmac("session:" + token, env.MOBILE_AUTH_PEPPER!);
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE mobile_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
        .bind(now, user.tokenHash),
      env.DB.prepare(
        "INSERT INTO mobile_sessions(token_hash, user_id, created_at, expires_at, last_seen_at) SELECT ?, user_id, ?, ?, ? FROM mobile_sessions WHERE token_hash = ? AND revoked_at = ?"
      ).bind(tokenHash, now, now + SESSION_TTL, now, user.tokenHash, now)
    ]);
    if (results[0]?.meta.changes !== 1 || results[1]?.meta.changes !== 1) {
      return json({ error: "Session expired. Sign in again." }, 401);
    }
    return json({ token, tokenType: "Bearer", expiresAt: now + SESSION_TTL });
  }

  if (method === "POST" && path === "/v2/mobile/auth/session/logout-all") {
    const user = await authenticate(request, env);
    if (!user) return json({ error: "Authentication required" }, 401);
    const result = await env.DB.prepare(
      "UPDATE mobile_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL"
    ).bind(nowSeconds(), user.id).run();
    return json({ loggedOut: true, revokedSessions: result.meta.changes });
  }

  if (method === "POST" && path === "/v2/mobile/auth/session/logout") {
    const user = await authenticate(request, env);
    if (!user) return json({ error: "Authentication required" }, 401);
    await env.DB.prepare("UPDATE mobile_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
      .bind(nowSeconds(), user.tokenHash).run();
    return json({ loggedOut: true });
  }

  if (method === "GET" && path === "/v2/mobile/account") {
    const user = await authenticate(request, env);
    if (!user) return json({ error: "Authentication required" }, 401);
    return json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  }

  if (method === "GET" && path === "/v2/mobile/subscription") {
    const user = await authenticate(request, env);
    if (!user) return json({ error: "Authentication required" }, 401);
    return json({ subscription: null, plans: [], billingEnabled: false, checkoutEnabled: false, message: "No mobile subscription record is connected yet. Checkout remains disabled." });
  }

  if (path.startsWith("/v2/mobile/chat/")) {
    const user = await authenticate(request, env);
    if (!user) return json({ error: "Authentication required" }, 401);

    if (method === "GET" && path === "/v2/mobile/chat/global/messages") {
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 30) || 30));
      const before = Math.max(0, Number(url.searchParams.get("before") ?? 0) || 0);
      return json({ conversationId: "global", messages: await messagesFor(env, "global", before, limit), mediaAllowed: false });
    }
    if (method === "POST" && path === "/v2/mobile/chat/global/messages") {
      const body = await readJson(request);
      if (body && ("attachment" in body || "attachments" in body || "file" in body || "voice" in body || "call" in body || "video" in body || "screenShare" in body)) {
        return json({ error: "Global chat supports text and emoji only" }, 403);
      }
      const content = typeof body?.content === "string" ? body.content.trim() : "";
      if (!content || content.length > MAX_MESSAGE_LENGTH) return json({ error: "Message must be 1–2000 characters" }, 400);
      if (await consumeLimit(env, "chat-global-user", user.id, 10, 10) ||
          await consumeLimit(env, "chat-global-ip", ipOf(request), 40, 10)) return json({ error: "Slow down before sending another message" }, 429);
      const id = crypto.randomUUID();
      const now = nowSeconds();
      await env.DB.prepare(
        "INSERT INTO mobile_messages(id, conversation_id, sender_id, content, created_at) VALUES (?, 'global', ?, ?, ?)"
      ).bind(id, user.id, content, now).run();
      return json({ message: { id, senderId: user.id, content, createdAt: now } }, 201);
    }

    if (method === "GET" && path === "/v2/mobile/chat/conversations") {
      const result = await env.DB.prepare(
        `SELECT c.id, c.kind, c.name, c.created_at AS createdAt
         FROM mobile_conversations c JOIN mobile_conversation_members m ON m.conversation_id = c.id
         WHERE m.user_id = ? AND c.kind IN ('direct', 'group')
         ORDER BY c.created_at DESC LIMIT 100`
      ).bind(user.id).all();
      return json({ conversations: result.results });
    }

    if (method === "POST" && path === "/v2/mobile/chat/direct") {
      if (await consumeLimit(env, "chat-direct-user", user.id, 10, 3600)) return json({ error: "Too many new conversations" }, 429);
      const body = await readJson(request);
      const recipientId = typeof body?.recipientUserId === "string" ? body.recipientUserId : "";
      const recipientEmail = typeof body?.recipientEmail === "string" ? body.recipientEmail.trim().toLowerCase() : "";
      if ((!/^[0-9a-f-]{36}$/i.test(recipientId) && !validEmail(recipientEmail)) || recipientId === user.id) {
        return json({ error: "Provide a valid recipient account" }, 400);
      }
      const target = recipientId
        ? await env.DB.prepare("SELECT id FROM mobile_users WHERE id = ? AND status = 'active'").bind(recipientId).first<{ id: string }>()
        : await env.DB.prepare("SELECT id FROM mobile_users WHERE email = ? AND status = 'active'").bind(recipientEmail).first<{ id: string }>();
      if (!target || target.id === user.id) return json({ error: "User not found" }, 404);
      const recipient = target.id;
      if (await isBlocked(env, user.id, recipient)) return json({ error: "This conversation is unavailable" }, 403);
      const pairKey = [user.id, recipient].sort().join(":");
      let conversation = await env.DB.prepare("SELECT id FROM mobile_conversations WHERE pair_key = ?").bind(pairKey).first<{ id: string }>();
      if (!conversation) {
        const id = crypto.randomUUID();
        try {
          await env.DB.prepare("INSERT INTO mobile_conversations(id, kind, pair_key, created_by, created_at) VALUES (?, 'direct', ?, ?, ?)")
            .bind(id, pairKey, user.id, nowSeconds()).run();
          conversation = { id };
        } catch {
          conversation = await env.DB.prepare("SELECT id FROM mobile_conversations WHERE pair_key = ?").bind(pairKey).first<{ id: string }>();
        }
      }
      if (!conversation) return json({ error: "Could not create conversation" }, 500);
      const now = nowSeconds();
      await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO mobile_conversation_members(conversation_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
          .bind(conversation.id, user.id, now),
        env.DB.prepare("INSERT OR IGNORE INTO mobile_conversation_members(conversation_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
          .bind(conversation.id, recipient, now),
      ]);
      return json({ conversationId: conversation.id, kind: "direct" }, 201);
    }

    if (method === "POST" && path === "/v2/mobile/chat/groups") {
      if (await consumeLimit(env, "chat-group-user", user.id, 5, 3600)) return json({ error: "Too many groups created" }, 429);
      const body = await readJson(request);
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      const requestedIds = Array.isArray(body?.memberUserIds)
        ? body.memberUserIds.filter((value): value is string => typeof value === "string") : [];
      const requestedEmails = Array.isArray(body?.memberEmails)
        ? body.memberEmails.filter((value): value is string => typeof value === "string").map(value => value.trim().toLowerCase()) : [];
      if (!name || name.length > 80 || requestedIds.length + requestedEmails.length > 29 ||
          requestedIds.some(id => !/^[0-9a-f-]{36}$/i.test(id)) ||
          requestedEmails.some(email => !validEmail(email))) return json({ error: "Invalid group details" }, 400);
      const clauses: string[] = [];
      const args: string[] = [];
      if (requestedIds.length) {
        clauses.push(`id IN (${requestedIds.map(() => "?").join(",")})`);
        args.push(...requestedIds);
      }
      if (requestedEmails.length) {
        clauses.push(`email IN (${requestedEmails.map(() => "?").join(",")})`);
        args.push(...requestedEmails);
      }
      const users = clauses.length
        ? await env.DB.prepare(`SELECT id FROM mobile_users WHERE status = 'active' AND (${clauses.join(" OR ")})`)
            .bind(...args).all<{ id: string }>()
        : { results: [] as { id: string }[] };
      const members = [...new Set([user.id, ...users.results.map(row => row.id)])];
      if (members.length < 2 || members.length > 30 ||
          users.results.length !== new Set([...requestedIds, ...requestedEmails]).size) {
        return json({ error: "One or more users are unavailable" }, 400);
      }
      const id = crypto.randomUUID();
      const now = nowSeconds();
      const statements = [
        env.DB.prepare("INSERT INTO mobile_conversations(id, kind, name, created_by, created_at) VALUES (?, 'group', ?, ?, ?)")
          .bind(id, name, user.id, now),
        ...members.map(memberId => env.DB.prepare(
          "INSERT INTO mobile_conversation_members(conversation_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)"
        ).bind(id, memberId, memberId === user.id ? "owner" : "member", now)),
      ];
      await env.DB.batch(statements);
      return json({ conversationId: id, kind: "group", name, memberCount: members.length }, 201);
    }

    if (method === "POST" && path.startsWith("/v2/mobile/chat/global/") &&
        /(attachments|voice-messages|calls|signaling|screen-share)/i.test(path)) {
      return json({ error: "Global chat supports text and emoji only" }, 403);
    }

    const privateMediaMatch = path.match(/^\/v2\/mobile\/chat\/conversations\/([0-9a-f-]{36})\/(attachments|voice-messages|calls|signaling)$/i);
    if (method === "POST" && privateMediaMatch) {
      const conversationId = privateMediaMatch[1];
      if (!await isMember(env, conversationId, user.id)) return json({ error: "Conversation not found" }, 404);
      const conversation = await env.DB.prepare(
        "SELECT kind FROM mobile_conversations WHERE id = ? AND kind IN ('direct', 'group')"
      ).bind(conversationId).first();
      if (!conversation) return json({ error: "Conversation not found" }, 404);
      return json({ error: "Private media and calling are not enabled until storage, scanning and relay services pass security review" }, 503);
    }

    const messagesMatch = path.match(/^\/v2\/mobile\/chat\/conversations\/([0-9a-f-]{36})\/messages$/i);
    if (messagesMatch) {
      const conversationId = messagesMatch[1];
      if (!await isMember(env, conversationId, user.id)) return json({ error: "Conversation not found" }, 404);
      const conversation = await env.DB.prepare(
        "SELECT kind FROM mobile_conversations WHERE id = ? AND kind IN ('direct', 'group')"
      ).bind(conversationId).first<{ kind: string }>();
      if (!conversation) return json({ error: "Conversation not found" }, 404);
      if (conversation.kind === "direct") {
        const other = await env.DB.prepare(
          "SELECT user_id AS userId FROM mobile_conversation_members WHERE conversation_id = ? AND user_id <> ? LIMIT 1"
        ).bind(conversationId, user.id).first<{ userId: string }>();
        if (other && await isBlocked(env, user.id, other.userId)) {
          return json({ error: "Conversation not found" }, 404);
        }
      }
      if (method === "GET") {
        const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 30) || 30));
        const before = Math.max(0, Number(url.searchParams.get("before") ?? 0) || 0);
        return json({ conversationId, messages: await messagesFor(env, conversationId, before, limit), mediaAllowed: true });
      }
      if (method === "POST") {
        const body = await readJson(request);
        if (body && ("attachment" in body || "attachments" in body || "file" in body || "voice" in body || "call" in body || "video" in body || "screenShare" in body)) {
          return json({ error: "Private media services are not enabled yet" }, 503);
        }
        const content = typeof body?.content === "string" ? body.content.trim() : "";
        if (!content || content.length > MAX_MESSAGE_LENGTH) return json({ error: "Message must be 1–2000 characters" }, 400);
        if (await consumeLimit(env, "chat-private-user", user.id, 20, 10)) return json({ error: "Too many messages" }, 429);
        const id = crypto.randomUUID();
        const now = nowSeconds();
        await env.DB.prepare("INSERT INTO mobile_messages(id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)")
          .bind(id, conversationId, user.id, content, now).run();
        return json({ message: { id, senderId: user.id, content, createdAt: now } }, 201);
      }
    }

    if (method === "POST" && path === "/v2/mobile/chat/block") {
      if (await consumeLimit(env, "chat-block-user", user.id, 20, 3600)) return json({ error: "Too many block actions" }, 429);
      const body = await readJson(request);
      const blockedId = typeof body?.userId === "string" ? body.userId : "";
      if (!/^[0-9a-f-]{36}$/i.test(blockedId) || blockedId === user.id) return json({ error: "Invalid user" }, 400);
      const target = await env.DB.prepare("SELECT id FROM mobile_users WHERE id = ? AND status = 'active'").bind(blockedId).first();
      if (!target) return json({ error: "User not found" }, 404);
      await env.DB.prepare("INSERT OR IGNORE INTO mobile_user_blocks(blocker_id, blocked_id, created_at) VALUES (?, ?, ?)")
        .bind(user.id, blockedId, nowSeconds()).run();
      return json({ blocked: true });
    }
    if (method === "POST" && path === "/v2/mobile/chat/report") {
      if (await consumeLimit(env, "chat-report-user", user.id, 10, 3600)) return json({ error: "Too many reports" }, 429);
      const body = await readJson(request);
      const targetId = typeof body?.userId === "string" ? body.userId : "";
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      const conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;
      if (!/^[0-9a-f-]{36}$/i.test(targetId) || targetId === user.id || !reason || reason.length > 500) {
        return json({ error: "Invalid report details" }, 400);
      }
      const target = await env.DB.prepare("SELECT id FROM mobile_users WHERE id = ?").bind(targetId).first();
      if (!target) return json({ error: "User not found" }, 404);
      if (conversationId && !await isMember(env, conversationId, user.id)) return json({ error: "Conversation not found" }, 404);
      await env.DB.prepare(
        "INSERT INTO mobile_reports(id, reporter_id, target_user_id, conversation_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), user.id, targetId, conversationId, reason, nowSeconds()).run();
      return json({ reported: true }, 201);
    }
  }

  if (method === "POST" && (path.includes("/attachments") || path.includes("/calls") || path.includes("/signaling"))) {
    return json({ error: "Private media, calls and signaling are not enabled until storage, relay and abuse controls are configured" }, 503);
  }
  return json({ error: "Not found" }, 404);
}

export { handleMobile };
