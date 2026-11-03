export type WorldPhase = "pagi" | "siang" | "sore" | "malam";
export const WORLD_TIMEZONE = "Asia/Jakarta";
const dateFormat=new Intl.DateTimeFormat("id-ID",{timeZone:WORLD_TIMEZONE,day:"numeric",month:"short",year:"numeric"});
export function worldTime(epoch: number) {
  const local = new Date(epoch + 7 * 3600000);
  const hour = local.getUTCHours(), minute = local.getUTCMinutes(), second = local.getUTCSeconds();
  const phase: WorldPhase = hour >= 5 && hour < 11 ? "pagi" : hour >= 11 && hour < 15 ? "siang" : hour >= 15 && hour < 18 ? "sore" : "malam";
  return {phase, hour, minute, second, decimalHour:hour+minute/60+second/3600,
    clock:[hour,minute,second].map(n=>String(n).padStart(2,"0")).join(":"),
    date:dateFormat.format(epoch)};
}
// Continuous daily light curve: the scene fades through dawn and sunset rather than switching abruptly.
export function worldLight(epoch:number) {
  const h=((epoch/3600000+7)%24+24)%24;
  const keys=[{h:0,r:16,g:30,b:65,a:.57,lamps:1},{h:4.5,r:16,g:30,b:65,a:.57,lamps:1},{h:5.5,r:222,g:170,b:113,a:.2,lamps:.35},{h:7,r:255,g:224,b:162,a:.08,lamps:0},{h:11,r:255,g:247,b:209,a:.02,lamps:0},{h:15,r:239,g:185,b:114,a:.1,lamps:0},{h:17,r:216,g:135,b:94,a:.25,lamps:.25},{h:18.5,r:25,g:37,b:76,a:.5,lamps:1},{h:20,r:16,g:30,b:65,a:.57,lamps:1},{h:24,r:16,g:30,b:65,a:.57,lamps:1}];
  const i=keys.findIndex(k=>k.h>h),a=keys[i-1],b=keys[i],t=(h-a.h)/(b.h-a.h);
  const mix=(x:number,y:number)=>x+(y-x)*t;
  return {tint:"rgba("+[Math.round(mix(a.r,b.r)),Math.round(mix(a.g,b.g)),Math.round(mix(a.b,b.b)),mix(a.a,b.a)].join(",")+")",lamps:mix(a.lamps,b.lamps)};
}
