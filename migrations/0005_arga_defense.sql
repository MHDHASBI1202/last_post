ALTER TABLE camp ADD COLUMN arga_started_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE camp ADD COLUMN arga_next_attack INTEGER NOT NULL DEFAULT 0;
ALTER TABLE camp ADD COLUMN arga_last_attack INTEGER NOT NULL DEFAULT 0;
-- Rebalance the currently present enemies once; preserve supplies, players, and camp progress.
UPDATE camp SET enemy_hp=MIN(enemy_hp,16*(1+MIN(23,(SELECT COUNT(*) FROM survivors)/3))),
 arga_started_at=CAST(strftime('%s','now') AS INTEGER)*1000,
 arga_next_attack=CAST(strftime('%s','now') AS INTEGER)*1000+20000;
