import { useEffect,useRef,useState } from "react";
export function useWorldClock(serverTime?:number,receivedAt?:number) {
  const anchor=useRef({epoch:Date.now(),mono:performance.now()});
  const [now,setNow]=useState(anchor.current.epoch);
  useEffect(()=>{if(serverTime){anchor.current={epoch:serverTime,mono:performance.now()};setNow(serverTime);}},[serverTime,receivedAt]);
  useEffect(()=>{const update=()=>setNow(anchor.current.epoch+performance.now()-anchor.current.mono);const timer=setInterval(update,1000);document.addEventListener("visibilitychange",update);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",update);};},[]);
  return now;
}
