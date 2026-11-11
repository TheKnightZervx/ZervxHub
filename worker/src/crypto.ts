export const hex = (bytes: Uint8Array): string =>
  [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function hmacSha256(value: string, pepper: string): Promise<string> {
  if (!pepper || typeof pepper !== "string") {
    throw new Error("Missing or invalid KEY_PEPPER");
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );
  return hex(new Uint8Array(signature));
}

export async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return hex(new Uint8Array(buffer));
}

export async function hashCredential(value: string, pepper: string): Promise<string> {
  return hmacSha256(value, pepper);
}

export async function credentialCandidateHashes(
  value: string,
  pepper: string
): Promise<{ hmac: string; legacy: string }> {
  const [hmac, legacy] = await Promise.all([
    hmacSha256(value, pepper),
    sha256(value),
  ]);
  return { hmac, legacy };
}

export function timingSafeEqual(supplied: string, expected: string | undefined): boolean {
  if (!expected || typeof supplied !== "string") return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(supplied);
  const b = encoder.encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function makeApiKey(): string {
  return `zvh_live_${hex(crypto.getRandomValues(new Uint8Array(32)))}`;
}

export function makeLicenseKey(): string {
  const raw = hex(crypto.getRandomValues(new Uint8Array(20))).toUpperCase();
  return `ZERVX-${raw.match(/.{1,5}/g)!.join("-")}`;
}
