export const STYLE_OPTIONS = {
  skin: { sand: "Terang", tan: "Sawo matang", brown: "Cokelat", deep: "Gelap" },
  hair: { crop: "Pendek", wave: "Bergelombang", long: "Panjang", bald: "Plontos" },
  hairColor: { dark: "Hitam", chestnut: "Cokelat", gray: "Abu-abu" },
  hat: { none: "Tanpa penutup", cap: "Topi lapangan", beanie: "Kupluk" },
  accessory: { none: "Tanpa aksesori", glasses: "Kacamata", bandana: "Bandana wajah" },
  backpack: { canvas: "Tas kecil", rucksack: "Ransel ekspedisi", none: "Tanpa tas" },
  pants: { slate: "Biru batu", olive: "Hijau zaitun", charcoal: "Arang" },
} as const;
export type CharacterStyle = { [K in keyof typeof STYLE_OPTIONS]: keyof typeof STYLE_OPTIONS[K] };
export const DEFAULT_STYLE: CharacterStyle = { skin: "tan", hair: "crop", hairColor: "dark", hat: "none", accessory: "none", backpack: "canvas", pants: "slate" };
export const JACKETS: Record<string,string> = { amber: "#dca34d", teal: "#4d8a76", clay: "#b66c4f", slate: "#667c8e" };
export function normalizeStyle(value: unknown): CharacterStyle {
  let data: unknown = value;
  if (typeof data === "string") { try { data=JSON.parse(data); } catch { data={}; } }
  const source=data && typeof data==="object" && !Array.isArray(data) ? data as Record<string,unknown> : {};
  const result={...DEFAULT_STYLE};
  for(const key of Object.keys(STYLE_OPTIONS) as (keyof CharacterStyle)[]) if(typeof source[key]==="string" && Object.hasOwn(STYLE_OPTIONS[key],source[key] as string)) (result as Record<string,string>)[key]=source[key] as string;
  return result;
}
export function validateStyle(value: unknown): CharacterStyle {
  if(!value || typeof value!=="object" || Array.isArray(value)) throw new Error("Pilihan penampilan tidak valid.");
  for(const [key,option] of Object.entries(value)) if(!Object.hasOwn(STYLE_OPTIONS,key) || typeof option!=="string" || !Object.hasOwn(STYLE_OPTIONS[key as keyof CharacterStyle],option)) throw new Error("Pilihan penampilan tidak dikenal.");
  return normalizeStyle(value);
}
export type Facing="front"|"back"|"left"|"right";
export function drawCharacter(g:CanvasRenderingContext2D, options:{look?:string;style?:unknown;time?:number;stride?:number;facing?:Facing;working?:boolean;infected?:boolean;kneel?:number}) {
  const s=normalizeStyle(options.style),time=options.time || 0,stride=options.stride || 0,face=options.facing || "front",back=face==="back",side=face==="left"?-1:face==="right"?1:0;
  const infected=options.infected,skin=infected?"#a4af82":({sand:"#e1b68d",tan:"#c9946c",brown:"#996546",deep:"#674432"}[s.skin]);
  const hair={dark:"#383b32",chestnut:"#75503a",gray:"#a6aa99"}[s.hairColor],shirt=infected?"#925747":JACKETS[options.look || "amber"] || JACKETS.amber;
  const pants={slate:"#506c71",olive:"#626d4c",charcoal:"#3c4948"}[s.pants],kneel=options.kneel || 0;
  const rr=(x:number,y:number,w:number,h:number,r:number,c:string)=>{g.fillStyle=c;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();};
  g.save();g.translate(0,kneel*6);
  for(const n of [-1,1]) {const dy=stride*n*3;rr(n*4.2-3,-15+dy,6,13-kneel*4,2,pants);rr(n*4.2-4,-4+dy-kneel*4,8,4,1.5,"#33473e");}
  g.translate(0,-Math.abs(stride)*1.1+Math.sin(time*1.8)*.25);g.rotate(kneel*.08);
  if(s.hair==="long" && !infected)rr(-10,-48,20,25,5,hair);
  rr(-9,-35,18,22,5,shirt);rr(-.6,-32,1.2,17,0,"#c2b787");
  if(s.backpack!=="none" && !back && !infected) for(const x of [-6,5])rr(x,-34,2,17,1,"#85784e");
  for(const n of [-1,1]) {const swing=options.working?(n===1?Math.sin(time*6)*4:-1):stride*n*3;rr(n*10-3,-33+swing,6,15,3,shirt);rr(n*10-2.3,-19+swing,4.6,5,2,skin);}
  if(back && s.backpack!=="none" && !infected){const big=s.backpack==="rucksack";rr(-8.5,-35,17,big?22:17,4,big?"#7d7750":"#3e756b");rr(-6,-33,12,3,1,"#b1b78b");rr(-6,-25,12,7,2,big?"#91895d":"#54887a");}
  rr(-8.5+side*.5,-52,17,19,5,skin);
  if(!infected && s.hair!=="bald") {
    rr(-8.6,-54,17.2,s.hair==="wave"?10:8,3,hair);
    if(s.hair==="wave")for(const x of [-6,-1,4]){g.fillStyle=hair;g.beginPath();g.arc(x,-52,4,0,Math.PI*2);g.fill();}
    rr(side===1?5.7:-8.6,-49,3,7,1,hair);
    if(back)rr(-8.6,-52,17.2,s.hair==="long"?21:13,4,hair);
  }
  if(!back || infected) {
    const blink=!infected && time>0 && time%5.3>.05 && time%5.3<.15;const shift=side*.9;
    for(const x of [-4.5,2]) {rr(x+shift,-44,3.2,blink?1:3,0,"#f3ead4");if(!blink)rr(x+1.3+shift,-43.7,1.6,2.4,0,"#2c4338");}
    rr(-1.2+shift,-38,3,1.2,0,infected?"#6b7456":"#825b43");
    if(s.accessory==="glasses"&&!infected){g.strokeStyle="#394944";g.lineWidth=1.1;for(const x of [-6,1]){g.beginPath();g.roundRect(x+shift,-46,6,6,1.8);g.stroke();}g.beginPath();g.moveTo(shift,-43.7);g.lineTo(1+shift,-43.7);g.stroke();}
    if(s.accessory==="bandana"&&!infected){rr(-8,-40,16,7,2,"#a36e51");rr(-5,-38,10,1,0,"#c5956c");}
  }
  if(!infected && s.hat==="beanie"){rr(-9,-55,18,10,4,"#526a59");rr(-9.5,-49,19,3,1,"#779077");}
  if(!infected && s.hat==="cap"){rr(-9,-55,18,9,3,"#747e55");rr(back?-7:side===-1?-14:side===1?-2:-9,-48,back?14:20,3,1,"#525e43");}
  g.restore();
}
