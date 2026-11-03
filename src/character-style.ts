export const STYLE_OPTIONS = {
  gender: { male: "Laki-laki", female: "Perempuan" },
  skin: { sand: "Terang", tan: "Sawo matang", brown: "Cokelat", deep: "Gelap", porcelain: "Porselen", fair: "Krem hangat", bronze: "Perunggu", umber: "Cokelat tua" },
  hair: { crop: "Pendek", wave: "Bergelombang", long: "Panjang", bald: "Plontos", bob: "Bob", ponytail: "Ekor kuda", bun: "Cepol", braids: "Kepang dua", curly: "Keriting", mohawk: "Mohawk", sidepart: "Belah samping", undercut: "Undercut" },
  hairColor: { dark: "Hitam", chestnut: "Cokelat", gray: "Abu-abu", blond: "Pirang", copper: "Tembaga", auburn: "Merah kecokelatan", silver: "Perak", blue: "Biru malam", purple: "Ungu", pink: "Merah muda" },
  hat: { none: "Tanpa penutup", cap: "Topi lapangan", beanie: "Kupluk", bucket: "Topi bucket", boonie: "Topi rimba", helmet: "Helm penyintas", beret: "Baret", headband: "Ikat kepala", hood: "Tudung", straw: "Topi jerami" },
  accessory: { none: "Tanpa aksesori", glasses: "Kacamata", bandana: "Bandana wajah", roundglasses: "Kacamata bulat", sunglasses: "Kacamata hitam", goggles: "Kacamata pelindung", mask: "Masker kain", scarf: "Syal", earpiece: "Headset radio", freckles: "Bintik wajah", beard: "Janggut", aviators: "Kacamata aviator" },
  backpack: { canvas: "Tas kecil", rucksack: "Ransel ekspedisi", none: "Tanpa tas", satchel: "Tas selempang", medical: "Tas medis", tactical: "Ransel taktis", bedroll: "Ransel + gulungan", scout: "Ransel pengintai" },
  pants: { slate: "Biru batu", olive: "Hijau zaitun", charcoal: "Arang", sand: "Pasir", denim: "Denim", navy: "Biru laut", brown: "Cokelat", camo: "Kamuflase", cream: "Krem", burgundy: "Merah anggur", plum: "Ungu tua", rust: "Terakota" },
} as const;
export type CharacterStyle = { [K in keyof typeof STYLE_OPTIONS]: keyof typeof STYLE_OPTIONS[K] };
export const DEFAULT_STYLE: CharacterStyle = { gender:"male", skin: "tan", hair: "crop", hairColor: "dark", hat: "none", accessory: "none", backpack: "canvas", pants: "slate" };
export const JACKETS: Record<string,string> = { amber: "#dca34d", teal: "#4d8a76", clay: "#b66c4f", slate: "#667c8e", navy:"#415f7f", moss:"#7d8d52", burgundy:"#98565d", ivory:"#d5cfad", charcoal:"#485151", rose:"#bc8090", plum:"#80658e", orange:"#cc8246" };
export const JACKET_LABELS:Record<string,string>={amber:"Kuning madu",teal:"Hijau teal",clay:"Terakota",slate:"Biru batu",navy:"Biru laut",moss:"Hijau lumut",burgundy:"Merah anggur",ivory:"Gading",charcoal:"Arang",rose:"Mawar",plum:"Ungu plum",orange:"Jingga"};
export const SKIN_COLORS={sand:"#e1b68d",tan:"#c9946c",brown:"#996546",deep:"#674432",porcelain:"#f1d7c0",fair:"#e8c5a5",bronze:"#b68151",umber:"#815437"};
export const HAIR_COLORS={dark:"#383b32",chestnut:"#75503a",gray:"#a6aa99",blond:"#c7ad6e",copper:"#b87746",auburn:"#874b3b",silver:"#c8cbbb",blue:"#435d74",purple:"#826389",pink:"#bf8b99"};
export const PANTS_COLORS={slate:"#506c71",olive:"#626d4c",charcoal:"#3c4948",sand:"#b7a67d",denim:"#607e98",navy:"#394f69",brown:"#78614b",camo:"#70805b",cream:"#cbc5a5",burgundy:"#80525e",plum:"#66526c",rust:"#a26b4f"};
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
  const s=normalizeStyle(options.style),time=options.time||0,stride=options.stride||0,face=options.facing||'front',back=face==='back',side=face==='left'?-1:face==='right'?1:0;
  const infected=options.infected,female=!infected&&s.gender==='female',skin=infected?'#a4af82':SKIN_COLORS[s.skin],hair=HAIR_COLORS[s.hairColor],shirt=infected?'#925747':JACKETS[options.look||'amber']||JACKETS.amber,pants=PANTS_COLORS[s.pants],kneel=options.kneel||0;
  const rr=(x:number,y:number,w:number,h:number,r:number,c:string)=>{g.fillStyle=c;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();};
  const oval=(x:number,y:number,rx:number,ry:number,c:string,angle=0)=>{g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,angle,0,Math.PI*2);g.fill();};
  const poly=(points:number[][],c:string)=>{g.fillStyle=c;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
  const line=(points:number[][],c:string,width=1)=>{g.strokeStyle=c;g.lineWidth=width;g.lineCap='round';g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();};
  g.save();g.translate(0,kneel*6);
  for(const n of [-1,1]){const x=n*(female?3.8:4.2),dy=stride*n*3;rr(x-3,-15+dy,6,13-kneel*4,2,pants);if(s.pants==='camo'){rr(x-2.5,-13+dy,3,3,1,'#485b43');rr(x-.5,-8+dy,3,3,1,'#a2a478');}rr(x-4,-4+dy-kneel*4,8,4,1.5,'#33473e');}
  g.translate(0,-Math.abs(stride)*1.1+Math.sin(time*1.8)*.25);g.rotate(kneel*.08);
  if(!infected){
    if(s.hat==='hood')rr(-11,-57,22,29,9,'#596d57');
    if(s.hair==='long')rr(-10,-48,20,25,5,hair);
    if(s.hair==='bob')rr(-10.5,-51,21,23,6,hair);
    if(s.hair==='ponytail'){oval(10,-49,5,5,hair);rr(10,-47,6,19,3,hair);rr(10,-45,6,2,0,'#bdaf77');}
    if(s.hair==='bun')oval(0,-58,5,5,hair);
    if(s.hair==='braids')for(const x of [-10,7]){for(let i=0;i<5;i++)oval(x+1.5,-43+i*4,2.3,3,hair,i%2?.2:-.2);rr(x,-25,3,2,1,'#c5ae73');}
    if(s.hair==='curly')for(let i=0;i<8;i++){const a=i/8*Math.PI;oval(Math.cos(a)*9,-49-Math.sin(a)*7,4.2,4.5,hair);}
  }
  if(female)poly([[-8.5,-34],[-5,-36],[5,-36],[8.5,-34],[6,-24],[8.5,-14],[-8.5,-14],[-6,-24]],shirt);else rr(-9,-35,18,22,5,shirt);
  rr(-.6,-32,1.2,17,0,'#c2b787');
  if(s.backpack!=='none'&&s.backpack!=='satchel'&&!back&&!infected)for(const x of [-6,5])rr(x,-34,2,17,1,s.backpack==='medical'?'#b8bda7':'#85784e');
  for(const n of [-1,1]){const swing=options.working?(n===1?Math.sin(time*6)*4:-1):stride*n*3,x=n*(female?9.5:10);rr(x-3,-33+swing,6,15,3,shirt);rr(x-2.3,-19+swing,4.6,5,2,skin);}
  if(!infected&&s.backpack==='satchel'){line([[-7,-34],[8,-16]],'#82754d',2.4);rr(5,-23,10,12,3,'#96754f');rr(6,-23,9,4,2,'#b1976b');rr(9,-20,2,4,0,'#cbb779');}
  if(back&&s.backpack!=='none'&&s.backpack!=='satchel'&&!infected){
    const palette={canvas:'#3e756b',rucksack:'#7d7750',medical:'#d2d5be',tactical:'#465e4e',bedroll:'#8b7152',scout:'#597486'};const color=palette[s.backpack],big=['rucksack','tactical','bedroll'].includes(s.backpack),w=s.backpack==='scout'?14:17;
    rr(-w/2,-35,w,big?22:17,4,color);rr(-6,-33,12,3,1,'#b1b78b');rr(-6,-25,12,7,2,s.backpack==='canvas'?'#54887a':'#ffffff15');
    if(s.backpack==='medical'){rr(-1,-28,2,9,0,'#a75f50');rr(-4.5,-24.5,9,2,0,'#a75f50');}
    if(s.backpack==='tactical')for(const x of [-6,1]){rr(x,-25,5,8,1,'#788363');rr(x,-23,5,1,0,'#a9ad85');}
    if(s.backpack==='bedroll'){rr(-11,-39,22,7,3,'#b09b70');for(const x of [-6,5])rr(x,-39,2,7,0,'#5d6d4e');}
    if(s.backpack==='scout')line([[-5,-31],[5,-21],[-5,-21],[5,-31]],'#a5b9ac',1);
  }
  rr(-8.5+side*.5,-52,17,19,female?7:5,skin);
  if(!infected&&s.hair!=='bald'){
    if(s.hair==='mohawk'){rr(-3,-63,6,18,2,hair);for(let i=0;i<3;i++)poly([[-3,-60+i*3],[0,-65+i*3],[3,-60+i*3]],hair);}
    else if(s.hair==='undercut'){rr(-8,-53,16,5,2,hair);rr(-6,-56,13,7,3,hair);}
    else {rr(-8.6,-54,17.2,s.hair==='wave'||s.hair==='curly'?10:8,3,hair);
      if(s.hair==='wave'||s.hair==='curly')for(const x of [-6,-1,4])oval(x,-52,4,4,hair);
      if(s.hair==='sidepart')poly([[-8,-53],[5,-57],[9,-51],[-5,-44],[-8,-47]],hair);
      if(['bob','long'].includes(s.hair)){rr(-9,-51,4,s.hair==='bob'?19:23,2,hair);rr(5,-51,4,s.hair==='bob'?19:23,2,hair);}
      else rr(side===1?5.7:-8.6,-49,3,7,1,hair);
    }
    if(back)rr(-8.6,-52,17.2,['long','bob'].includes(s.hair)?21:s.hair==='undercut'?8:13,4,hair);
  }
  if(!back||infected){const blink=!infected&&time>0&&time%5.3>.05&&time%5.3<.15,shift=side*.9;
    for(const x of [-4.5,2]){rr(x+shift,-44,3.2,blink?1:3,0,'#f3ead4');if(!blink)rr(x+1.3+shift,-43.7,1.6,2.4,0,'#2c4338');if(female)line([[x+shift,-44.5],[x+3+shift,-44.5]],'#4a4438',.65);}
    rr(-1.2+shift,-38,3,1.2,0,infected?'#6b7456':'#825b43');
    if(!infected){
      if(['glasses','roundglasses','sunglasses','goggles','aviators'].includes(s.accessory)){
        const dark=s.accessory==='sunglasses',round=s.accessory==='roundglasses',wide=s.accessory==='goggles';
        for(const x of [-3,4]){if(round){g.strokeStyle='#68513d';g.lineWidth=.9;g.beginPath();g.arc(x+shift,-43.2,3.6,0,Math.PI*2);g.stroke();}else{g.beginPath();g.roundRect(x-3.5+shift,-46.5,7,wide?8:6.5,s.accessory==='aviators'?2.6:1.4);g.strokeStyle=wide?'#8e9673':'#394944';g.lineWidth=wide?1.5:1.1;g.stroke();if(dark){g.fillStyle='#435c5acc';g.fill();line([[x-2+shift,-45],[x+1+shift,-43]],'#a8c0b4',.6);}if(s.accessory==='aviators')line([[x-2+shift,-42],[x+1+shift,-42]],'#9eb5a966',1.5);}}
        line([[0+shift,-43.7],[1+shift,-43.7]],'#394944',1);
      }
      if(s.accessory==='bandana'){rr(-8,-40,16,7,2,'#a36e51');rr(-5,-38,10,1,0,'#c5956c');}
      if(s.accessory==='mask'){rr(-7.5,-40.5,15,7,2,'#a8b9ad');line([[-5,-38],[5,-38]],'#d0d9c8',.8);}
      if(s.accessory==='scarf'){rr(-9,-35,18,5,2,'#a77757');poly([[4,-32],[9,-32],[7,-20],[3,-22]],'#bb8f64');}
      if(s.accessory==='freckles')for(const x of [-6,-4,4,6])oval(x,-39.5,.6,.6,'#8a5c46');
      if(s.accessory==='beard'){poly([[-7,-39],[-4,-36],[4,-36],[7,-39],[5,-32],[0,-30],[-5,-32]],hair);rr(-2,-38,4,1,0,skin);}
    }
  }
  if(!infected&&s.accessory==='earpiece'){rr(7.5,-46,3.5,8,2,'#3c5148');line([[10,-39],[7,-36],[3,-36]],'#40564c',1);oval(3,-36,1.3,1,'#829282');}
  if(!infected){
    if(s.hat==='beanie'){rr(-9,-55,18,10,4,'#526a59');rr(-9.5,-49,19,3,1,'#779077');}
    if(s.hat==='cap'){rr(-9,-55,18,9,3,'#747e55');rr(back?-7:side===-1?-14:side===1?-2:-9,-48,back?14:20,3,1,'#525e43');}
    if(s.hat==='bucket'){poly([[-8,-56],[8,-56],[10,-46],[-10,-46]],'#a29369');oval(0,-46,13,3,'#b8a67d');line([[-8,-49],[8,-49]],'#7f805a',1.5);}
    if(s.hat==='boonie'){oval(0,-47,16,4,'#667652');rr(-8,-57,16,11,4,'#7e8b5f');rr(-8,-50,16,3,0,'#515e43');}
    if(s.hat==='helmet'){oval(0,-49,10,9,'#657d68');rr(-10,-49,20,4,1,'#435e50');rr(-3,-56,6,3,1,'#96aa85');line([[-8,-46],[-7,-35]],'#54654c',1);}
    if(s.hat==='beret'){oval(-2,-54,11,6,'#965f56',-.15);rr(-8,-51,16,4,1,'#694d43');rr(3,-55,3,3,0,'#c6b879');}
    if(s.hat==='headband'){rr(-9,-49,18,3,0,'#a06d51');poly([[8,-48],[13,-46],[11,-38],[7,-44]],'#c2946a');}
    if(s.hat==='hood'){if(back)rr(-11,-57,22,27,9,'#596d57');else{g.strokeStyle='#6f8062';g.lineWidth=4;g.beginPath();g.arc(0,-44,12,Math.PI*.8,Math.PI*2.2);g.stroke();}}
    if(s.hat==='straw'){oval(0,-47,16,4,'#c9ae6f');rr(-7,-57,14,11,4,'#ddc588');rr(-7,-50,14,3,0,'#9d8052');for(const x of [-4,0,4])line([[x,-55],[x,-52]],'#c1a66b',.6);}
  }
  g.restore();
}
