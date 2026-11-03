import assert from "node:assert/strict";

// Integration checks intentionally create a character in the LOCAL database only.
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("API checks are restricted to localhost.");
const call = async (path, body, cookie, origin = base) => {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json", Origin: origin }), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
};
const before = await call("/api/world"); assert.equal(before.status, 200);
const customization={gender:"female",skin:"bronze",hair:"braids",hairColor:"copper",hat:"straw",accessory:"freckles",backpack:"medical",pants:"camo"};
const profile = { name: "Tes Lokal API", role: "perakit", specialty: "Pemeriksa kaleng", appearance: "plum",customization };
assert.equal((await call("/api/me", profile, undefined, "https://evil.example")).status, 403);
assert.equal((await call("/api/me", { ...profile, role: "admin" })).status, 400);
assert.equal((await call("/api/me", { action: "vote", choice: "air" })).status, 401);
const joined = await call("/api/me", profile); assert.equal(joined.status, 200);
assert.match(joined.data.recoveryKey, /^[a-f0-9]{48}$/); assert.ok(joined.cookie);
const cookie = joined.cookie;
const mine = await call("/api/me", undefined, cookie); assert.equal(mine.data.profile.name, profile.name);
assert.deepEqual(mine.data.profile.customization,customization);
assert.equal((await call("/api/me",{...profile,customization:{hat:"injected"}},cookie)).status,400);
const {customization:omitted,...legacyEdit}=profile;
assert.equal((await call("/api/me",legacyEdit,cookie)).status,200);
assert.deepEqual((await call("/api/me",undefined,cookie)).data.profile.customization,customization);
assert.deepEqual((await call("/api/game",undefined,cookie)).data.me.customization,customization);
assert.equal(mine.data.recoveryKey, undefined);
await call("/api/me", { action: "activity", activity: "jaga" }, cookie);
assert.equal((await call("/api/me", undefined, cookie)).data.profile.activity, "jaga");
await call("/api/me", { action: "vote", choice: "air" }, cookie);
await call("/api/me", { action: "vote", choice: "pagar" }, cookie);
const world = await call("/api/world");
assert.equal(world.data.count, before.data.count + 1);
assert.equal(world.data.votes.air, before.data.votes.air);
assert.equal(world.data.votes.pagar, before.data.votes.pagar + 1);
const shared = await call(`/api/card?code=${joined.data.profile.code}`);
assert.equal(shared.data.profile.name, profile.name);
assert.deepEqual(shared.data.profile.customization,customization);
assert.equal(shared.data.profile.user_id, undefined); assert.equal(shared.data.recoveryKey, undefined);
assert.equal((await call("/api/recover", { recoveryKey: joined.data.profile.code })).status, 400);
assert.equal((await call("/api/recover", { recoveryKey: "0".repeat(48) })).status, 400);
const recovered = await call("/api/recover", { recoveryKey: joined.data.recoveryKey });
assert.equal(recovered.status, 200); assert.ok(recovered.cookie);
assert.equal(recovered.data.profile.id, joined.data.profile.id);
assert.equal(recovered.data.vote, "pagar");
assert.equal((await call("/api/me", undefined, "pt_session=" + "a".repeat(64))).data.profile, null);
console.log("PASS: create, durable session, activity, replace vote, read-only card, recovery, validation, and origin checks.");
