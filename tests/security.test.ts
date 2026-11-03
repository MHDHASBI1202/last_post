import { test } from "node:test";
import assert from "node:assert/strict";
import { hashSecret, isSameOrigin, randomSecret, sessionCookie, sessionToken, validateProfile } from "../worker/security.ts";

test("rejects cross-origin writes and requests without Origin", () => {
  assert.equal(isSameOrigin(new Request("https://markas.example/api/me", { headers: { origin: "https://evil.example" } })), false);
  assert.equal(isSameOrigin(new Request("https://markas.example/api/me")), false);
  assert.equal(isSameOrigin(new Request("https://markas.example/api/me", { headers: { origin: "https://markas.example" } })), true);
});
test("session cookies stay out of JavaScript and use Secure on HTTPS", () => {
  const token = randomSecret(); const cookie = sessionCookie(new Request("https://markas.example"), token);
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.match(cookie, /; Secure/);
  assert.equal(sessionToken(new Request("https://markas.example", { headers: { cookie } })), token);
  assert.equal(sessionToken(new Request("https://markas.example", { headers: { cookie: "pt_session=forged" } })), null);
});
test("recovery keys are high entropy; DB stores only SHA-256 hashes", async () => {
  const a = randomSecret(24); const b = randomSecret(24);
  assert.match(a, /^[a-f0-9]{48}$/); assert.notEqual(a, b);
  assert.match(await hashSecret(a), /^[a-f0-9]{64}$/); assert.notEqual(await hashSecret(a), a);
});
test("validates role, look and name on the server", () => {
  const valid = { name: " Hasbi ", role: "perakit", appearance: "teal" };
  assert.equal(validateProfile(valid).name, "Hasbi");
  assert.throws(() => validateProfile({ ...valid, name: "x" }));
  assert.throws(() => validateProfile({ ...valid, role: "admin" }));
  assert.throws(() => validateProfile({ ...valid, appearance: "unknown" }));
  assert.throws(() => validateProfile({ ...valid, specialty: "x".repeat(33) }));
});

test("new jacket colors can be saved",()=>{for(const appearance of ["plum","rose","navy","moss","burgundy","ivory","charcoal","orange"])assert.equal(validateProfile({name:"Arga",role:"penjaga",appearance}).appearance,appearance);assert.throws(()=>validateProfile({name:"Arga",role:"penjaga",appearance:"toString"}));});
