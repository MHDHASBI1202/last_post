import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Keeps the CLI on the installed, pinned Wrangler release; no credentials in files.
const cli = "node_modules/wrangler/bin/wrangler.js";
const run = (args) => {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", stdio: ["inherit", "pipe", "inherit"] });
  if (result.status !== 0) process.exit(result.status || 1);
  return result.stdout;
};
const path = "wrangler.jsonc";
let config = readFileSync(path, "utf8");
if (!config.includes('"00000000-0000-4000-8000-000000000000"')) {
  console.log("Database sudah dikonfigurasi. Gunakan npm run db:remote untuk migrasi.");
  process.exit(0);
}
const databases = JSON.parse(run(["d1", "list", "--json"]));
let database = databases.find((item) => item.name === "pos-terakhir-db");
if (!database) {
  console.log(run(["d1", "create", "pos-terakhir-db"]));
  database = JSON.parse(run(["d1", "list", "--json"])).find((item) => item.name === "pos-terakhir-db");
}
if (!database?.uuid || !/^[0-9a-f-]{36}$/i.test(database.uuid)) throw new Error("ID database belum ditemukan.");
config = config.replace('"00000000-0000-4000-8000-000000000000"', JSON.stringify(database.uuid));
writeFileSync(path, config);
console.log("D1 terhubung. Lanjutkan npm run deploy. Commit wrangler.jsonc untuk deploy berikutnya.");
