"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Map, Radio, IdCard, Hammer, UserRound, Plus, Minus, LocateFixed, ArrowUpRight, X, ArrowRight, Shield, Droplets, Package, Check, ChevronRight, Download, Copy, Edit3, Leaf, Footprints, HeartPulse, Wrench, Compass, Volume2, VolumeX, LoaderCircle, Users, Sun, Moon, Sunrise, Sunset, House, Eye, CheckCircle2 } from "lucide-react";
import { WorldEngine, type Survivor } from "./world-engine";
import SurvivalPanel from "./survival-panel";
import { useSurvival } from "./use-survival";
import CharacterCustomizer, { CharacterAvatar as Avatar } from "./character-avatar";
import { JACKETS,JACKET_LABELS,DEFAULT_STYLE,normalizeStyle,drawCharacter,type CharacterStyle } from "./character-style";

import { worldTime } from "./world-time";
import { useWorldClock } from "./use-world-clock";

type Tab = "peta" | "aksi" | "radio" | "kartu" | "rencana" | "akun";
type Profile = Survivor & { code: string; specialty: string; createdAt?: number };
type World = { count: number; registered: number; survivors: Survivor[]; votes: { pagar: number; air: number } };
type Selection = { kind: string; id?: string; name: string };
type MeResponse = { authenticated: boolean; profile: Profile | null; vote: string | null; error?: string; recoveryKey?: string };
const ROLES = [{ id: "perintis", name: "Perintis", icon: Compass, desc: "Mulai dari yang ada." }, { id: "penjaga", name: "Penjaga", icon: Shield, desc: "Mata untuk markas." }, { id: "perakit", name: "Perakit", icon: Wrench, desc: "Barang rusak, peluang baru." }, { id: "peramu", name: "Peramu", icon: Leaf, desc: "Paham apa yang tumbuh." }, { id: "penjelajah", name: "Penjelajah", icon: Footprints, desc: "Berani mencari jalan." }, { id: "medis", name: "Medis", icon: HeartPulse, desc: "Jaga satu sama lain." }];
const ACTIVITIES = [{ id: "jelajah", name: "Keliling lahan", icon: Footprints, desc: "Kenali jalan di sekitar markas." }, { id: "jaga", name: "Jaga perimeter", icon: Shield, desc: "Awasi batas lahan dari dalam." }, { id: "air", name: "Cek persediaan", icon: Package, desc: "Periksa meja persediaan bersama." }, { id: "istirahat", name: "Istirahat di teras", icon: House, desc: "Ambil napas sebelum melanjutkan." }];
const LOOKS = JACKETS;
const roleName = (id: string) => ROLES.find(r => r.id === id)?.name || "Penyintas";
const navs = [{ id: "peta" as Tab, label: "Peta", icon: Map }, { id: "aksi" as Tab, label: "Bertahan", icon: Shield }, { id: "kartu" as Tab, label: "Kartuku", icon: IdCard }, { id: "rencana" as Tab, label: "Rencana", icon: Hammer }, { id: "akun" as Tab, label: "Akun", icon: UserRound }];

function Brand() { return <div className="brand"><span className="brand-mark"><House size={25}/><span/></span><div>POS TERAKHIR<small>Tempat untuk mulai lagi.</small></div></div>; }

export default function Experience() {
  const canvas = useRef<HTMLCanvasElement>(null); const engine = useRef<WorldEngine | null>(null); const opener = useRef<HTMLElement | null>(null);
  const [tab, setTab] = useState<Tab>("peta"); const [profile, setProfile] = useState<Profile | null>(null); const [shared, setShared] = useState<Profile | null>(null);
  const [, setAuthenticated] = useState(false); const [world, setWorld] = useState<World>({ count: 1, registered: 0, survivors: [], votes: { pagar: 0, air: 0 } });
  const [loaded, setLoaded] = useState(false); const [error, setError] = useState(""); const [toast, setToast] = useState(""); const [busy, setBusy] = useState(false); const [editing, setEditing] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [formStyle,setFormStyle]=useState<CharacterStyle>({...DEFAULT_STYLE});
  function beginEdit(){if(!profile)return;open("kartu");setFormLook(profile.appearance);setFormRole(profile.role);setFormStyle(normalizeStyle(profile.customization));setEditing(true); }
  const [vote, setVote] = useState<string | null>(null); const [selected, setSelected] = useState<Selection | null>(null); const [labels, setLabels] = useState(true); const [sound, setSound] = useState(false); const [zoom, setZoom] = useState(1); const [formLook, setFormLook] = useState("amber"); const [formRole, setFormRole] = useState("perintis");
  const audioRef = useRef<AudioContext | null>(null); const soundNodes = useRef<OscillatorNode[]>([]);
  const totalVotes = world.votes.pagar + world.votes.air;
  const activeCard = shared || profile;
  function notify(message: string) { setToast(message); }
  const survival = useSurvival(profile?.id, notify);
  const worldNow=useWorldClock(survival.game?.serverTime,survival.game?.clientReceivedAt);
  const clock=worldTime(worldNow);
  const PhaseIcon=({pagi:Sunrise,siang:Sun,sore:Sunset,malam:Moon})[clock.phase];
  useEffect(()=>{engine.current?.setWorldTime(worldNow);},[worldNow]);
  const [focusCrew, setFocusCrew] = useState<string | undefined>();
  async function quickInteract(){
    if(!selected)return; if(!profile){open("kartu");return;}
    if(selected.kind==="crate" || selected.kind==="house"){play();return;}
    const kinds:Record<string,string>={wood:"chop",loot:"loot",zombie:"attack",plot:"build",water:"forage",fence:"build"};
    const peer=survival.game?.crew.find(p=>p.id===selected.id);
    const payload=selected.kind==="survivor" ? (peer?.activeJob ? {action:"help",jobId:peer.activeJob} : peer && peer.health<100 ? {action:"start",kind:"heal",targetId:peer.id} : {action:"emote",emote:"wave",targetId:selected.id}) : {action:"start",kind:kinds[selected.kind]};
    if(await survival.act(payload))close();else play(selected.kind==="survivor"?selected.id:undefined);
  }
  function play(targetId?: string) { setFocusCrew(targetId); open("aksi"); }
  function open(next: Tab) { opener.current = document.activeElement as HTMLElement; setSelected(null); setShared(null); setEditing(false); setTab(next); setError(""); }
  function close() { setTab("peta"); setSelected(null); setShared(null); setEditing(false); setError(""); setTimeout(() => opener.current?.focus(), 0); }
  async function refresh() {
    try {
      const [wr, mr] = await Promise.all([fetch("/api/world", { cache: "no-store" }), fetch("/api/me", { cache: "no-store" })]);
      const wd = await wr.json() as World & { error?: string }; const md = await mr.json() as MeResponse;
      if (!wr.ok) throw new Error(wd.error || "Radio belum tersambung.");
      if (!mr.ok) throw new Error(md.error || "Kartu belum tersambung.");
      setWorld(wd); setProfile(md.profile); setVote(md.vote); setAuthenticated(md.authenticated); setLoaded(true); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Koneksi terputus. Coba lagi."); }
  }
  useEffect(() => { refresh(); const interval = setInterval(refresh, 45000); return () => clearInterval(interval); }, []);
  useEffect(() => {
    if (!canvas.current) return;
    const w = new WorldEngine(canvas.current, { onSelect: item => { setSelected(item); setTab("peta"); }, onViewChange: z => setZoom(z) }); engine.current = w;
    return () => { w.destroy(); engine.current = null; };
  }, []);
  useEffect(() => {
    const list = profile ? [profile, ...world.survivors.filter(s => s.id !== profile.id)] : world.survivors;
    const crew = survival.game?.crew || [];
    const combined = [...list, ...crew.filter(p => !list.some(s => s.id === p.id)).map(p => ({...p, activity: "jelajah", joinedDay: 1}))];
    engine.current?.setSurvivors(combined.map(s => {
      const member = crew.find(p => p.id === s.id) || (survival.game?.me?.id === s.id ? survival.game.me : null);
      const job = survival.game?.jobs.find(j => j.id === member?.activeJob);
      return {...s, customization: member?.customization || s.customization, activity: job?.kind || s.activity};
    }), profile?.id);
    if (survival.game) engine.current?.setGameState(survival.game);
  }, [world.survivors, profile, survival.game]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3700); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (tab === "kartu") document.querySelector("#world-panel .panel-content")?.scrollTo({ top: 0, behavior: "instant" }); }, [profile?.id, editing, tab]);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("kartu");
    if (code) fetch(`/api/card?code=${encodeURIComponent(code)}`).then(async r => { const d = await r.json() as { profile: Profile; error?: string }; if (!r.ok) throw new Error(d.error); setShared(d.profile); setTab("kartu"); }).catch(e => notify(e.message));
  }, []);
  const panelOpen = tab !== "peta" || !!selected;
  useEffect(() => {
    if (!panelOpen) return;
    const dlg = document.getElementById("world-panel"); setTimeout(() => (dlg?.querySelector("button, input, a") as HTMLElement)?.focus(), 30);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && dlg) { const els = [...dlg.querySelectorAll<HTMLElement>('button:not([disabled]),input,select,a[href]')]; const first = els[0], last = els[els.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    }; document.addEventListener("keydown", handler); return () => document.removeEventListener("keydown", handler);
  }, [panelOpen, tab, editing]);
  async function mutate(payload: Record<string, unknown>, message: string) {
    setBusy(true); setError("");
    try { const response = await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json() as MeResponse; if (!response.ok) throw new Error(data.error || "Belum berhasil disimpan."); setProfile(data.profile); setVote(data.vote); setAuthenticated(data.authenticated); if (data.recoveryKey) setRecoveryKey(data.recoveryKey); setEditing(false); await refresh(); await survival.refreshGame(); notify(message); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "Belum berhasil disimpan."); return false; } finally { setBusy(false); }
  }
  async function submitCard(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); await mutate({ name: f.get("name"), specialty: f.get("specialty"), role: formRole, appearance: formLook, customization: formStyle }, profile ? "Kartu penyintas diperbarui." : "Selamat datang. Kamu sudah jadi bagian dari markas."); }
  async function recoverCard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError("");
    try {
      const r = await fetch("/api/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recoveryKey: f.get("recoveryKey") }) });
      const d = await r.json() as MeResponse; if (!r.ok) throw new Error(d.error || "Pemulihan gagal.");
      setProfile(d.profile); setVote(d.vote); setAuthenticated(true); await refresh(); open("kartu"); notify("Kartu penyintas berhasil dipulihkan.");
    } catch (e) { setError(e instanceof Error ? e.message : "Pemulihan gagal."); } finally { setBusy(false); }
  }
  function saveRecovery() {
    if (!recoveryKey || !profile) return;
    const blob = new Blob([`POS TERAKHIR — KUNCI PEMULIHAN PRIBADI\n\nKartu: ${profile.code}\nKunci: ${recoveryKey}\n\nSitus: ${window.location.origin}\nGunakan menu Akun untuk membuka karakter di perangkat lain.\nJangan bagikan file ini; pemegang kunci dapat mengubah karaktermu.\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `Kunci-Pribadi-${profile.code}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function findMe() { if (!profile) { open("kartu"); return; } close(); engine.current?.focusSurvivor(profile.id); notify(`Menemukan ${profile.name} di peta.`); }
  async function copyLink() {
    if (!activeCard) return;
    const url = `${window.location.origin}/?kartu=${activeCard.code}`;
    try { if (navigator.share) await navigator.share({ title: `Kartu Penyintas ${activeCard.name}`, text: "Aku bergabung di Pos Terakhir. Kita mulai lagi, bersama.", url }); else { await navigator.clipboard.writeText(url); notify("Link kartu disalin."); } }
    catch (e) { if (!(e instanceof Error && e.name === "AbortError")) notify("Belum bisa membagikan. Coba lagi."); }
  }
  function downloadCard() {
    if (!activeCard) return; const p = activeCard; const c = document.createElement("canvas"); c.width = 1000; c.height = 1300; const g = c.getContext("2d"); if (!g) return;
    g.fillStyle = "#f8f2df"; g.fillRect(0, 0, 1000, 1300); g.fillStyle = "#183e34"; g.fillRect(0, 0, 1000, 245); g.fillRect(0, 1180, 1000, 120); g.strokeStyle = "#c49c58"; g.lineWidth = 8; g.strokeRect(28, 28, 944, 1244);
    g.textAlign = "center"; g.fillStyle = "#fff4d8"; g.font = "800 55px Segoe UI, sans-serif"; g.fillText("KARTU PENYINTAS", 500, 112); g.fillStyle = "#f0be71"; g.font = "700 29px Segoe UI, sans-serif"; g.fillText("POS TERAKHIR  /  DAY 01", 500, 174);
    g.fillStyle = "#dce6cc"; g.beginPath(); g.arc(500, 447, 155, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(500,580); g.scale(4.5,4.5); drawCharacter(g,{look:p.appearance,style:p.customization,facing:"front"}); g.restore();
    g.textAlign = "left"; let y = 680;
    for (const [label, value] of [["KODE PENYINTAS", p.code], ["NAMA PANGGILAN", p.name], ["PERAN DI MARKAS", p.specialty || roleName(p.role)], ["BERGABUNG SEJAK", `DAY ${String(p.joinedDay).padStart(2, "0")}`]]) { g.fillStyle = "#7a805f"; g.font = "700 21px Segoe UI, sans-serif"; g.fillText(label, 90, y); g.fillStyle = "#183e34"; g.font = "800 42px Segoe UI, sans-serif"; let size = 42; while (g.measureText(value).width > 815) { size--; g.font = `800 ${size}px Segoe UI, sans-serif`; } g.fillText(value, 90, y + 52); y += 120; }
    g.textAlign = "center"; g.fillStyle = "#fff4d8"; g.font = "700 27px Segoe UI, sans-serif"; g.fillText("Kita mulai lagi, bersama.", 500, 1251); const a = document.createElement("a"); a.download = `Kartu-Penyintas-${p.code}.png`; a.href = c.toDataURL("image/png"); a.click(); notify("Kartu penyintas diunduh.");
  }
  function toggleSound() {
    if (sound) { soundNodes.current.forEach(n => n.stop()); soundNodes.current = []; audioRef.current?.close(); audioRef.current = null; setSound(false); return; }
    try { const ac = new AudioContext(); audioRef.current = ac; const gain = ac.createGain(); gain.gain.value = .007; gain.connect(ac.destination); for (const f of [146.83, 220]) { const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = f; o.connect(gain); o.start(); soundNodes.current.push(o); } setSound(true); } catch { notify("Suara belum tersedia di perangkat ini."); }
  }
  useEffect(() => () => { soundNodes.current.forEach(n => n.stop()); audioRef.current?.close(); }, []);

  const cardForm = <form onSubmit={submitCard} className="join-form">
    <p className="muted">Pilih peran dan penampilanmu. Semua pilihan tersimpan bersama kartu.</p>
    <label>Nama panggilan<input autoComplete="nickname" name="name" placeholder="Kamu dipanggil siapa?" defaultValue={profile?.name || ""} minLength={2} maxLength={24} required/><span className="field-help">Tampil di peta. Pakai nama panggilanmu.</span></label>
    <fieldset><legend>Pilih peranmu</legend><div className="role-grid">{ROLES.map(r => <button key={r.id} type="button" className={formRole === r.id ? "role-option chosen" : "role-option"} onClick={() => setFormRole(r.id)} aria-pressed={formRole === r.id}><r.icon size={21}/><strong>{r.name}</strong><small>{r.desc}</small></button>)}</div></fieldset>
    <label>Sebutan di markas <span className="optional">opsional</span><input name="specialty" defaultValue={profile?.specialty || ""} placeholder="Mis. Kepala Divisi Cek Kaleng" maxLength={32}/></label>
    <fieldset><legend>Warna jaketmu</legend><div className="swatches">{Object.entries(LOOKS).map(([key, color]) => <button key={key} type="button" style={{ background: color }} className={formLook === key ? "swatch chosen" : "swatch"} onClick={() => setFormLook(key)} title={JACKET_LABELS[key]} aria-label={`Jaket ${key}`} aria-pressed={formLook === key}>{formLook === key && <Check size={19}/>}</button>)}</div><small className="fine-print">{JACKET_LABELS[formLook]} · 12 pilihan warna</small></fieldset>
    <CharacterCustomizer value={formStyle} onChange={setFormStyle} look={formLook}/>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <button className="button primary wide" disabled={busy || !loaded}>{busy ? <LoaderCircle className="spin" size={20}/> : <IdCard size={20}/>} {editing ? "Simpan perubahan" : "Terbitkan kartu penyintas"}</button>
    <p className="fine-print">Gratis, tanpa login. Akses kartumu tersimpan di browser ini selama 180 hari. Simpan kunci pemulihan setelah bergabung untuk membukanya di perangkat lain.</p>
  </form>;
  useEffect(() => { if (loaded && new URLSearchParams(window.location.search).has("gabung")) setTab("kartu"); }, [loaded]);

  return <main className="app-shell">
    <header className="topbar"><Brand/><div className="episode-pill"><span/> DAY 01 <b>Awal kehidupan baru</b></div><div className="world-clock" data-phase={clock.phase} title="Waktu markas: WIB (UTC+7). Pagi 05–11, siang 11–15, sore 15–18, malam 18–05."><PhaseIcon size={19}/><div><time dateTime={new Date(worldNow).toISOString()}>{clock.clock}<small>WIB</small></time><span>{clock.phase} · {clock.date}</span></div></div><div className="topbar-right"><button className="desktop-profile" onClick={() => open("kartu")}><Avatar look={profile?.appearance} customization={profile?.customization}/><span>{profile?.name || "Jadi penyintas"}</span><ChevronRight size={16}/></button></div></header>
    <div className="workspace">
      <aside className="journal-sidebar"><div className="journal-main"><div className="section-label"><span className="status-dot"/> CATATAN HARI PERTAMA</div><h1>Kita mulai lagi.<br/><em>Bersama.</em></h1><p className="intro-copy">Satu rumah. Lahan kosong.<br/>Dan kesempatan untuk hidup lagi.</p>
        <div className="population"><div className="population-icon"><Users size={24}/></div><div><strong>{loaded ? world.count.toLocaleString("id-ID") : "—"}</strong><span>penyintas di dunia ini</span></div><span className="live-mark">DAY 1</span></div>
        <div className="supply-block"><div className="mini-heading">YANG KITA PUNYA <Package size={15}/></div><div className="supply-row"><span><span className="tin-icon"/> Makanan</span><b>{survival.game?.camp.food ?? 2} kaleng</b></div><div className="supply-row"><span><Droplets size={17}/> Air minum</span><b>{survival.game?.camp.water ?? 1} botol</b></div><div className="supply-row"><span><House size={17}/> Tempat tinggal</span><b>1 rumah</b></div></div>
        <div className="journal-note"><span>01</span><p>“Kalau kamu masih di luar sana, kamu nggak harus sendirian.”</p></div>
        <button className="button primary wide" onClick={() => open("kartu")}>{profile ? "Buka kartu penyintas" : "Ikut bertahan"}<ArrowRight size={19}/></button>
        <button className="text-link" onClick={() => play()}>Mulai kegiatan survival <ArrowUpRight size={15}/></button>
      </div><div className="sidebar-footer"><div className="section-label">JELAJAHI MARKAS</div><nav aria-label="Navigasi desktop">{navs.map(n => <button key={n.id} className={tab === n.id ? "side-nav active" : "side-nav"} onClick={() => n.id === "peta" ? close() : open(n.id)}><n.icon size={19}/>{n.label}<ChevronRight size={15}/></button>)}</nav><div className="sidebar-small">Pos Terakhir <span>•</span> Dunia yang kita bangun bersama.</div></div></aside>
      <section className="map-stage" aria-label="Peta interaktif Pos Terakhir"><canvas ref={canvas} aria-label="Peta markas. Geser untuk menjelajah, gunakan tombol plus dan minus untuk memperbesar."/>
        <div className="mobile-pop"><span className="status-dot"/><div><strong>{loaded ? world.count.toLocaleString("id-ID") : "—"}</strong><span>penyintas</span></div><small>DAY 01</small></div>
        <button className="map-game-hud" onClick={() => play()}><Shield size={18}/><span><strong>{survival.game?.camp.raidDeadline ? "Markas diserang!" : "Bertahan bersama"}</strong><small>{survival.game ? `${survival.game.camp.wood} kayu · ${survival.game.camp.scrap} scrap · Markas ${survival.game.camp.integrity}%` : "Sambungkan radio markas"}</small></span><ArrowRight size={17}/></button>
        <div className="map-caption"><span className="tiny-cross">+</span><span>LAHAN PERTAMA<strong>Pos Terakhir</strong></span></div>
        <div className="map-tools"><div className="zoom-stack"><button onClick={() => engine.current?.zoomBy(1.22)} aria-label="Perbesar peta"><Plus size={23}/></button><button onClick={() => engine.current?.zoomBy(.82)} aria-label="Perkecil peta"><Minus size={23}/></button></div><button className="tool-button" onClick={() => engine.current?.resetView()} aria-label="Pusatkan peta"><LocateFixed size={21}/></button><button className={`tool-button ${labels ? "is-on" : ""}`} aria-label="Tampilkan atau sembunyikan nama" aria-pressed={labels} onClick={() => { setLabels(!labels); engine.current?.setLabels(!labels); }}><Eye size={20}/></button></div>
        <div className="map-bottom"><div className="map-hint"><span className="status-dot"/> Geser untuk menjelajah <span className="hint-dot">·</span> Klik untuk mengenal markas</div><div className="map-bottom-actions"><button onClick={toggleSound} aria-label={sound ? "Matikan ambience" : "Nyalakan ambience"} title="Suara markas">{sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button><button className="find-me" onClick={findMe}><LocateFixed size={17}/>{profile ? "Temukan aku" : "Gabung markas"}</button></div></div>
        {error && !panelOpen && <div className="connection-note" role="status"><Radio size={17}/><span>{error}</span><button onClick={refresh}>Coba lagi</button></div>}
        {!loaded && !error && <div className="connection-note"><LoaderCircle size={17} className="spin"/> Menyambungkan radio markas…</div>}
        <div className="map-vignette" aria-hidden="true"/>
      </section>
    </div>
    <nav className="mobile-nav" aria-label="Navigasi utama">{navs.map(n => <button key={n.id} className={tab === n.id && !selected ? "active" : ""} onClick={() => n.id === "peta" ? close() : open(n.id)} aria-current={tab === n.id ? "page" : undefined}><n.icon size={23}/><span>{n.label}</span>{n.id === "radio" && <i/>}</button>)}</nav>
    {panelOpen && <><div className="panel-backdrop" onClick={close}/><section id="world-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" className={`detail-panel ${tab === "kartu" ? "card-panel" : ""}`}><div className="sheet-handle"/><div className="panel-heading"><div><span className="eyebrow">POS TERAKHIR / DAY 01</span><h2 id="panel-title">{selected ? selected.name : tab === "kartu" ? (activeCard && !editing ? "Kartu penyintas" : editing ? "Kustomisasi karakter" : "Ada tempat untukmu.") : tab === "aksi" ? "Bertahan bersama" : tab === "radio" ? "Kabar dari markas" : tab === "rencana" ? "Langkah berikutnya" : "Diri kamu di dunia ini"}</h2></div><button className="close-button" onClick={close} aria-label="Tutup panel"><X size={22}/></button></div>
      <div className="panel-content">
      {!selected && tab === "aksi" && <SurvivalPanel game={survival.game} busy={survival.busy} error={survival.error} onAction={async payload=>{await survival.act(payload);}} onJoin={() => open("kartu")} onRadio={() => open("radio")} onFocusArga={()=>{close();engine.current?.focusSurvivor("arga");}} targetId={focusCrew}/>}
      {selected && <SelectionContent selected={selected} onJoin={() => open("kartu")} onVote={() => play(selected.kind === "survivor" && selected.id !== "arga" ? selected.id : undefined)} profile={profile} onQuick={quickInteract} quickBusy={survival.busy} quickLabel={selected.kind==="survivor" ? (survival.game?.crew.find(p=>p.id===selected.id)?.activeJob ? "Bantu kegiatan teman" : (survival.game?.crew.find(p=>p.id===selected.id)?.health ?? 100)<100 ? "Rawat penyintas ini" : "Sapa penyintas ini") : ({wood:"Mulai menebang di sini",loot:"Mulai looting",zombie:"Lawan zombie ini",plot:"Perkuat pagar markas",water:"Cari tambahan air",fence:"Perkuat pagar markas"} as Record<string,string>)[selected.kind]}/>}
      {!selected && tab === "kartu" && <>{activeCard && !editing ? <><div className="success-note"><CheckCircle2 size={19}/>{shared ? "Kamu sedang melihat kartu penyintas." : "Kamu bagian dari tempat ini."}</div>{!shared && recoveryKey && <div className="recovery-box"><Shield size={22}/><h3>Simpan jalan pulangmu.</h3><p>Kunci ini hanya ditampilkan setelah pendaftaran. Simpan sekarang. Siapa pun yang memegangnya bisa membuka dan mengubah karaktermu.</p><label>Kunci pemulihan pribadi<input readOnly value={recoveryKey} onFocus={e => e.currentTarget.select()}/></label><button className="button secondary wide" onClick={saveRecovery}><Download size={18}/> Simpan kunci pribadi</button><small>Jangan tampilkan kunci ini dalam screenshot atau postingan.</small></div>}<div className="survivor-card"><div className="card-head"><span className="card-seal"><House size={21}/></span><strong>KARTU PENYINTAS</strong><small>POS TERAKHIR</small></div><div className="card-body"><div className="avatar-medallion"><Avatar look={activeCard.appearance} customization={activeCard.customization} large/></div><dl><div><dt>KODE PENYINTAS</dt><dd className="code">{activeCard.code}</dd></div><div><dt>NAMA PANGGILAN</dt><dd>{activeCard.name}</dd></div><div><dt>PERAN DI MARKAS</dt><dd>{activeCard.specialty || roleName(activeCard.role)}</dd></div><div className="card-last"><div><dt>BERGABUNG SEJAK</dt><dd>DAY {String(activeCard.joinedDay).padStart(2, "0")}</dd></div><span className="stamp"><Check size={25}/> TERHUBUNG</span></div></dl></div><div className="card-foot">Kita mulai lagi, bersama.</div></div>
        <div className="card-actions">{!shared && <button className="button primary wide" onClick={findMe}><LocateFixed size={19}/> Lihat karakterku</button>}<button className="button secondary wide" onClick={downloadCard}><Download size={18}/> Simpan kartu</button><button className="button quiet wide" onClick={copyLink}><Copy size={17}/> Bagikan kartu penyintas</button></div>
        {!shared && <><div className="divider"/><h3>Saat ini aku…</h3><p className="muted">Pilih aktivitas karaktermu di sekitar markas.</p><div className="activity-list">{ACTIVITIES.map(a => <button disabled={busy} key={a.id} className={profile?.activity === a.id ? "activity selected" : "activity"} onClick={() => mutate({ action: "activity", activity: a.id }, `Aktivitas diubah: ${a.name}.`)}><a.icon size={21}/><span><b>{a.name}</b><small>{a.desc}</small></span>{profile?.activity === a.id && <Check size={18}/>}</button>)}</div><button className="text-link edit-link" onClick={beginEdit}><Edit3 size={15}/> Kustomisasi karakter & kartu</button></>}
      </> : <><p className="panel-intro">{editing ? "Atur penampilanmu. Perubahan ikut tampil di peta dan kartu penyintas." : "Kita belum punya banyak. Tapi kamu nggak perlu bertahan sendirian. Buat karaktermu dan mulai hidup di markas."}</p>{cardForm}</>}</>}
      {!selected && tab === "radio" && <><div className="radio-story"><span className="chapter">SIARAN 002 <span className="status-dot"/></span><h3>Hasil voting kemarin:<br/><em>Pagar perimeter berdiri!</em></h3><p>Penyintas sepakat memprioritaskan pertahanan. Lahan kini telah dikelilingi pagar kayu kokoh dengan gerbang utama di sisi depan. Kerusakan dari serbuan zombie berkurang drastis.</p><span className="story-signature">— Perintis pertama</span></div><h3>Keadaan markas</h3><div className="fact-list"><span><House size={18}/> Rumah pertama terlindungi <Check size={17}/></span><span><Shield size={18}/> Pagar perimeter Lv.{survival.game?.camp.fenceLevel ?? 2} (Diperkuat) <Check size={17}/></span><span><Package size={18}/> Makanan tersedia {survival.game?.camp.food ?? 2} kaleng</span><span><Droplets size={18}/> Air minum tersedia {survival.game?.camp.water ?? 1} botol</span></div><div className="warning-note"><Shield size={20}/><p><strong>Pagar perimeter aktif.</strong> Terus perkuat pagar dan bersiap menghadapi gelombang zombie berikutnya melalui menu Bertahan.</p></div><button className="button primary wide" onClick={() => open("rencana")}>Bantu tentukan langkah kita <ArrowRight size={18}/></button><p className="fine-print">Day mengikuti perkembangan episode, bukan pergantian tanggal. Markas akan tumbuh bersama cerita.</p></>}
      {!selected && tab === "rencana" && <><div className="vote-winner-banner"><span className="winner-badge"><Shield size={15}/> HASIL VOTING KEMARIN</span><strong>Pagar Perimeter Menang Mutlak!</strong><p>Pagar perimeter kini telah didirikan dan diperkuat mengelilingi markas. Kamu bisa terus meningkatkan level pagar melalui menu Bertahan.</p></div><p className="panel-intro">Pagar sudah berdiri kokoh. Apa yang paling mendesak untuk langkah selanjutnya?</p><div className="vote-choices">{[{ id: "pagar", title: "Perkuat pagar & barikade", icon: Shield, desc: "Tingkatkan ketahanan pagar perimeter dan pasang penguat besi.", cost: "Butuh kayu, alat, dan tenaga." }, { id: "air", title: "Cari sumber air bersih", icon: Droplets, desc: "Satu botol nggak akan cukup untuk kita semua. Siapkan suplai air.", cost: "Butuh penjelajahan dan persiapan." }].map(v => <button key={v.id} className={`vote-card ${vote === v.id ? "chosen" : ""}`} disabled={busy} onClick={() => profile ? mutate({ action: "vote", choice: v.id }, "Pilihanmu sudah tercatat.") : open("kartu")}><span className="vote-icon"><v.icon size={27}/></span><div><span className="eyebrow">{v.id === "pagar" ? "PERLINDUNGAN" : "KEBUTUHAN DASAR"}</span><h3>{v.title}</h3><p>{v.desc}</p><small>{v.cost}</small></div><span className="choice-check">{vote === v.id ? <Check size={16}/> : <Plus size={16}/>}</span></button>)}</div><div className="vote-tally"><div className="mini-heading">SUARA PENYINTAS <span>{totalVotes} suara</span></div>{totalVotes === 0 ? <p className="muted">Belum ada suara. Jadilah yang pertama menentukan arah.</p> : ["pagar", "air"].map(k => { const n = world.votes[k as "pagar" | "air"]; return <div className="tally-row" key={k}><div><span>{k === "pagar" ? "Perkuat Pagar" : "Sumber Air"}</span><b>{n} suara</b></div><div className="tally-track"><span style={{ width: `${n / totalVotes * 100}%` }}/></div></div>; })}</div><p className="fine-print">Satu penyintas, satu pilihan. Kamu bisa mengganti pilihanmu. Voting menjadi masukan cerita berikutnya. Pembangunan pagar di web berjalan lewat bahan dan tenaga di menu Bertahan.</p>{!profile && <button className="button primary wide" onClick={() => open("kartu")}>Gabung untuk ikut memilih <ArrowRight size={18}/></button>}{error && <p className="inline-error">{error}</p>}</>}
      {!selected && tab === "akun" && <>{profile ? <><div className="account-hero"><Avatar look={profile.appearance} customization={profile.customization}/><div><h3>{profile.name}</h3><span>{roleName(profile.role)} · Day {profile.joinedDay}</span></div><span className="account-connected"><Check size={14}/> Tersimpan</span></div><button className="setting-row" onClick={beginEdit}><Edit3 size={21}/><span>Kustomisasi karakter<small>Rambut, topi, kulit, aksesori, dan tas</small></span><ChevronRight size={17}/></button><button className="setting-row" onClick={() => open("kartu")}><IdCard size={21}/><span>Kartu penyintas<small>{profile.code}</small></span><ChevronRight size={17}/></button><button className="setting-row" onClick={findMe}><LocateFixed size={21}/><span>Temukan karakterku<small>Kembali ke posisimu di peta</small></span><ChevronRight size={17}/></button><div className="account-note"><Shield size={22}/><div><strong>Akses kartu ada di browser ini.</strong><p>Gunakan kunci pemulihan pribadimu melalui menu Akun di perangkat baru. Kode kartu untuk berbagi hanya membuka tampilan kartu. Simpan kunci sebelum menutup halaman pendaftaran.</p></div></div></> : <><div className="empty-state"><div className="empty-illustration"><Avatar/></div><h3>Kisahmu belum dimulai.</h3><p>Satu kartu, satu karakter, dan tempat untukmu di markas.</p></div><button className="button primary wide" onClick={() => open("kartu")}>Buat kartu penyintas <ArrowRight size={18}/></button></>}
        {!profile && <form className="join-form recovery-form" onSubmit={recoverCard}><div className="divider"/><h3>Sudah jadi penyintas?</h3><p className="muted">Buka karakter lama dengan kunci pemulihan pribadi yang kamu simpan.</p><label>Kunci pemulihan<input name="recoveryKey" autoComplete="off" minLength={48} maxLength={48} required placeholder="48 karakter dari file kunci pribadi"/></label><button className="button secondary wide" disabled={busy}>{busy ? "Membuka…" : "Pulihkan karaktermu"}</button>{error && <p className="inline-error" role="alert">{error}</p>}</form>}<div className="divider"/><h3>Pengaturan peta</h3><button className="setting-row" onClick={() => { setLabels(!labels); engine.current?.setLabels(!labels); }}><Eye size={21}/><span>Nama di peta<small>Tampilkan nama karakter</small></span><span className={`toggle ${labels ? "on" : ""}`}/></button><button className="setting-row" onClick={toggleSound}>{sound ? <Volume2 size={21}/> : <VolumeX size={21}/>}<span>Suara markas<small>Ambience pelan, tanpa autoplay</small></span><span className={`toggle ${sound ? "on" : ""}`}/></button><p className="fine-print">Pos Terakhir adalah dunia fiksi dari serial animasi. Karakter yang terlihat bergantian agar peta tetap nyaman dijelajahi.</p></>}
      </div></section></>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={19}/>{toast}</div>}
  </main>;
}

function SelectionContent({ selected, onJoin, onVote, profile, onQuick, quickLabel, quickBusy }: { selected: Selection; onJoin: () => void; onVote: () => void; profile: Profile | null; onQuick:()=>Promise<void>; quickLabel?:string; quickBusy:boolean }) {
  const info: Record<string, { icon: typeof House; label: string; description: string; detail: string }> = {
    wood: { icon: Hammer, label: "BAHAN BANGUNAN", description: "Tebang kayu bersama teman. Perintis dan perakit menghasilkan lebih banyak; perkakas markas memberi bonus hasil.", detail: "30 detik · 12 energi · Hasil untuk gudang bersama" },
    loot: { icon: Package, label: "PENCARIAN SUPLAI", description: "Jelajahi reruntuhan untuk makanan dan scrap. Penjelajah lebih mudah menemukan peti suplai dan pulang dengan luka lebih ringan.", detail: "40 detik · 16 energi · Ada risiko luka ringan" },
    house: { icon: House, label: "TEMPAT BERLINDUNG", description: "Rumah pertama kita. Catnya pudar, beberapa jendela ditutup papan, tapi pintunya masih bisa melindungi kita malam ini.", detail: "1 rumah · Listrik belum tersedia" },
    crate: { icon: Package, label: "KOTAK PERSEDIAAN", description: "Hasil menebang, looting, dan meramu semua penyintas masuk ke gudang yang sama. Bahan ini dipakai untuk membangun dan merawat teman.", detail: "Buka Bertahan → Markas untuk melihat stok bersama" },
    radio: { icon: Radio, label: "PENGHUBUNG PENYINTAS", description: "Kalau kamu masih di luar sana dan mendengar siaran ini, kamu tidak perlu bertahan sendirian.", detail: "Siaran 001 · Ada tempat untukmu" },
    water: { icon: Droplets, label: "PERSEDIAAN AWAL", description: "Persediaan awal sudah menjadi gudang bersama. Cari air dan looting untuk menambah stok, lalu gunakan untuk bertahan dan membantu teman.", detail: "Stok terkini ada di Bertahan → Markas" },
    plot: { icon: Hammer, label: "PROYEK PERKUATAN MARKAS", description: "Pagar perimeter sudah berdiri. Terus kumpulkan kayu dan scrap untuk memperkuat pertahanan dari gelombang serangan.", detail: "Perkuat pagar melalui menu Bertahan" },
    fence: { icon: Shield, label: "PAGAR & GERBANG PERIMETER", description: "Pagar pertahanan hasil voting bersama kemarin. Mengelilingi markas, menahan serbuan zombie di luar lahan, dan melindungi rumah.", detail: "Perkuat pagar untuk meningkatkan ketahanan dan level pertahanan markas" },
    zombie: { icon: Shield, label: "ANCAMAN DI LUAR LAHAN", description: "Mereka terlihat di dekat pagar lama yang rusak. Tetap di dalam lahan dan jangan menjelajah sendirian.", detail: "Perlindungan markas masih terbatas" },
    survivor: { icon: UserRound, label: "PENYINTAS", description: `${selected.name} adalah bagian dari dunia Pos Terakhir. Kita punya jalan masing-masing, tapi tujuan yang sama: hidup lagi.`, detail: "Beraktivitas di sekitar markas" },
  }; const item = info[selected.kind] || info.plot;
  return <><div className={`object-hero ${selected.kind}`}><item.icon size={57}/><span>DAY 01</span></div><span className="eyebrow">{item.label}</span><p className="object-description">{item.description}</p><div className="object-detail">{item.detail}</div>{quickLabel && selected.id!=="arga" && <button className="button primary wide object-quick" disabled={quickBusy} onClick={onQuick}>{quickBusy?"Menghubungkan…":profile?quickLabel:"Bergabung untuk berinteraksi"}<ArrowRight size={18}/></button>}<button className="button primary wide" onClick={selected.kind === "radio" && !profile ? onJoin : onVote}>{selected.kind === "radio" && !profile ? "Bergabung jadi penyintas" : selected.kind === "survivor" ? "Bantu & sapa penyintas" : "Buka kegiatan survival"}<ArrowRight size={18}/></button></>;
}
