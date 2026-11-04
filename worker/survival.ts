import { ARGA_DAMAGE,ARGA_INTERVAL_MS,ARGA_TRAVEL_MS,ZOMBIE_HP } from "../src/threat-rules";
import { ACTIONS, actionRewards, effectiveEnergy, expertFor, type ActionKind, type Crew, type GameState, type Job } from "../src/survival-rules";
import { normalizeStyle } from "../src/character-style";
type DB = D1Database;
type Row = { user_id: string; id: string; name: string; role: string; appearance: string; customization: string; health: number; energy: number; energy_updated: number; xp: number };
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

// Keep the same eligibility and order for combat and the public patrol list.
const idleDefenders = `
  SELECT s.id, s.name, s.role
  FROM survivors s JOIN game_players p ON p.user_id = s.user_id
  WHERE p.health >= 30
    AND NOT EXISTS (SELECT 1 FROM job_members m WHERE m.user_id = s.user_id AND m.active = 1)
    AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.target_id = s.user_id AND j.kind = 'heal' AND j.status = 'active')
  ORDER BY CASE WHEN s.role = 'penjaga' THEN 0 ELSE 1 END, s.created_at, s.id
  LIMIT 2
`;

export async function tick(db: DB, now = Date.now()) {
  // D1 batches are transactional. A conditional status transition awards a job once,
  // even when two browsers settle the same task concurrently.
  const cutoff=`MIN(${Math.floor(now)},CASE WHEN raid_deadline>0 THEN raid_deadline ELSE ${Math.floor(now)} END)`;
  const hits=`MIN(CAST((enemy_hp+${ARGA_DAMAGE-1})/${ARGA_DAMAGE} AS INTEGER),CAST((${cutoff}-arga_next_attack)/${ARGA_INTERVAL_MS} AS INTEGER)+1)`;
  const patrolDamage = `CASE WHEN raid_deadline >= ${Math.floor(now)} THEN (SELECT COUNT(*) FROM (${idleDefenders})) ELSE 0 END`;
  const damage = `(${hits}*${ARGA_DAMAGE}+${patrolDamage})`;
  await db.batch([
    db.prepare("UPDATE jobs SET status='done' WHERE status='active' AND ends_at<=MIN(?,COALESCE((SELECT NULLIF(raid_deadline,0) FROM camp WHERE raid_deadline<=?),?))").bind(now, now, now),
    db.prepare("UPDATE camp SET arga_started_at=?,arga_next_attack=? WHERE enemy_hp>0 AND arga_next_attack=0").bind(now,now+ARGA_TRAVEL_MS),
    db.prepare(`INSERT INTO game_feed(actor,message,created_at) SELECT CASE WHEN ${patrolDamage}>0 THEN 'Tim pertahanan' ELSE 'Arga' END,'Zombie terakhir tumbang. Perimeter aman untuk sementara.',? FROM camp WHERE enemy_hp>0 AND arga_next_attack>0 AND arga_next_attack<=${cutoff} AND enemy_hp<=${damage}`).bind(now),
    db.prepare(`UPDATE camp SET enemy_hp=MAX(0,enemy_hp-${damage}),arga_last_attack=arga_next_attack+(${hits}-1)*${ARGA_INTERVAL_MS},arga_next_attack=arga_next_attack+${hits}*${ARGA_INTERVAL_MS},raid_deadline=CASE WHEN enemy_hp<=${damage} THEN 0 ELSE raid_deadline END WHERE enemy_hp>0 AND arga_next_attack>0 AND arga_next_attack<=${cutoff}`),
    db.prepare("INSERT INTO game_feed(actor,message,created_at) SELECT 'Radio markas','Serangan zombie berakhir. Kerusakan markas: '||MAX(0,CAST((enemy_hp+3)/4 AS INTEGER)-defense-fence_level*4)||'.',? FROM camp WHERE raid_deadline>0 AND raid_deadline<=?").bind(now, now),
    db.prepare("UPDATE camp SET integrity=MAX(0,integrity-MAX(0,CAST((enemy_hp+3)/4 AS INTEGER)-defense-fence_level*4)),enemy_hp=0,defense=0,raid_deadline=0 WHERE raid_deadline>0 AND raid_deadline<=?").bind(now),
    db.prepare("INSERT INTO game_feed(actor,message,created_at) SELECT 'Radio markas','Gelombang zombie mendekat! Bantu jaga atau lawan bersama.',? FROM camp WHERE next_raid<=? AND raid_deadline=0").bind(now, now),
    db.prepare(`UPDATE camp SET wave=wave+1,enemy_hp=${ZOMBIE_HP}*(1+MIN(23,(SELECT COUNT(*) FROM survivors)/3)),arga_started_at=?,arga_next_attack=?+${ARGA_TRAVEL_MS},raid_deadline=?+120000,next_raid=?+900000 WHERE next_raid<=? AND raid_deadline=0`).bind(now, now, now, now, now),
    db.prepare("UPDATE jobs SET status='done' WHERE status='active' AND ends_at<=?").bind(now),
    // Keep a bounded public activity journal, without deleting any profiles or jobs.
    db.prepare("DELETE FROM game_feed WHERE id < (SELECT COALESCE(MAX(id),0)-200 FROM game_feed)"),
  ]);
}

export async function gameSnapshot(db: DB, userId: string | null): Promise<GameState> {
  const now = Date.now(); await tick(db, now);
  const results = await db.batch([
    db.prepare("SELECT * FROM camp WHERE id=1"),
    db.prepare("SELECT s.user_id,s.id,s.name,s.role,s.appearance,s.customization,p.health,p.energy,p.energy_updated,p.xp FROM survivors s JOIN game_players p ON p.user_id=s.user_id ORDER BY s.created_at DESC LIMIT 200"),
    db.prepare("SELECT j.id,j.kind,j.started_at,j.ends_at,j.target_name,t.id AS target_survivor_id,s.id AS owner_id,s.name AS owner_name FROM jobs j JOIN survivors s ON s.user_id=j.owner_id LEFT JOIN survivors t ON t.user_id=j.target_id WHERE j.status='active' ORDER BY CASE WHEN EXISTS(SELECT 1 FROM job_members m WHERE m.job_id=j.id AND m.user_id=? AND m.active=1) THEN 0 ELSE 1 END,j.started_at DESC LIMIT 60").bind(userId || ""),
    db.prepare("SELECT m.job_id,s.id,s.name,s.role FROM job_members m JOIN survivors s ON s.user_id=m.user_id WHERE m.active=1"),
    db.prepare("SELECT id,actor,message,created_at FROM game_feed ORDER BY id DESC LIMIT 30"),
    db.prepare("SELECT s.user_id,s.id,s.name,s.role,s.appearance,s.customization,p.health,p.energy,p.energy_updated,p.xp FROM survivors s JOIN game_players p ON p.user_id=s.user_id WHERE s.user_id=?").bind(userId || ""),
    db.prepare(idleDefenders),
  ]);
  const c = results[0].results[0] as Record<string, number>;
  const members = results[3].results as { job_id: string; id: string; name: string; role: string }[];
  const asCrew = (p: Row): Crew => ({ id: p.id, name: p.name, role: p.role, appearance: p.appearance, customization: normalizeStyle(p.customization), health: p.health, energy: effectiveEnergy(p.energy, p.energy_updated, now), xp: p.xp, activeJob: members.find(m => m.id === p.id)?.job_id || null });
  const own = results[5].results[0] as Row | undefined;
  const jobs: Job[] = (results[2].results as { id: string; kind: ActionKind; started_at: number; ends_at: number; target_name: string | null; target_survivor_id: string | null; owner_id: string; owner_name: string }[]).map(j => ({ id: j.id, kind: j.kind, startedAt: j.started_at, endsAt: j.ends_at, targetName: j.target_name, targetId: j.target_survivor_id || undefined, ownerId: j.owner_id, ownerName: j.owner_name, members: members.filter(m => m.job_id === j.id).map(({ id, name, role }) => ({ id, name, role })) }));
  return { serverTime: now, patrol: c.enemy_hp > 0 && c.raid_deadline > now ? results[6].results as GameState["patrol"] : [], arga:{active:c.enemy_hp>0,startedAt:c.arga_started_at,nextAttackAt:c.arga_next_attack,lastAttackAt:c.arga_last_attack,damage:ARGA_DAMAGE,intervalMs:ARGA_INTERVAL_MS}, camp: { wood: c.wood, scrap: c.scrap, food: c.food, water: c.water, herbs: c.herbs, medkits: c.medkits, tools: c.tools, integrity: c.integrity, defense: c.defense, enemyHp: c.enemy_hp, wave: c.wave, raidDeadline: c.raid_deadline, nextRaid: c.next_raid, fenceWork: c.fence_work, fenceLevel: c.fence_level }, crew: (results[1].results as Row[]).map(asCrew), jobs, feed: (results[4].results as { id: number; actor: string; message: string; created_at: number }[]).map(f => ({ id: f.id, actor: f.actor, message: f.message, createdAt: f.created_at })), me: own ? asCrew(own) : null, activeJob: own ? members.find(m => m.id === own.id)?.job_id || null : null };
}

export async function gameAction(db: DB, userId: string | null, body: Record<string, unknown>) {
  if (!userId) return reply({ error: "Buat atau pulihkan kartu penyintas untuk bermain." }, 401);
  const now = Date.now(); await tick(db, now);
  const player = await db.prepare("SELECT s.*,p.health FROM survivors s JOIN game_players p ON p.user_id=s.user_id WHERE s.user_id=?").bind(userId).first<{ id: string; name: string; role: string; health: number }>();
  if (!player) return reply({ error: "Buat kartu penyintas dahulu." }, 401);
  try {
    let message = "Kegiatan dimulai.";
    if (body.action === "start") {
      const kind = String(body.kind) as ActionKind; const action = ACTIONS.find(a => a.id === kind);
      if (!action) return reply({ error: "Kegiatan tidak dikenal." }, 400);
      const camp = await db.prepare("SELECT tools,integrity FROM camp WHERE id=1").first<{ tools: number; integrity: number }>();
      if (kind === "repair" && camp?.integrity === 100) return reply({ error: "Markas masih utuh. Bantu bangun pagar agar lebih kuat." }, 409);
      let targetId: string | null = null; let targetName: string | null = null;
      if (kind === "heal") {
        const target = await db.prepare("SELECT s.user_id,s.name,p.health FROM survivors s JOIN game_players p ON p.user_id=s.user_id WHERE s.id=?").bind(String(body.targetId || player.id)).first<{ user_id: string; name: string; health: number }>();
        if (!target) return reply({ error: "Penyintas tidak ditemukan." }, 404);
        if (target.health >= 100) return reply({ error: "Penyintas ini sudah sehat." }, 409);
        targetId = target.user_id; targetName = target.name;
      }
      const roll = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
      const r = actionRewards(kind, player.role, camp?.tools || 0, roll);
      const jobId = crypto.randomUUID();
      await db.batch([
        db.prepare("INSERT INTO jobs(id,kind,owner_id,actor_name,target_id,target_name,started_at,ends_at,result,wood,scrap,food,water,herbs,medkits,tools,damage,defense,repair,progress,heal,energy,injury,chest,cost_wood,cost_scrap,cost_food,cost_water,cost_herbs,cost_medkits) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(jobId, kind, userId, player.name, targetId, targetName, now, now + r.seconds * 1000, `${action.name}${targetName ? ` untuk ${targetName}` : ""} selesai.`, r.wood, r.scrap, r.food, r.water, r.herbs, r.medkits, r.tools, r.damage, r.defense, r.repair, r.progress, r.heal, r.energy, r.injury, r.chest, r.costWood, r.costScrap, r.costFood, r.costWater, r.costHerbs, r.costMedkits),
        db.prepare("INSERT INTO job_members(job_id,user_id,joined_at,energy_cost) VALUES(?,?,?,?)").bind(jobId, userId, now, r.energyCost),
        db.prepare("INSERT INTO game_feed(actor,message,created_at) VALUES(?,?,?)").bind(player.name, `Mulai ${action.name.toLowerCase()}${targetName ? ` untuk ${targetName}` : ""}. Teman bisa ikut membantu.`, now),
      ]);
      message = `${action.name} dimulai. Ajak teman membantu!`;
    } else if (body.action === "help") {
      const job = await db.prepare("SELECT id,kind,owner_id,actor_name,ends_at FROM jobs WHERE id=? AND status='active' AND ends_at>?").bind(String(body.jobId), now).first<{ id: string; kind: string; owner_id: string; actor_name: string; ends_at:number }>();
      if (!job) return reply({ error: "Kegiatan ini sudah selesai." }, 409);
      if (job.owner_id === userId) return reply({ error: "Kamu sudah memimpin kegiatan ini." }, 409);
      const travelWindow=job.kind==='attack'?14000:10000;
      if(job.ends_at-now<=travelWindow) return reply({error:"Teman sudah hampir selesai. Pilih kegiatan lain agar masih sempat berjalan ke lokasi."},409);
      const boost = Math.min(expertFor(job.kind, player.role) ? 8000 : 5000,job.ends_at-now-travelWindow);
      await db.batch([
        db.prepare("INSERT INTO job_members(job_id,user_id,joined_at,energy_cost,boost) VALUES(?,?,?,?,?)").bind(job.id, userId, now, 8, boost),
        db.prepare("INSERT INTO game_feed(actor,message,created_at) VALUES(?,?,?)").bind(player.name, `Membantu ${job.actor_name}. Kegiatan lebih cepat dan hasil tim bertambah.`, now),
      ]);
      message = `Kamu ikut membantu ${job.actor_name}.`;
    } else if (body.action === "emote") {
      const lines: Record<string, string> = { wave: "melambaikan tangan", thanks: "mengucapkan terima kasih", help: "meminta bantuan di markas" };
      const line = lines[String(body.emote)]; if (!line) return reply({ error: "Sapaan tidak dikenal." }, 400);
      const target = body.targetId ? await db.prepare("SELECT name FROM survivors WHERE id=?").bind(String(body.targetId)).first<{ name: string }>() : null;
      const result = await db.batch([
        db.prepare("INSERT INTO game_feed(actor,message,created_at) SELECT ?,?,? FROM game_players WHERE user_id=? AND last_emote<=?").bind(player.name, `${line}${target ? ` kepada ${target.name}` : " untuk penyintas lain"}.`, now, userId, now - 15000),
        db.prepare("UPDATE game_players SET last_emote=? WHERE user_id=? AND last_emote<=?").bind(now, userId, now - 15000),
      ]);
      if (!result[0].meta.changes) return reply({ error: "Tunggu 15 detik sebelum menyapa lagi." }, 429);
      message = "Sapaanmu terdengar di markas.";
    } else return reply({ error: "Aksi tidak dikenal." }, 400);
    return reply({ message, game: await gameSnapshot(db, userId) });
  } catch (e) {
    const text = e instanceof Error ? e.message : "";
    const known = ["Bahan markas belum cukup.", "Tidak ada zombie aktif. Siapkan pertahanan dulu.", "Kegiatan ini sudah selesai.", "Tim ini sudah penuh (4 penyintas).", "Selesaikan kegiatanmu dulu sebelum membantu.", "Energi belum cukup. Istirahat dulu.", "Kesehatan terlalu rendah. Istirahat atau minta perawatan."];
    const message = known.find(m => text.includes(m));
    if (message) return reply({ error: message }, 409);
    if (text.includes("UNIQUE constraint failed")) return reply({ error: "Kamu sudah mengikuti kegiatan. Tunggu sampai selesai." }, 409);
    console.error("Survival action failed", text); return reply({ error: "Kegiatan belum tersimpan. Coba lagi." }, 503);
  }
}
