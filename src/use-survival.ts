import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "./survival-rules";

export function useSurvival(profileId: string | undefined, notify: (message: string) => void) {
  const [game, setGame] = useState<GameState | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const sequence = useRef(0), locked = useRef(false), notifyRef = useRef(notify); notifyRef.current = notify;
  const refreshGame = useCallback(async () => {
    if (locked.current) return;
    const seq = ++sequence.current;
    try { const r = await fetch("/api/game", { cache: "no-store" }); const d = await r.json() as GameState & { error?: string }; if (!r.ok) throw new Error(d.error || "Markas belum tersambung."); if (seq === sequence.current) { setGame({ ...d, clientReceivedAt: Date.now() }); setError(""); } }
    catch(e) { if (seq === sequence.current) setError(e instanceof Error ? e.message : "Markas belum tersambung."); }
  }, []);
  useEffect(() => {
    refreshGame(); const timer = setInterval(() => { if (!document.hidden) refreshGame(); }, 15000);
    const visible = () => { if (!document.hidden) refreshGame(); }; document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [refreshGame, profileId]);
  const ownJob = game?.jobs.find(j => j.id === game.activeJob);
  useEffect(() => {
    if (!ownJob || !game) return;
    const timer = setTimeout(refreshGame, Math.max(500, ownJob.endsAt - game.serverTime + 350));
    return () => clearTimeout(timer);
  }, [ownJob?.id, ownJob?.endsAt, game?.serverTime, refreshGame]);
  const act = useCallback(async (payload: Record<string, unknown>) => {
    if (locked.current) return; locked.current = true; sequence.current++; setBusy(true); setError("");
    try {
      const r = await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json() as { game: GameState; error?: string; message: string }; if (!r.ok) throw new Error(d.error || "Kegiatan belum tersimpan.");
      setGame({ ...d.game, clientReceivedAt: Date.now() }); notifyRef.current(d.message);
    } catch(e) { setError(e instanceof Error ? e.message : "Kegiatan belum tersimpan."); }
    finally { locked.current = false; setBusy(false); }
  }, []);
  return { game, error, busy, act, refreshGame };
}
