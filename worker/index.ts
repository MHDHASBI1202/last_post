import { hashSecret, isSameOrigin, randomSecret, sessionCookie, sessionToken, SESSION_DAYS, validateProfile } from "./security";

interface Env { DB: D1Database; ASSETS: Fetcher }
type Profile = { id: string; user_id: string; code: string; name: string; role: string; specialty: string; activity: string; appearance: string; joined_day: number };
const publicProfile = (p: Profile) => ({ id: p.id, code: p.code, name: p.name, role: p.role, specialty: p.specialty, activity: p.activity, appearance: p.appearance, joinedDay: p.joined_day });
function json(data: unknown, status = 200, cookie?: string) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", ...(cookie ? { "Set-Cookie": cookie } : {}) } });
}
async function accountId(request: Request, db: D1Database) {
  const token = sessionToken(request); if (!token) return null;
  const row = await db.prepare("SELECT account_id FROM sessions WHERE token_hash=? AND expires_at>?").bind(await hashSecret(token), Date.now()).first<{ account_id: string }>();
  return row?.account_id || null;
}
async function me(db: D1Database, id: string | null, cookie?: string, recoveryKey?: string) {
  // Everyone can create a character; possession of an HttpOnly session is needed to edit it.
  if (!id) return json({ authenticated: true, profile: null, vote: null });
  const results = await db.batch([
    db.prepare("SELECT * FROM survivors WHERE user_id=?").bind(id),
    db.prepare("SELECT choice FROM votes WHERE user_id=?").bind(id),
  ]);
  const profile = results[0].results[0] as Profile | undefined;
  const vote = results[1].results[0] as { choice: string } | undefined;
  return json({ authenticated: true, profile: profile ? publicProfile(profile) : null, vote: vote?.choice || null, ...(recoveryKey ? { recoveryKey } : {}) }, 200, cookie);
}
async function throttle(request: Request, db: D1Database, kind: string, max: number) {
  const hour = Math.floor(Date.now() / 3600000);
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const bucket = await hashSecret(`${kind}:${hour}:${ip}`);
  const row = await db.prepare("INSERT INTO request_limits (bucket,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts").bind(bucket, (hour + 2) * 3600000).first<{ attempts: number }>();
  return !!row && row.attempts <= max;
}
async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("Gunakan data JSON.");
  const reader = request.body?.getReader(); if (!reader) throw new Error("Data kosong.");
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 4096) { await reader.cancel(); throw new Error("Data terlalu besar."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Data tidak valid.");
  return data as Record<string, unknown>;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const db = env.DB;
    if (!db) return json({ error: "Database markas belum dipasang. Pemilik perlu menjalankan panduan deploy." }, 503);
    try {
      if (request.method === "GET" && url.pathname === "/api/world") {
        const results = await db.batch([
          db.prepare("SELECT count(*) AS total FROM survivors"),
          db.prepare("SELECT * FROM survivors ORDER BY created_at DESC LIMIT 200"),
          db.prepare("SELECT choice,count(*) AS total FROM votes GROUP BY choice"),
        ]);
        const total = Number((results[0].results[0] as { total: number }).total);
        const tally = results[2].results as { choice: string; total: number }[];
        return json({ day: 1, count: total + 1, registered: total,
          survivors: (results[1].results as Profile[]).map(publicProfile),
          votes: { pagar: Number(tally.find(t => t.choice === "pagar")?.total || 0), air: Number(tally.find(t => t.choice === "air")?.total || 0) } });
      }
      if (request.method === "GET" && url.pathname === "/api/me") return await me(db, await accountId(request, db));
      if (request.method === "GET" && url.pathname === "/api/card") {
        const code = url.searchParams.get("code")?.toUpperCase() || "";
        if (!/^PT-[A-F0-9]{8}$/.test(code)) return json({ error: "Kode kartu tidak valid." }, 400);
        const p = await db.prepare("SELECT * FROM survivors WHERE code=?").bind(code).first<Profile>();
        return p ? json({ profile: publicProfile(p) }) : json({ error: "Kartu tidak ditemukan." }, 404);
      }
      if (request.method !== "POST") return json({ error: "Rute tidak ditemukan." }, 404);
      if (!["/api/me", "/api/recover"].includes(url.pathname)) return json({ error: "Rute tidak ditemukan." }, 404);
      if (!isSameOrigin(request)) return json({ error: "Permintaan tidak dikenali." }, 403);
      let body: Record<string, unknown>;
      try { body = await bodyOf(request); } catch (e) { return json({ error: e instanceof Error ? e.message : "Data tidak valid." }, 400); }
      if (!await throttle(request, db, "write", 600)) return json({ error: "Terlalu banyak permintaan. Coba lagi satu jam lagi." }, 429);

      if (url.pathname === "/api/recover") {
        if (!await throttle(request, db, "recover", 30)) return json({ error: "Batas pemulihan tercapai. Coba lagi satu jam lagi." }, 429);
        const key = String(body.recoveryKey || "").trim().toLowerCase();
        if (!/^[a-f0-9]{48}$/.test(key)) return json({ error: "Kunci pemulihan tidak cocok." }, 400);
        const account = await db.prepare("SELECT id FROM accounts WHERE recovery_hash=?").bind(await hashSecret(key)).first<{ id: string }>();
        if (!account) return json({ error: "Kunci pemulihan tidak cocok." }, 400);
        const token = randomSecret();
        await db.prepare("INSERT INTO sessions (token_hash,account_id,expires_at) VALUES (?,?,?)").bind(await hashSecret(token), account.id, Date.now() + SESSION_DAYS * 86400000).run();
        return await me(db, account.id, sessionCookie(request, token));
      }

      let id = await accountId(request, db);
      const p = id ? await db.prepare("SELECT * FROM survivors WHERE user_id=?").bind(id).first<Profile>() : null;
      if (body.action === "activity" || body.action === "vote") {
        if (!p || !id) return json({ error: "Buat atau pulihkan kartu penyintas terlebih dulu." }, 401);
        if (body.action === "activity") {
          const activity = String(body.activity);
          if (!["jelajah", "jaga", "air", "istirahat"].includes(activity)) return json({ error: "Aktivitas tidak dikenal." }, 400);
          await db.prepare("UPDATE survivors SET activity=? WHERE user_id=?").bind(activity, id).run();
        } else {
          const choice = String(body.choice);
          if (!["pagar", "air"].includes(choice)) return json({ error: "Pilih PAGAR atau AIR." }, 400);
          await db.prepare("INSERT INTO votes (user_id,choice,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET choice=excluded.choice,updated_at=excluded.updated_at").bind(id, choice, Date.now()).run();
        }
        return await me(db, id);
      }
      if (body.action !== undefined) return json({ error: "Aksi tidak dikenal." }, 400);
      let data: ReturnType<typeof validateProfile>;
      try { data = validateProfile(body); } catch (e) { return json({ error: (e as Error).message }, 400); }
      if (p && id) {
        await db.prepare("UPDATE survivors SET name=?,specialty=?,role=?,appearance=? WHERE user_id=?").bind(data.name, data.specialty, data.role, data.appearance, id).run();
        return await me(db, id);
      }
      if (!await throttle(request, db, "join", 60)) return json({ error: "Batas pendaftaran jaringan ini tercapai. Coba lagi satu jam lagi." }, 429);
      id = crypto.randomUUID(); const token = randomSecret(); const recoveryKey = randomSecret(24);
      await db.batch([
        db.prepare("INSERT INTO accounts (id,recovery_hash) VALUES (?,?)").bind(id, await hashSecret(recoveryKey)),
        db.prepare("INSERT INTO sessions (token_hash,account_id,expires_at) VALUES (?,?,?)").bind(await hashSecret(token), id, Date.now() + SESSION_DAYS * 86400000),
        db.prepare("INSERT INTO survivors (id,user_id,code,name,role,specialty,appearance,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, "PT-" + randomSecret(4).toUpperCase(), data.name, data.role, data.specialty, data.appearance, Date.now()),
      ]);
      ctx.waitUntil(Promise.all([
        db.prepare("DELETE FROM sessions WHERE expires_at<?").bind(Date.now()).run(),
        db.prepare("DELETE FROM request_limits WHERE expires_at<?").bind(Date.now()).run(),
      ]));
      return await me(db, id, sessionCookie(request, token), recoveryKey);
    } catch (error) {
      console.error("API error", url.pathname, error instanceof Error ? error.message : "unknown");
      return json({ error: "Radio markas belum tersambung. Coba lagi sebentar." }, 503);
    }
  },
} satisfies ExportedHandler<Env>;
