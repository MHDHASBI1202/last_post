-- Migration 0006: Apply result of community vote - erect and fortify camp fence
UPDATE camp
SET fence_level = MAX(fence_level, 2),
    defense = MAX(defense, 12),
    wood = MAX(wood, 15),
    scrap = MAX(scrap, 8);

INSERT INTO game_feed (actor, message, created_at)
VALUES (
  'Radio markas',
  'Hasil voting: Pagar menang! Perimeter markas kini resmi berdiri dan diperkuat (Lv.2) lengkap dengan gerbang utama.',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);
