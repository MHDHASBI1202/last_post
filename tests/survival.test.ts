import { test } from "node:test";
import assert from "node:assert/strict";
import { actionRewards, effectiveEnergy } from "../src/survival-rules.ts";
test("energy regen is capped and never runs backwards", () => {
  assert.equal(effectiveEnergy(20,10000,16000),22);
  assert.equal(effectiveEnergy(99,0,9000),100);
  assert.equal(effectiveEnergy(20,20000,10000),20);
});
test("role bonuses affect real outputs and looting outcomes", () => {
  assert.ok(actionRewards("chop","perintis",0,.8).wood > actionRewards("chop","medis",0,.8).wood);
  assert.equal(actionRewards("loot","penjelajah",0,.4).chest,1);
  assert.equal(actionRewards("loot","medis",0,.4).chest,0);
  assert.equal(actionRewards("loot","penjelajah",0,.9).chest,0);
  assert.ok(actionRewards("attack","penjaga",0,.9).damage > actionRewards("attack","peramu",0,.9).damage);
  assert.ok(actionRewards("heal","medis",0,.9).heal > actionRewards("heal","perintis",0,.9).heal);
  assert.equal(actionRewards("chop","perintis",100,.9).wood,11);
});
