CREATE TABLE camp (
 id INTEGER PRIMARY KEY CHECK(id=1), wood INTEGER NOT NULL DEFAULT 0, scrap INTEGER NOT NULL DEFAULT 0,
 food INTEGER NOT NULL DEFAULT 2, water INTEGER NOT NULL DEFAULT 1, herbs INTEGER NOT NULL DEFAULT 0,
 medkits INTEGER NOT NULL DEFAULT 0, tools INTEGER NOT NULL DEFAULT 0, integrity INTEGER NOT NULL DEFAULT 100,
 defense INTEGER NOT NULL DEFAULT 0, enemy_hp INTEGER NOT NULL DEFAULT 32, wave INTEGER NOT NULL DEFAULT 0,
 raid_deadline INTEGER NOT NULL DEFAULT 0, next_raid INTEGER NOT NULL,
 fence_work INTEGER NOT NULL DEFAULT 0, fence_level INTEGER NOT NULL DEFAULT 0
);
INSERT INTO camp(id,next_raid) VALUES(1, CAST(strftime('%s','now') AS INTEGER)*1000 + 900000);
CREATE TABLE game_players (
 user_id TEXT PRIMARY KEY REFERENCES accounts(id), health INTEGER NOT NULL DEFAULT 100,
 energy INTEGER NOT NULL DEFAULT 100, energy_updated INTEGER NOT NULL, xp INTEGER NOT NULL DEFAULT 0,
 last_emote INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE jobs (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, owner_id TEXT NOT NULL, actor_name TEXT NOT NULL,
 target_id TEXT, target_name TEXT, started_at INTEGER NOT NULL, ends_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'active', result TEXT NOT NULL,
 wood INTEGER NOT NULL DEFAULT 0, scrap INTEGER NOT NULL DEFAULT 0, food INTEGER NOT NULL DEFAULT 0,
 water INTEGER NOT NULL DEFAULT 0, herbs INTEGER NOT NULL DEFAULT 0, medkits INTEGER NOT NULL DEFAULT 0,
 tools INTEGER NOT NULL DEFAULT 0, damage INTEGER NOT NULL DEFAULT 0, defense INTEGER NOT NULL DEFAULT 0,
 repair INTEGER NOT NULL DEFAULT 0, progress INTEGER NOT NULL DEFAULT 0, heal INTEGER NOT NULL DEFAULT 0,
 energy INTEGER NOT NULL DEFAULT 0, injury INTEGER NOT NULL DEFAULT 0, chest INTEGER NOT NULL DEFAULT 0,
 cost_wood INTEGER NOT NULL DEFAULT 0, cost_scrap INTEGER NOT NULL DEFAULT 0, cost_food INTEGER NOT NULL DEFAULT 0,
 cost_water INTEGER NOT NULL DEFAULT 0, cost_herbs INTEGER NOT NULL DEFAULT 0, cost_medkits INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX jobs_due ON jobs(status,ends_at);
CREATE TABLE job_members (
 job_id TEXT NOT NULL REFERENCES jobs(id), user_id TEXT NOT NULL REFERENCES game_players(user_id),
 joined_at INTEGER NOT NULL, energy_cost INTEGER NOT NULL, boost INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(job_id,user_id)
);
CREATE UNIQUE INDEX one_active_job ON job_members(user_id) WHERE active=1;
CREATE TABLE game_feed(id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, message TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX game_feed_recent ON game_feed(created_at DESC);
INSERT INTO game_players(user_id,energy_updated) SELECT user_id,CAST(strftime('%s','now') AS INTEGER)*1000 FROM survivors;
CREATE TRIGGER player_join AFTER INSERT ON survivors BEGIN
 INSERT OR IGNORE INTO game_players(user_id,energy_updated) VALUES(NEW.user_id,NEW.created_at);
END;

CREATE TRIGGER job_cost_check BEFORE INSERT ON jobs BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM camp WHERE wood>=NEW.cost_wood AND scrap>=NEW.cost_scrap AND food>=NEW.cost_food AND water>=NEW.cost_water AND herbs>=NEW.cost_herbs AND medkits>=NEW.cost_medkits) THEN RAISE(ABORT,'Bahan markas belum cukup.') END;
 SELECT CASE WHEN NEW.kind='attack' AND (SELECT enemy_hp FROM camp WHERE id=1)<=0 THEN RAISE(ABORT,'Tidak ada zombie aktif. Siapkan pertahanan dulu.') END;
END;
CREATE TRIGGER job_cost_pay AFTER INSERT ON jobs BEGIN
 UPDATE camp SET wood=wood-NEW.cost_wood,scrap=scrap-NEW.cost_scrap,food=food-NEW.cost_food,water=water-NEW.cost_water,herbs=herbs-NEW.cost_herbs,medkits=medkits-NEW.cost_medkits WHERE id=1;
END;
CREATE TRIGGER join_check BEFORE INSERT ON job_members BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM jobs WHERE id=NEW.job_id AND status='active' AND ends_at>NEW.joined_at) THEN RAISE(ABORT,'Kegiatan ini sudah selesai.') END;
 SELECT CASE WHEN (SELECT count(*) FROM job_members WHERE job_id=NEW.job_id)>=4 THEN RAISE(ABORT,'Tim ini sudah penuh (4 penyintas).') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM job_members WHERE user_id=NEW.user_id AND active=1) THEN RAISE(ABORT,'Selesaikan kegiatanmu dulu sebelum membantu.') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM game_players WHERE user_id=NEW.user_id AND MIN(100,energy+MAX(0,CAST((NEW.joined_at-energy_updated)/3000 AS INTEGER)))>=NEW.energy_cost) THEN RAISE(ABORT,'Energi belum cukup. Istirahat dulu.') END;
 SELECT CASE WHEN (SELECT health FROM game_players WHERE user_id=NEW.user_id)<=10 AND (SELECT kind FROM jobs WHERE id=NEW.job_id) IN ('attack','loot') THEN RAISE(ABORT,'Kesehatan terlalu rendah. Istirahat atau minta perawatan.') END;
END;
CREATE TRIGGER join_apply AFTER INSERT ON job_members BEGIN
 UPDATE game_players SET energy=MIN(100,energy+MAX(0,CAST((NEW.joined_at-energy_updated)/3000 AS INTEGER)))-NEW.energy_cost,energy_updated=NEW.joined_at WHERE user_id=NEW.user_id;
 UPDATE jobs SET ends_at=MAX(NEW.joined_at+1000,ends_at-NEW.boost),
 wood=wood+CASE WHEN NEW.boost>0 AND wood>0 THEN 2 ELSE 0 END,
 scrap=scrap+CASE WHEN NEW.boost>0 AND scrap>0 THEN 1 ELSE 0 END,
 herbs=herbs+CASE WHEN NEW.boost>0 AND herbs>0 THEN 1 ELSE 0 END,
 water=water+CASE WHEN NEW.boost>0 AND water>0 THEN 1 ELSE 0 END,
 damage=damage+CASE WHEN NEW.boost>0 AND damage>0 THEN 8 ELSE 0 END,
 defense=defense+CASE WHEN NEW.boost>0 AND defense>0 THEN 5 ELSE 0 END,
 progress=progress+CASE WHEN NEW.boost>0 AND progress>0 THEN 5 ELSE 0 END
 WHERE id=NEW.job_id;
 UPDATE survivors SET activity=(SELECT kind FROM jobs WHERE id=NEW.job_id) WHERE user_id=NEW.user_id;
END;
CREATE TRIGGER job_finish AFTER UPDATE OF status ON jobs WHEN OLD.status='active' AND NEW.status='done' BEGIN
 UPDATE camp SET wood=wood+NEW.wood,scrap=scrap+NEW.scrap,food=food+NEW.food,water=water+NEW.water,herbs=herbs+NEW.herbs,medkits=medkits+NEW.medkits,tools=tools+NEW.tools,
 integrity=MIN(100,integrity+NEW.repair),defense=MIN(100,defense+NEW.defense),enemy_hp=MAX(0,enemy_hp-NEW.damage),
 raid_deadline=CASE WHEN enemy_hp-NEW.damage<=0 THEN 0 ELSE raid_deadline END,
 fence_level=fence_level+CAST((fence_work+NEW.progress)/60 AS INTEGER),fence_work=(fence_work+NEW.progress)%60 WHERE id=1;
 UPDATE game_players SET health=MAX(1,health-NEW.injury),xp=xp+12 WHERE user_id IN(SELECT user_id FROM job_members WHERE job_id=NEW.id);
 UPDATE game_players SET health=MIN(100,health+NEW.heal) WHERE user_id=COALESCE(NEW.target_id,NEW.owner_id);
 UPDATE game_players SET energy=MIN(100,energy+MAX(0,CAST((NEW.ends_at-energy_updated)/3000 AS INTEGER))+NEW.energy),energy_updated=MAX(energy_updated,NEW.ends_at) WHERE user_id IN(SELECT user_id FROM job_members WHERE job_id=NEW.id);
 UPDATE survivors SET activity='jelajah' WHERE user_id IN(SELECT user_id FROM job_members WHERE job_id=NEW.id);
 UPDATE job_members SET active=0 WHERE job_id=NEW.id;
 INSERT INTO game_feed(actor,message,created_at) VALUES(NEW.actor_name,NEW.result||CASE WHEN NEW.wood>0 THEN ' +'||NEW.wood||' kayu.' ELSE '' END||CASE WHEN NEW.scrap>0 THEN ' +'||NEW.scrap||' scrap.' ELSE '' END||CASE WHEN NEW.food>0 THEN ' +'||NEW.food||' makanan.' ELSE '' END||CASE WHEN NEW.water>0 THEN ' +'||NEW.water||' air.' ELSE '' END||CASE WHEN NEW.herbs>0 THEN ' +'||NEW.herbs||' herba.' ELSE '' END||CASE WHEN NEW.medkits>0 THEN ' +'||NEW.medkits||' medis.' ELSE '' END||CASE WHEN NEW.tools>0 THEN ' +'||NEW.tools||' perkakas.' ELSE '' END||CASE WHEN NEW.damage>0 THEN ' '||NEW.damage||' damage.' ELSE '' END||CASE WHEN NEW.defense>0 THEN ' +'||NEW.defense||' pertahanan.' ELSE '' END||CASE WHEN NEW.progress>0 THEN ' +'||NEW.progress||' progres pagar.' ELSE '' END||CASE WHEN NEW.heal>0 THEN ' Perawatan +'||NEW.heal||'.' ELSE '' END||CASE WHEN NEW.chest=1 THEN ' Peti suplai ditemukan!' ELSE '' END||CASE WHEN (SELECT count(*) FROM job_members WHERE job_id=NEW.id)>1 THEN ' Selesai bersama tim.' ELSE '' END,NEW.ends_at);
END;
