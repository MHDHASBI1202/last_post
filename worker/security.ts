export const SESSION_COOKIE = "pt_session";
export const SESSION_DAYS = 180;
export function randomSecret(bytes = 32): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), n => n.toString(16).padStart(2, "0")).join("");
}
export async function hashSecret(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
}
export function sessionToken(request: Request): string | null {
  const value = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
export function sessionCookie(request: Request, token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function isSameOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}
export function validateProfile(body: Record<string, unknown>) {
  const name = String(body.name || "").trim().replace(/[\u0000-\u001f<>]/g, "");
  const specialty = String(body.specialty || "").trim().replace(/[\u0000-\u001f<>]/g, "");
  const role = String(body.role); const appearance = String(body.appearance);
  if (name.length < 2 || name.length > 24) throw new Error("Nama panggilan harus 2–24 karakter.");
  if (specialty.length > 32) throw new Error("Sebutan maksimal 32 karakter.");
  if (!["perintis", "penjaga", "perakit", "peramu", "penjelajah", "medis"].includes(role)) throw new Error("Peran tidak dikenal.");
  if (!["amber", "teal", "clay", "slate"].includes(appearance)) throw new Error("Warna jaket tidak dikenal.");
  return { name, specialty, role, appearance };
}
