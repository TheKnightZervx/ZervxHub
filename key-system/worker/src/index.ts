export interface Env {
  DB: D1Database;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
  ROBLOX_SERVER_TOKEN: string;
  KEY_TTL_HOURS?: string;
}

type DiscordInteraction = {
  type: number;
  application_id?: string;
  token?: string;
  member?: { user?: { id?: string; username?: string } };
  user?: { id?: string; username?: string };
  data?: { name?: string };
};

const encoder = new TextEncoder();
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error("Invalid public key");
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function verifyDiscordRequest(request: Request, body: string, publicKey: string): Promise<boolean> {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  if (!signature || !timestamp || !/^\d{10,}$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  try {
    const key = await crypto.subtle.importKey("raw", toArrayBuffer(fromHex(publicKey)), { name: "Ed25519" }, false, ["verify"]);
    const sig = Uint8Array.from(signature.match(/.{2}/g) ?? [], (v) => parseInt(v, 16));
    return await crypto.subtle.verify("Ed25519", key, toArrayBuffer(sig), toArrayBuffer(encoder.encode(timestamp + body)));
  } catch {
    return false;
  }
}

async function sha256(value: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

function makeKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const raw = hex(bytes).toUpperCase();
  return `ZHX-${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15)}`;
}

async function issueKey(env: Env, discordUserId: string, username: string): Promise<{ key?: string; error?: string }> {
  const now = Math.floor(Date.now() / 1000);
  const key = makeKey();
  const keyHash = await sha256(key);
  const ttlHours = Math.min(168, Math.max(1, Number(env.KEY_TTL_HOURS || 24)));
  const expiresAt = now + ttlHours * 3600;
  try {
    // D1 batch is transactional. The partial unique index prevents concurrent
    // /getkey requests from issuing two active keys for the same Discord user.
    await env.DB.batch([
      env.DB.prepare("UPDATE keys SET status = 'revoked' WHERE discord_user_id = ? AND status = 'active' AND expires_at <= ?")
        .bind(discordUserId, now),
      env.DB.prepare(
        "INSERT INTO keys (key_hash, discord_user_id, discord_username, status, created_at, expires_at) VALUES (?, ?, ?, 'active', ?, ?)"
      ).bind(keyHash, discordUserId, username.slice(0, 80), now, expiresAt),
    ]);
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) {
      return { error: "You already have an active Free Key. Check your previous key or wait for it to expire." };
    }
    throw error;
  }
  return { key };
}

async function discordInteraction(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  if (!(await verifyDiscordRequest(request, body, env.DISCORD_PUBLIC_KEY))) return json({ error: "Invalid request signature" }, 401);
  let interaction: DiscordInteraction;
  try { interaction = JSON.parse(body) as DiscordInteraction; } catch { return json({ error: "Invalid JSON" }, 400); }

  if (interaction.type === 1) return json({ type: 1 }); // Discord PING
  if (interaction.application_id !== env.DISCORD_APPLICATION_ID) return json({ error: "Unknown Discord application" }, 401);
  if (interaction.type !== 2 || interaction.data?.name !== "getkey") return json({ error: "Unsupported interaction" }, 400);

  const user = interaction.member?.user ?? interaction.user;
  if (!user?.id || !interaction.token || !interaction.application_id) {
    return json({ type: 4, data: { content: "Unable to identify your Discord account.", flags: 64 } });
  }

  try {
    const issued = await issueKey(env, user.id, user.username || "Discord user");
    const content = issued.key
      ? `Your ZervxHub Free Key: \`\`\`${issued.key}\`\`\`\n\nExpires in ${Math.min(168, Math.max(1, Number(env.KEY_TTL_HOURS || 24)))} hours. Keep it private. Enter it only in the official ZervxHub experience.`
      : issued.error!;
    return json({ type: 4, data: { content, flags: 64 } });
  } catch {
    return json({ type: 4, data: { content: "Key service is temporarily unavailable. Please try again later.", flags: 64 } });
  }
}

async function verifyKey(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (!env.ROBLOX_SERVER_TOKEN || auth !== `Bearer ${env.ROBLOX_SERVER_TOKEN}`) return json({ error: "Unauthorized" }, 401);
  let body: { key?: unknown; robloxUserId?: unknown };
  try { body = await request.json() as typeof body; } catch { return json({ error: "Invalid JSON" }, 400); }
  if (typeof body.key !== "string" || body.key.length < 10 || body.key.length > 80 ||
      typeof body.robloxUserId !== "string" || !/^\d{1,20}$/.test(body.robloxUserId)) {
    return json({ valid: false, message: "Invalid key or account ID format." }, 400);
  }

  const keyHash = await sha256(body.key.trim().toUpperCase());
  const now = Math.floor(Date.now() / 1000);
  const record = await env.DB.prepare(
    "SELECT id, status, expires_at, bound_roblox_user_id FROM keys WHERE key_hash = ? LIMIT 1"
  ).bind(keyHash).first<{ id: number; status: string; expires_at: number; bound_roblox_user_id: string | null }>();

  if (!record || record.status !== "active" || record.expires_at <= now) {
    return json({ valid: false, message: "Key is invalid or expired." }, 200);
  }
  if (record.bound_roblox_user_id && record.bound_roblox_user_id !== body.robloxUserId) {
    return json({ valid: false, message: "This key is already linked to another Roblox account." }, 200);
  }
  if (!record.bound_roblox_user_id) {
    await env.DB.prepare("UPDATE keys SET bound_roblox_user_id = ?, bound_at = ? WHERE id = ? AND bound_roblox_user_id IS NULL")
      .bind(body.robloxUserId, now, record.id).run();
    const confirmed = await env.DB.prepare("SELECT bound_roblox_user_id FROM keys WHERE id = ?").bind(record.id).first<{ bound_roblox_user_id: string }>();
    if (confirmed?.bound_roblox_user_id !== body.robloxUserId) {
      return json({ valid: false, message: "Key was linked to another account. Please try again." }, 409);
    }
  }
  return json({ valid: true, message: "ZervxHub access verified." });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "zervxhub-key-api" });
    if (request.method === "POST" && url.pathname === "/discord/interactions") return discordInteraction(request, env);
    if (request.method === "POST" && url.pathname === "/v1/keys/verify") return verifyKey(request, env);
    return json({ error: "Not found" }, 404);
  },
};
