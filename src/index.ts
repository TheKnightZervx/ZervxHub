export interface Env {
  DB: D1Database;
  BOT_API_TOKEN: string;
  KEY_PEPPER: string;
  ALLOWED_EXPERIENCE_IDS: string;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function digest(value: string, pepper: string) { return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${pepper}:${value}`))); }
function validId(v: unknown): v is string { return typeof v === "string" && /^\d{1,24}$/.test(v); }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    let body: Record<string, unknown>;
    try { body = await request.json() as Record<string, unknown>; } catch { return json({ error: "invalid_json" }, 400); }

    if (url.pathname === "/v1/keys/free") {
      if (!env.BOT_API_TOKEN || request.headers.get("authorization") !== `Bearer ${env.BOT_API_TOKEN}`) return json({ error: "unauthorized" }, 401);
      if (!validId(body.discordUserId)) return json({ error: "invalid_discord_user" }, 400);
      const now = Math.floor(Date.now() / 1000);
      const claimed = await env.DB.prepare("INSERT INTO redemption_limits (discord_user_id,last_issued_at) VALUES (?,?) ON CONFLICT(discord_user_id) DO UPDATE SET last_issued_at=excluded.last_issued_at WHERE redemption_limits.last_issued_at <= ? RETURNING discord_user_id").bind(body.discordUserId,now,now - 86400).first();
      if (!claimed) {
        const cooldown = await env.DB.prepare("SELECT last_issued_at FROM redemption_limits WHERE discord_user_id = ?").bind(body.discordUserId).first<{last_issued_at:number}>();
        return json({ error: "cooldown", retryAfter: Math.max(1, (cooldown?.last_issued_at ?? now) + 86400 - now) }, 429);
      }
      const key = `ZERVX-${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`;
      const id = crypto.randomUUID();
      const expiresAt = now + 86400;
      const keyHash = await digest(key, env.KEY_PEPPER);
      try {
        await env.DB.batch([
          env.DB.prepare("INSERT INTO keys (id,key_hash,discord_user_id,created_at,expires_at) VALUES (?,?,?,?,?)").bind(id,keyHash,body.discordUserId,now,expiresAt),
        ]);
      } catch { return json({ error: "issue_failed" }, 500); }
      return json({ key, expiresAt }, 201);
    }

    if (url.pathname === "/v1/keys/validate") {
      if (typeof body.key !== "string" || body.key.length < 10 || body.key.length > 64 || !validId(body.robloxUserId) || !validId(body.experienceId)) return json({ valid: false, message: "Invalid request." }, 400);
      const allowed = new Set(env.ALLOWED_EXPERIENCE_IDS.split(",").map((x) => x.trim()).filter(Boolean));
      if (!allowed.has(body.experienceId)) return json({ valid: false, message: "This experience is not configured." }, 403);
      const keyHash = await digest(body.key.trim().toUpperCase(), env.KEY_PEPPER);
      const now = Math.floor(Date.now() / 1000);
      const result = await env.DB.prepare("UPDATE keys SET roblox_user_id = COALESCE(roblox_user_id, ?) WHERE key_hash = ? AND revoked_at IS NULL AND expires_at > ? AND (roblox_user_id IS NULL OR roblox_user_id = ?) RETURNING id").bind(body.robloxUserId,keyHash,now,body.robloxUserId).first();
      return result ? json({ valid: true, message: "Access granted." }) : json({ valid: false, message: "Invalid, expired, revoked, or already bound key." }, 200);
    }
    return json({ error: "not_found" }, 404);
  },
};
