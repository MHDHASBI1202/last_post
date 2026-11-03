export type WorldPoint={x:number;y:number};
const STEP=.5,BOUND=10;
export function walkable(p:WorldPoint,fence:boolean) {
  if(Math.abs(p.x)>BOUND || Math.abs(p.y)>BOUND)return false;
  if(p.x>=-2.65 && p.x<=2.65 && p.y>=-3.45 && p.y<=1.45)return false;
  if(fence){if(Math.abs(Math.abs(p.x)-6.5)<.2 && Math.abs(p.y)<=6.5)return false;if(Math.abs(p.y+6.5)<.2 && Math.abs(p.x)<=6.5)return false;if(Math.abs(p.y-6.5)<.2 && Math.abs(p.x)<=6.5 && Math.abs(p.x)>1.25)return false;}
  return true;
}
export function findRoute(start:WorldPoint,target:WorldPoint,fence=false):WorldPoint[] {
  const snap=(p:WorldPoint)=>({x:Math.round(p.x/STEP)*STEP,y:Math.round(p.y/STEP)*STEP});
  const a=snap(start),b=snap(target),key=(p:WorldPoint)=>`${p.x},${p.y}`;
  if(!walkable(b,fence))return [];
  const open=[{p:a,g:0,f:Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}],cost=new Map([[key(a),0]]),parents=new Map<string,WorldPoint>();let visits=0;
  while(open.length && visits++<2000){open.sort((u,v)=>u.f-v.f);const {p,g}=open.shift()!;
    if(key(p)===key(b)){const route=[b];let cur=b;while(key(cur)!==key(a)){cur=parents.get(key(cur))!;if(!cur)return [];route.unshift(cur);}return [start,...route.slice(1),target].filter((p,i,list)=>i===0 || Math.hypot(p.x-list[i-1].x,p.y-list[i-1].y)>.01);}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {const next={x:p.x+dx*STEP,y:p.y+dy*STEP};if(!walkable(next,fence))continue;if(dx&&dy&&(!walkable({x:p.x+dx*STEP,y:p.y},fence)||!walkable({x:p.x,y:p.y+dy*STEP},fence)))continue;const ng=g+Math.hypot(dx,dy)*STEP,k=key(next);if(ng>=(cost.get(k)??Infinity))continue;cost.set(k,ng);parents.set(k,p);open.push({p:next,g:ng,f:ng+Math.hypot(next.x-b.x,next.y-b.y)});}
  }return [];
}
export function routeDistance(route:WorldPoint[]){return route.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-route[i].x,p.y-route[i].y),0);}
export function followRoute(route:WorldPoint[],distance:number):WorldPoint {if(!route.length)return {x:0,y:4};for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(distance<=length){const t=length?Math.max(0,distance)/length:1;return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}distance-=length;}return route[route.length-1];}
