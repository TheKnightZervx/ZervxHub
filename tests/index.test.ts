import { describe, expect, it } from "vitest";
import worker, { type Env } from "../src/index";

class MemoryD1 {
  keys = new Map<string, { discord: string; expires: number; revoked: number | null; roblox: string | null }>();
  limits = new Map<string, number>();
  prepare(sql: string) {
    let values: unknown[] = [];
    const statement = {
      bind: (...args: unknown[]) => { values = args; return statement; },
      first: async <T,>() => {
        const now = Math.floor(Date.now() / 1000);
        if (sql.startsWith("INSERT INTO redemption_limits")) {
          const [discord, current, threshold] = values as [string, number, number];
          if ((this.limits.get(discord) ?? 0) > threshold) return null;
          this.limits.set(discord, current);
          return { discord_user_id: discord } as T;
        }
        if (sql.startsWith("SELECT last_issued_at")) {
          const value = this.limits.get(values[0] as string);
          return value ? { last_issued_at: value } as T : null;
        }
        if (sql.startsWith("UPDATE keys")) {
          const [roblox, hash, time, sameRoblox] = values as [string, string, number, string];
          const row = this.keys.get(hash);
          if (!row || row.revoked !== null || row.expires <= time || (row.roblox !== null && row.roblox !== sameRoblox)) return null;
          row.roblox ??= roblox;
          return { id: hash } as T;
        }
        return null;
      },
      run: async () => {
        if (sql.startsWith("INSERT INTO keys")) {
          const [, hash, discord, , expires] = values as [string, string, string, number, number];
          this.keys.set(hash, { discord, expires, revoked: null, roblox: null });
          return { success: true };
        }
        return { success: true };
      },
    };
    return statement;
  }
  async batch(statements: Array<{ run: () => Promise<unknown> }>) { return Promise.all(statements.map((s) => s.run())); }
}

function setup(experienceIds = "12345") {
  const DB = new MemoryD1();
  const env = { DB, BOT_API_TOKEN: "test-bot-token", KEY_PEPPER: "test-pepper", ALLOWED_EXPERIENCE_IDS: experienceIds } as unknown as Env;
  const call = (path: string, body?: unknown, auth?: string) => worker.fetch(new Request(`https://keys.test${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(auth ? { authorization: auth } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), env);
  return { DB, call };
}

describe("ZervxHub key API", () => {
  it("requires bot authorization and issues a one-day key once per Discord user", async () => {
    const { call } = setup();
    expect((await call("/v1/keys/free", { discordUserId: "42" })).status).toBe(401);
    const issued = await call("/v1/keys/free", { discordUserId: "42" }, "Bearer test-bot-token");
    const { key, expiresAt } = await issued.json() as { key: string; expiresAt: number };
    expect(issued.status).toBe(201);
    expect(key).toMatch(/^ZERVX-[A-F0-9]{20}$/);
    expect(expiresAt - Math.floor(Date.now() / 1000)).toBe(86400);
    expect((await call("/v1/keys/free", { discordUserId: "42" }, "Bearer test-bot-token")).status).toBe(429);
  });

  it("binds a key to its first Roblox account and rejects another", async () => {
    const { call } = setup();
    const issue = await call("/v1/keys/free", { discordUserId: "42" }, "Bearer test-bot-token");
    const { key } = await issue.json() as { key: string };
    const validate = (robloxUserId: string) => call("/v1/keys/validate", { key, robloxUserId, experienceId: "12345" });
    expect(await (await validate("9001")).json()).toMatchObject({ valid: true });
    expect(await (await validate("9002")).json()).toMatchObject({ valid: false });
  });

  it("rejects keys for unconfigured experiences and malformed IDs", async () => {
    const { call } = setup();
    const response = await call("/v1/keys/validate", { key: "ZERVX-ABCDEFGHIJKLMN", robloxUserId: "x", experienceId: "9" });
    expect(response.status).toBe(400);
    const other = await call("/v1/keys/validate", { key: "ZERVX-ABCDEFGHIJKLMN", robloxUserId: "9001", experienceId: "9" });
    expect(other.status).toBe(403);
  });
});
