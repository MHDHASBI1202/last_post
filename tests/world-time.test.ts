import {test} from "node:test";
import assert from "node:assert/strict";
import {worldTime,worldLight} from "../src/world-time.ts";
const at=(time:string)=>Date.parse("2026-11-03T"+time+"+07:00");
test("world phases follow WIB boundaries including midnight",()=>{
 for(const [time,phase] of [["00:00:00","malam"],["04:59:59","malam"],["05:00:00","pagi"],["10:59:59","pagi"],["11:00:00","siang"],["14:59:59","siang"],["15:00:00","sore"],["17:59:59","sore"],["18:00:00","malam"],["23:59:59","malam"]])assert.equal(worldTime(at(time)).phase,phase);
 assert.equal(worldTime(Date.parse("2026-11-02T17:00:00Z")).clock,"00:00:00");
 assert.match(worldTime(at("00:00:00")).date,/3 Nov 2026/);
});
test("lighting interpolates continuously and lamps follow darkness",()=>{
 assert.equal(worldLight(at("12:00:00")).lamps,0);
 assert.equal(worldLight(at("23:00:00")).lamps,1);
 for(let minute=0;minute<1440;minute++){const light=worldLight(at("00:00:00")+minute*60000);assert.ok(light.lamps>=0&&light.lamps<=1);assert.doesNotMatch(light.tint,/NaN|undefined/);const next=worldLight(at("00:00:00")+minute*60000+1000);assert.ok(Math.abs(light.lamps-next.lamps)<.001);}
 assert.deepEqual(worldLight(at("00:00:00")),worldLight(at("00:00:00")+86400000));
});
