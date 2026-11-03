import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Restricted to local test database.");
function sql(command) {
  const r=spawnSync(process.execPath,["node_modules/wrangler/bin/wrangler.js","d1","execute","DB","--local","--command",command],{encoding:"utf8",env:{...process.env,WRANGLER_LOG_PATH:process.cwd()+"/.wrangler/logs"}});
  if(r.status!==0)throw new Error(r.stderr || r.stdout);
}
async function call(path,body,cookie) { const r=await fetch(base+path,{method:body?"POST":"GET",headers:{Origin:base,...(body?{"Content-Type":"application/json"}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:await r.json(),cookie:r.headers.get("set-cookie")?.split(";")[0]}; }
async function register(name,role) {const r=await call("/api/me",{name,role,appearance:"teal"});assert.equal(r.status,200);return{cookie:r.cookie,id:r.data.profile.id};}
const first=await register("Tes Kayu","perintis"), second=await register("Tes Penjaga","penjaga"), medic=await register("Tes Medis","medis");
const act=(p,body)=>call("/api/game",body,p.cookie), read=(p)=>call("/api/game",null,p?.cookie);
const finish=(id)=>{assert.match(id,/^[a-f0-9-]{36}$/);sql(`UPDATE jobs SET ends_at=${Date.now()-1} WHERE id='${id}' AND status='active'`);};
assert.equal((await call("/api/game",{action:"start",kind:"chop"})).status,401);
assert.equal((await act(first,{action:"start",kind:"fake"})).status,400);
const before=(await read(first)).data;
const start=await act(first,{action:"start",kind:"chop",endsAt:0,wood:9999});assert.equal(start.status,200);
const job=start.data.game.jobs.find(j=>j.id===start.data.game.activeJob);assert.ok(job.endsAt>Date.now()+20000);
assert.equal(start.data.game.camp.wood,before.camp.wood);
assert.equal((await act(first,{action:"start",kind:"rest"})).status,409);
const helps=await Promise.all([act(second,{action:"help",jobId:job.id}),act(second,{action:"help",jobId:job.id})]);
assert.deepEqual(helps.map(r=>r.status).sort(),[200,409]);
const helping=(await read(second)).data;assert.equal(helping.activeJob,job.id);assert.equal(helping.jobs.find(j=>j.id===job.id).members.length,2);
assert.ok(helping.jobs.find(j=>j.id===job.id).endsAt<job.endsAt);
finish(job.id);
const settlements=await Promise.all([read(first),read(first),read(second)]);
for(const r of settlements){assert.equal(r.status,200);assert.equal(r.data.camp.wood,before.camp.wood+10);assert.equal(r.data.activeJob,null);}
assert.ok(settlements[0].data.me.xp>=12);
console.log("PASS: simultaneous helpers, single active task, server timer, atomic reward once, shared stock.");
sql("UPDATE camp SET wood=100,scrap=100,herbs=20,medkits=5,enemy_hp=40,defense=0,integrity=100,raid_deadline=0,next_raid="+(Date.now()+900000)+",fence_work=55,fence_level=0");
let build=await act(first,{action:"start",kind:"build"});assert.equal(build.status,200);assert.equal(build.data.game.camp.wood,96);assert.equal(build.data.game.camp.scrap,99);
assert.equal((await act(first,{action:"start",kind:"craft"})).status,409);
const failedDuplicate=(await read(first)).data;assert.equal(failedDuplicate.camp.wood,96);assert.equal(failedDuplicate.camp.scrap,99);
finish(build.data.game.activeJob);let built=(await read(first)).data;assert.equal(built.camp.fenceLevel,1);assert.equal(built.camp.fenceWork,13);
let attack=await act(second,{action:"start",kind:"attack"});assert.equal(attack.status,200);finish(attack.data.game.activeJob);
const hit=(await read(second)).data;assert.equal(hit.camp.enemyHp,16);assert.equal(hit.me.health,97);
const heal=await act(medic,{action:"start",kind:"heal",targetId:second.id});assert.equal(heal.status,200);assert.equal(heal.data.game.camp.medkits,4);
finish(heal.data.game.activeJob);assert.equal((await read(second)).data.me.health,100);
const gift=await act(first,{action:"emote",emote:"wave",targetId:second.id});assert.equal(gift.status,200);assert.equal((await act(first,{action:"emote",emote:"thanks"})).status,429);
console.log("PASS: material spending, visible fence level, zombie damage, role-based healing, interaction cooldown.");
sql("UPDATE camp SET integrity=100,enemy_hp=40,defense=2,fence_level=1,raid_deadline="+(Date.now()-1000)+",next_raid="+(Date.now()+900000));
let raid=await Promise.all([read(first),read(second)]);for(const r of raid)assert.equal(r.data.camp.integrity,96);
assert.equal((await read(first)).data.camp.integrity,96);
sql("UPDATE camp SET next_raid="+(Date.now()-1000)+",raid_deadline=0");
const wave=(await read(first)).data;assert.ok(wave.camp.raidDeadline>Date.now());assert.ok(wave.camp.enemyHp>0);
assert.ok(!JSON.stringify(wave).includes("user_id"));
console.log("PASS: raids settle once across clients, next wave starts, private identity stays private.");
