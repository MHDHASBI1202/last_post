export type ActionKind = "chop" | "loot" | "guard" | "attack" | "forage" | "craft" | "bandage" | "build" | "repair" | "heal" | "rest" | "eat";
export const ACTIONS = [
  { id: "chop", name: "Tebang kayu", description: "Kayu masuk gudang bersama untuk pagar dan peralatan.", seconds: 30, energy: 12, expert: ["perintis", "perakit"], bonus: "Lebih banyak kayu", cost: "Tanpa bahan" },
  { id: "loot", name: "Looting reruntuhan", description: "Cari makanan dan scrap. Ada peluang menemukan peti suplai.", seconds: 40, energy: 16, expert: ["penjelajah"], bonus: "Peluang peti lebih besar, luka lebih ringan", cost: "Risiko luka ringan" },
  { id: "guard", name: "Jaga markas", description: "Siapkan pertahanan untuk mengurangi kerusakan serangan berikutnya.", seconds: 25, energy: 10, expert: ["penjaga"], bonus: "Pertahanan lebih kuat", cost: "Tanpa bahan" },
  { id: "attack", name: "Lawan zombie", description: "Kurangi ancaman bersama. Ajak teman agar serangan lebih kuat.", seconds: 30, energy: 18, expert: ["penjaga"], bonus: "Damage lebih tinggi, luka lebih ringan", cost: "Risiko luka · perlu ancaman aktif" },
  { id: "forage", name: "Cari air & tanaman", description: "Kumpulkan air bersih dan herba untuk markas.", seconds: 30, energy: 12, expert: ["peramu"], bonus: "Hasil air dan herba lebih banyak", cost: "Tanpa bahan" },
  { id: "craft", name: "Rakit perkakas", description: "Perkakas bersama menambah hasil menebang dan looting.", seconds: 35, energy: 12, expert: ["perakit"], bonus: "Menghasilkan dua perkakas", cost: "2 kayu + 3 scrap" },
  { id: "bandage", name: "Ramu kotak medis", description: "Olah herba menjadi persediaan pengobatan bersama.", seconds: 25, energy: 10, expert: ["medis", "peramu"], bonus: "Menghasilkan dua kotak medis", cost: "2 herba + 1 scrap" },
  { id: "build", name: "Perkuat pagar", description: "Sumbang kayu dan scrap untuk memperkuat pagar. Setiap level menahan lebih banyak kerusakan serangan zombie.", seconds: 35, energy: 14, expert: ["perakit", "perintis"], bonus: "Progres pembangunan lebih besar", cost: "4 kayu + 1 scrap" },
  { id: "repair", name: "Perbaiki markas", description: "Pulihkan ketahanan rumah setelah terkena serangan.", seconds: 25, energy: 12, expert: ["perakit"], bonus: "Perbaikan lebih besar", cost: "3 kayu + 1 scrap" },
  { id: "heal", name: "Rawat teman", description: "Pilih penyintas yang terluka. Hasil perawatan langsung dirasakan temanmu.", seconds: 20, energy: 10, expert: ["medis"], bonus: "Pemulihan kesehatan lebih besar", cost: "1 kotak medis" },
  { id: "rest", name: "Istirahat di teras", description: "Pulihkan tenaga dan sedikit kesehatan tanpa mengambil stok markas.", seconds: 20, energy: 0, expert: [], bonus: "", cost: "+25 energi · +5 kesehatan" },
  { id: "eat", name: "Ambil ransum", description: "Makan dan minum untuk pulih lebih cepat.", seconds: 5, energy: 0, expert: [], bonus: "", cost: "1 makanan + 1 air · +35 energi · +12 kesehatan" },
] as const;
export const ROLE_LABELS: Record<string, string> = { perintis: "Perintis", penjaga: "Penjaga", perakit: "Perakit", peramu: "Peramu", penjelajah: "Penjelajah", medis: "Medis" };
export function effectiveEnergy(energy: number, updated: number, now: number) { return Math.min(100, energy + Math.max(0, Math.floor((now - updated) / 3000))); }
export function expertFor(kind: string, role: string) { return ACTIONS.find(a => a.id === kind)?.expert.some(r => r === role) || false; }
export function actionRewards(kind: ActionKind, role: string, tools: number, roll: number) {
  const expert = expertFor(kind, role); const a = ACTIONS.find(a => a.id === kind)!;
  const r = { wood: 0, scrap: 0, food: 0, water: 0, herbs: 0, medkits: 0, tools: 0, damage: 0, defense: 0, repair: 0, progress: 0, heal: 0, energy: 0, injury: 0, chest: 0, costWood: 0, costScrap: 0, costFood: 0, costWater: 0, costHerbs: 0, costMedkits: 0 };
  if (kind === "chop") r.wood = (expert ? 8 : 5) + Math.min(tools, 3);
  if (kind === "loot") { r.scrap = 2 + Math.min(tools, 3); r.food = 1; r.injury = expert ? 2 : 6; if (roll < (expert ? .55 : .3)) { r.chest = 1; r.food += 2; r.water += 2; r.scrap += 3; r.medkits = 1; } }
  if (kind === "forage") { r.water = expert ? 4 : 2; r.herbs = expert ? 4 : 2; }
  if (kind === "guard") r.defense = expert ? 18 : 10;
  if (kind === "attack") { r.damage = expert ? 24 : 14; r.injury = expert ? 3 : 8; }
  if (kind === "craft") { r.tools = expert ? 2 : 1; r.costWood = 2; r.costScrap = 3; }
  if (kind === "bandage") { r.medkits = expert ? 2 : 1; r.costHerbs = 2; r.costScrap = 1; }
  if (kind === "build") { r.progress = expert ? 18 : 10; r.costWood = 4; r.costScrap = 1; }
  if (kind === "repair") { r.repair = expert ? 30 : 18; r.costWood = 3; r.costScrap = 1; }
  if (kind === "heal") { r.heal = expert ? 45 : 25; r.costMedkits = 1; }
  if (kind === "rest") { r.energy = 25; r.heal = 5; }
  if (kind === "eat") { r.energy = 35; r.heal = 12; r.costFood = 1; r.costWater = 1; }
  return { ...r, seconds: a.seconds, energyCost: a.energy };
}
export type Camp = { wood: number; scrap: number; food: number; water: number; herbs: number; medkits: number; tools: number; integrity: number; defense: number; enemyHp: number; wave: number; raidDeadline: number; nextRaid: number; fenceWork: number; fenceLevel: number };
export type Crew = { id: string; name: string; role: string; appearance: string; customization?: import("./character-style").CharacterStyle; health: number; energy: number; xp: number; activeJob: string | null };
export type Job = { id: string; kind: ActionKind; ownerId: string; ownerName: string; targetName: string | null; targetId?: string; startedAt: number; endsAt: number; members: { id: string; name: string; role: string }[] };
export type GameState = { patrol?: Job["members"]; arga?:{active:boolean;startedAt:number;nextAttackAt:number;lastAttackAt:number;damage:number;intervalMs:number}; serverTime: number; clientReceivedAt?: number; camp: Camp; crew: Crew[]; jobs: Job[]; feed: { id: number; actor: string; message: string; createdAt: number }[]; me: Crew | null; activeJob: string | null };
