import { test } from "node:test";
import assert from "node:assert/strict";
import { STYLE_OPTIONS,JACKETS,drawCharacter,DEFAULT_STYLE,normalizeStyle,validateStyle } from "../src/character-style.ts";
import { findRoute,followRoute,routeDistance,walkable } from "../src/world-navigation.ts";
test("legacy characters get a complete safe appearance",()=>{
  assert.deepEqual(normalizeStyle("{}"),DEFAULT_STYLE);
  assert.deepEqual(normalizeStyle("broken json"),DEFAULT_STYLE);
  assert.equal(normalizeStyle({skin:"deep",hat:"unknown"}).skin,"deep");
  assert.equal(normalizeStyle({hat:"unknown"}).hat,"none");
  assert.throws(()=>validateStyle({skin:"<script>"}));
  assert.throws(()=>validateStyle({url:"https://outside.example/asset"}));
  assert.equal(validateStyle({skin:"brown",hat:"cap"}).hat,"cap");
});
test("routes travel around the house rather than through its walls",()=>{
  const route=findRoute({x:0,y:4},{x:0,y:-5});assert.ok(route.length>2);
  for(let d=0;d<routeDistance(route);d+=.05)assert.ok(walkable(followRoute(route,d),false));
  assert.deepEqual(followRoute(route,1000),{x:0,y:-5});
  assert.equal(findRoute({x:0,y:4},{x:0,y:0}).length,0);
});
test("built fences force entry through the front gate",()=>{
  const route=findRoute({x:3,y:-5},{x:2,y:-7.5},true);assert.ok(route.length>0);
  assert.ok(route.some(p=>p.y===6.5&&Math.abs(p.x)<=1.25));
  for(let d=0;d<routeDistance(route);d+=.05)assert.ok(walkable(followRoute(route,d),true));
  assert.ok(routeDistance(route)>routeDistance(findRoute({x:3,y:-5},{x:2,y:-7.5},false)));
});
test("following a route is continuous and stops exactly at its destination",()=>{
  const route=findRoute({x:-4,y:4},{x:4,y:4},true);
  let last=followRoute(route,0);for(let d=.1;d<routeDistance(route);d+=.1){const p=followRoute(route,d);assert.ok(Math.hypot(p.x-last.x,p.y-last.y)<=.10001);last=p;}
  assert.deepEqual(followRoute(route,-1),route[0]);
});

 test("expanded appearances validate and render for every facing",()=>{
   const context=new Proxy({},{get:(_,key)=>key==='measureText'?()=>({width:1}):()=>{},set:(_,key,value)=>{if(typeof value==='number')assert.ok(Number.isFinite(value));return true;}}) as unknown as CanvasRenderingContext2D;
   for(const [key,options] of Object.entries(STYLE_OPTIONS))for(const option of Object.keys(options)){
     const style=validateStyle({...DEFAULT_STYLE,[key]:option});assert.equal(style[key as keyof typeof style],option);
     for(const facing of ["front","back","left","right"] as const)drawCharacter(context,{style,facing,time:1,stride:.5});
   }
   assert.equal(normalizeStyle({hair:"long"}).gender,"male");
   assert.equal(validateStyle({gender:"female"}).gender,"female");
   assert.throws(()=>validateStyle({gender:"unknown"}));
   assert.equal(Object.keys(JACKETS).length,12);
 });
