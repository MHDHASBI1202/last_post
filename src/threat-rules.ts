export const ZOMBIE_HP=16;
export const ARGA_DAMAGE=2;
export const ARGA_INTERVAL_MS=12000;
export const ARGA_TRAVEL_MS=20000;
export function waveZombieCount(players:number){return 1+Math.min(23,Math.floor(Math.max(0,players)/3));}
export function maxDefendersCount(players:number){return Math.min(12,2+Math.floor(Math.max(0,players)/3));}
export function visibleZombieCount(hp:number){return Math.min(24,Math.ceil(Math.max(0,hp)/ZOMBIE_HP));}
export function zombiePosition(index:number,raiding=false){return{x:-4.5+(index%8)*1.3,y:(raiding?-7.1:-8.15)-Math.floor(index/8)*.9};}
