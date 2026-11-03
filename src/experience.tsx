"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Map, Radio, IdCard, Hammer, UserRound, Plus, Minus, LocateFixed, ArrowUpRight, X, ArrowRight, Shield, Droplets, Package, Check, ChevronRight, Download, Copy, Edit3, Leaf, Footprints, HeartPulse, Wrench, Compass, Volume2, VolumeX, LoaderCircle, Users, Sun, House, Eye, CheckCircle2 } from "lucide-react";
import { WorldEngine, type Survivor } from "./world-engine";

type Tab = "peta" | "radio" | "kartu" | "rencana" | "akun";
type Profile = Survivor & { code: string; specialty: string; createdAt?: number };
type World = { count: number; registered: number; survivors: Survivor[]; votes: { pagar: number; air: number } };
type Selection = { kind: string; id?: string; name: string };
type MeResponse = { authenticated: boolean; profile: Profile | null; vote: string | null; error?: string; recoveryKey?: string };
const ROLES = [{ id: "perintis", name: "Perintis", icon: Compass, desc: "Mulai dari yang ada." }, { id: "penjaga", name: "Penjaga", icon: Shield, desc: "Mata untuk markas." }, { id: "perakit", name: "Perakit", icon: Wrench, desc: "Barang rusak, peluang baru." }, { id: "peramu", name: "Peramu", icon: Leaf, desc: "Paham apa yang tumbuh." }, { id: "penjelajah", name: "Penjelajah", icon: Footprints, desc: "Berani mencari jalan." }, { id: "medis", name: "Medis", icon: HeartPulse, desc: "Jaga satu sama lain." }];
const ACTIVITIES = [{ id: "jelajah", name: "Keliling lahan", icon: Footprints, desc: "Kenali jalan di sekitar markas." }, { id: "jaga", name: "Jaga perimeter", icon: Shield, desc: "Awasi batas lahan dari dalam." }, { id: "air", name: "Cek persediaan", icon: Package, desc: "Periksa meja persediaan bersama." }, { id: "istirahat", name: "Istirahat di teras", icon: House, desc: "Ambil napas sebelum melanjutkan." }];
const LOOKS: Record<string, string> = { amber: "#dca34d", teal: "#4d8a76", clay: "#b66c4f", slate: "#667c8e" };
const roleName = (id: string) => ROLES.find(r => r.id === id)?.name || "Penyintas";
const navs = [{ id: "peta" as Tab, label: "Peta", icon: Map }, { id: "radio" as Tab, label: "Radio", icon: Radio }, { id: "kartu" as Tab, label: "Kartuku", icon: IdCard }, { id: "rencana" as Tab, label: "Rencana", icon: Hammer }, { id: "akun" as Tab, label: "Akun", icon: UserRound }];

function Avatar({ look = "amber", large = false }: { look?: string; large?: boolean }) {
  return <svg viewBox="0 0 160 180" aria-label="Karakter penyintas" className={large ? "avatar large" : "avatar"}><ellipse cx="80" cy="161" rx="35" ry="8" fill="#163e3524"/><path d="M60 120h18v37H60zm24 0h18v37H84" fill="#344e57"/><path d="M58 152h22v10H58zm25 0h22v10H83" fill="#283b37"/><rect x="48" y="81" width="66" height="53" rx="16" fill={LOOKS[look] || LOOKS.amber}/><rect x="38" y="91" width="17" height="40" rx="8" fill={LOOKS[look] || LOOKS.amber}/><rect x="108" y="91" width="17" height="40" rx="8" fill={LOOKS[look] || LOOKS.amber}/><circle cx="47" cy="129" r="8" fill="#bd8c64"/><circle cx="117" cy="129" r="8" fill="#bd8c64"/><rect x="51" y="35" width="59" height="57" rx="21" fill="#c9946c"/><path d="M50 57c-6-33 18-40 36-35 25-1 28 13 26 30l-18-9-15 9-19-5-1 12z" fill="#3a3930"/><rect x="64" y="60" width="11" height="10" rx="3" fill="#fff3d4"/><rect x="88" y="60" width="11" height="10" rx="3" fill="#fff3d4"/><rect x="69" y="62" width="5" height="7" rx="2" fill="#283d36"/><rect x="93" y="62" width="5" height="7" rx="2" fill="#283d36"/><path d="M76 80h14" stroke="#79523e" strokeWidth="3" strokeLinecap="round"/><path d="M59 87v37m43-37v37" stroke="#6d6446" strokeWidth="6"/><path d="M78 91v32" stroke="#f7e8bd" strokeWidth="2"/><rect x="62" y="100" width="13" height="12" rx="2" fill="#ffffff24"/></svg>;
}
function Brand() { return <div className="brand"><span className="brand-mark"><House size={25}/><span/></span><div>POS TERAKHIR<small>Tempat untuk mulai lagi.</small></div></div>; }

export default function Experience() {
  const canvas = useRef<HTMLCanvasElement>(null); const engine = useRef<WorldEngine | null>(null); const opener = useRef<HTMLElement | null>(null);
  const [tab, setTab] = useState<Tab>("peta"); const [profile, setProfile] = useState<Profile | null>(null); const [shared, setShared] = useState<Profile | null>(null);
  const [, setAuthenticated] = useState(false); const [world, setWorld] = useState<World>({ count: 1, registered: 0, survivors: [], votes: { pagar: 0, air: 0 } });
  const [loaded, setLoaded] = useState(false); const [error, setError] = useState(""); const [toast, setToast] = useState(""); const [busy, setBusy] = useState(false); const [editing, setEditing] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [vote, setVote] = useState<string | null>(null); const [selected, setSelected] = useState<Selection | null>(null); const [labels, setLabels] = useState(true); const [sound, setSound] = useState(false); const [zoom, setZoom] = useState(1); const [formLook, setFormLook] = useState("amber"); const [formRole, setFormRole] = useState("perintis");
  const audioRef = useRef<AudioContext | null>(null); const soundNodes = useRef<OscillatorNode[]>([]);
  const totalVotes = world.votes.pagar + world.votes.air;
  const activeCard = shared || profile;
  function notify(message: string) { setToast(message); }
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
    engine.current?.setSurvivors(list, profile?.id);
  }, [world.survivors, profile]);
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
    try { const response = await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json() as MeResponse; if (!response.ok) throw new Error(data.error || "Belum berhasil disimpan."); setProfile(data.profile); setVote(data.vote); setAuthenticated(data.authenticated); if (data.recoveryKey) setRecoveryKey(data.recoveryKey); setEditing(false); await refresh(); notify(message); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "Belum berhasil disimpan."); return false; } finally { setBusy(false); }
  }
  async function submitCard(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); await mutate({ name: f.get("name"), specialty: f.get("specialty"), role: formRole, appearance: formLook }, profile ? "Kartu penyintas diperbarui." : "Selamat datang. Kamu sudah jadi bagian dari markas."); }
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
    g.fillStyle = "#344e57"; g.fillRect(461, 485, 30, 94); g.fillRect(512, 485, 30, 94); g.fillStyle = LOOKS[p.appearance] || LOOKS.amber; g.fillRect(435, 403, 130, 112); g.fillStyle = "#c9946c"; g.beginPath(); g.arc(500, 358, 55, 0, Math.PI * 2); g.fill(); g.fillStyle = "#3a3930"; g.beginPath(); g.arc(500, 344, 57, Math.PI, Math.PI * 2); g.fill(); g.fillRect(444, 328, 112, 17); g.fillStyle = "#253e34"; g.fillRect(481, 356, 8, 10); g.fillRect(515, 356, 8, 10);
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
    <div className="form-preview"><Avatar look={formLook}/><div><span className="eyebrow">KAMU DI DUNIA INI</span><strong>{roleName(formRole)}</strong><small>Setiap orang punya peran.</small></div></div>
    <label>Nama panggilan<input autoComplete="nickname" name="name" placeholder="Kamu dipanggil siapa?" defaultValue={profile?.name || ""} minLength={2} maxLength={24} required/><span className="field-help">Tampil di peta. Pakai nama panggilanmu.</span></label>
    <fieldset><legend>Pilih peranmu</legend><div className="role-grid">{ROLES.map(r => <button key={r.id} type="button" className={formRole === r.id ? "role-option chosen" : "role-option"} onClick={() => setFormRole(r.id)} aria-pressed={formRole === r.id}><r.icon size={21}/><strong>{r.name}</strong><small>{r.desc}</small></button>)}</div></fieldset>
    <label>Sebutan di markas <span className="optional">opsional</span><input name="specialty" defaultValue={profile?.specialty || ""} placeholder="Mis. Kepala Divisi Cek Kaleng" maxLength={32}/></label>
    <fieldset><legend>Warna jaketmu</legend><div className="swatches">{Object.entries(LOOKS).map(([key, color]) => <button key={key} type="button" style={{ background: color }} className={formLook === key ? "swatch chosen" : "swatch"} onClick={() => setFormLook(key)} aria-label={`Jaket ${key}`} aria-pressed={formLook === key}>{formLook === key && <Check size={19}/>}</button>)}</div></fieldset>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <button className="button primary wide" disabled={busy || !loaded}>{busy ? <LoaderCircle className="spin" size={20}/> : <IdCard size={20}/>} {editing ? "Simpan perubahan" : "Terbitkan kartu penyintas"}</button>
    <p className="fine-print">Gratis, tanpa login. Akses kartumu tersimpan di browser ini selama 180 hari. Simpan kunci pemulihan setelah bergabung untuk membukanya di perangkat lain.</p>
  </form>;
  useEffect(() => { if (loaded && new URLSearchParams(window.location.search).has("gabung")) setTab("kartu"); }, [loaded]);

  return <main className="app-shell">
    <header className="topbar"><Brand/><div className="episode-pill"><span/> DAY 01 <b>Awal kehidupan baru</b></div><div className="topbar-right"><span className="phase"><Sun size={15}/> Sore di markas</span><button className="desktop-profile" onClick={() => open("kartu")}><Avatar look={profile?.appearance}/><span>{profile?.name || "Jadi penyintas"}</span><ChevronRight size={16}/></button></div></header>
    <div className="workspace">
      <aside className="journal-sidebar"><div className="journal-main"><div className="section-label"><span className="status-dot"/> CATATAN HARI PERTAMA</div><h1>Kita mulai lagi.<br/><em>Bersama.</em></h1><p className="intro-copy">Satu rumah. Lahan kosong.<br/>Dan kesempatan untuk hidup lagi.</p>
        <div className="population"><div className="population-icon"><Users size={24}/></div><div><strong>{loaded ? world.count.toLocaleString("id-ID") : "—"}</strong><span>penyintas di dunia ini</span></div><span className="live-mark">DAY 1</span></div>
        <div className="supply-block"><div className="mini-heading">YANG KITA PUNYA <Package size={15}/></div><div className="supply-row"><span><span className="tin-icon"/> Makanan</span><b>2 kaleng</b></div><div className="supply-row"><span><Droplets size={17}/> Air minum</span><b>1 botol</b></div><div className="supply-row"><span><House size={17}/> Tempat tinggal</span><b>1 rumah</b></div></div>
        <div className="journal-note"><span>01</span><p>“Kalau kamu masih di luar sana, kamu nggak harus sendirian.”</p></div>
        <button className="button primary wide" onClick={() => open("kartu")}>{profile ? "Buka kartu penyintas" : "Ikut bertahan"}<ArrowRight size={19}/></button>
        <button className="text-link" onClick={() => open("rencana")}>Tentukan langkah berikutnya <ArrowUpRight size={15}/></button>
      </div><div className="sidebar-footer"><div className="section-label">JELAJAHI MARKAS</div><nav aria-label="Navigasi desktop">{navs.map(n => <button key={n.id} className={tab === n.id ? "side-nav active" : "side-nav"} onClick={() => n.id === "peta" ? close() : open(n.id)}><n.icon size={19}/>{n.label}<ChevronRight size={15}/></button>)}</nav><div className="sidebar-small">Pos Terakhir <span>•</span> Dunia yang kita bangun bersama.</div></div></aside>
      <section className="map-stage" aria-label="Peta interaktif Pos Terakhir"><canvas ref={canvas} aria-label="Peta markas. Geser untuk menjelajah, gunakan tombol plus dan minus untuk memperbesar."/>
        <div className="mobile-pop"><span className="status-dot"/><div><strong>{loaded ? world.count.toLocaleString("id-ID") : "—"}</strong><span>penyintas</span></div><small>DAY 01</small></div>
        <div className="map-caption"><span className="tiny-cross">+</span><span>LAHAN PERTAMA<strong>Pos Terakhir</strong></span></div>
        <div className="map-tools"><div className="zoom-stack"><button onClick={() => engine.current?.zoomBy(1.22)} aria-label="Perbesar peta"><Plus size={23}/></button><button onClick={() => engine.current?.zoomBy(.82)} aria-label="Perkecil peta"><Minus size={23}/></button></div><button className="tool-button" onClick={() => engine.current?.resetView()} aria-label="Pusatkan peta"><LocateFixed size={21}/></button><button className={`tool-button ${labels ? "is-on" : ""}`} aria-label="Tampilkan atau sembunyikan nama" aria-pressed={labels} onClick={() => { setLabels(!labels); engine.current?.setLabels(!labels); }}><Eye size={20}/></button></div>
        <div className="map-bottom"><div className="map-hint"><span className="status-dot"/> Geser untuk menjelajah <span className="hint-dot">·</span> Klik untuk mengenal markas</div><div className="map-bottom-actions"><button onClick={toggleSound} aria-label={sound ? "Matikan ambience" : "Nyalakan ambience"} title="Suara markas">{sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button><button className="find-me" onClick={findMe}><LocateFixed size={17}/>{profile ? "Temukan aku" : "Gabung markas"}</button></div></div>
        {error && !panelOpen && <div className="connection-note" role="status"><Radio size={17}/><span>{error}</span><button onClick={refresh}>Coba lagi</button></div>}
        {!loaded && !error && <div className="connection-note"><LoaderCircle size={17} className="spin"/> Menyambungkan radio markas…</div>}
        <div className="map-vignette" aria-hidden="true"/>
      </section>
    </div>
    <nav className="mobile-nav" aria-label="Navigasi utama">{navs.map(n => <button key={n.id} className={tab === n.id && !selected ? "active" : ""} onClick={() => n.id === "peta" ? close() : open(n.id)} aria-current={tab === n.id ? "page" : undefined}><n.icon size={23}/><span>{n.label}</span>{n.id === "radio" && <i/>}</button>)}</nav>
    {panelOpen && <><div className="panel-backdrop" onClick={close}/><section id="world-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" className={`detail-panel ${tab === "kartu" ? "card-panel" : ""}`}><div className="sheet-handle"/><div className="panel-heading"><div><span className="eyebrow">POS TERAKHIR / DAY 01</span><h2 id="panel-title">{selected ? selected.name : tab === "kartu" ? (activeCard && !editing ? "Kartu penyintas" : "Ada tempat untukmu.") : tab === "radio" ? "Kabar dari markas" : tab === "rencana" ? "Langkah berikutnya" : "Diri kamu di dunia ini"}</h2></div><button className="close-button" onClick={close} aria-label="Tutup panel"><X size={22}/></button></div>
      <div className="panel-content">
      {selected && <SelectionContent selected={selected} onJoin={() => open("kartu")} onVote={() => open("rencana")} profile={profile}/>}
      {!selected && tab === "kartu" && <>{activeCard && !editing ? <><div className="success-note"><CheckCircle2 size={19}/>{shared ? "Kamu sedang melihat kartu penyintas." : "Kamu bagian dari tempat ini."}</div>{!shared && recoveryKey && <div className="recovery-box"><Shield size={22}/><h3>Simpan jalan pulangmu.</h3><p>Kunci ini hanya ditampilkan setelah pendaftaran. Simpan sekarang. Siapa pun yang memegangnya bisa membuka dan mengubah karaktermu.</p><label>Kunci pemulihan pribadi<input readOnly value={recoveryKey} onFocus={e => e.currentTarget.select()}/></label><button className="button secondary wide" onClick={saveRecovery}><Download size={18}/> Simpan kunci pribadi</button><small>Jangan tampilkan kunci ini dalam screenshot atau postingan.</small></div>}<div className="survivor-card"><div className="card-head"><span className="card-seal"><House size={21}/></span><strong>KARTU PENYINTAS</strong><small>POS TERAKHIR</small></div><div className="card-body"><div className="avatar-medallion"><Avatar look={activeCard.appearance} large/></div><dl><div><dt>KODE PENYINTAS</dt><dd className="code">{activeCard.code}</dd></div><div><dt>NAMA PANGGILAN</dt><dd>{activeCard.name}</dd></div><div><dt>PERAN DI MARKAS</dt><dd>{activeCard.specialty || roleName(activeCard.role)}</dd></div><div className="card-last"><div><dt>BERGABUNG SEJAK</dt><dd>DAY {String(activeCard.joinedDay).padStart(2, "0")}</dd></div><span className="stamp"><Check size={25}/> TERHUBUNG</span></div></dl></div><div className="card-foot">Kita mulai lagi, bersama.</div></div>
        <div className="card-actions">{!shared && <button className="button primary wide" onClick={findMe}><LocateFixed size={19}/> Lihat karakterku</button>}<button className="button secondary wide" onClick={downloadCard}><Download size={18}/> Simpan kartu</button><button className="button quiet wide" onClick={copyLink}><Copy size={17}/> Bagikan kartu penyintas</button></div>
        {!shared && <><div className="divider"/><h3>Saat ini aku…</h3><p className="muted">Pilih aktivitas karaktermu di sekitar markas.</p><div className="activity-list">{ACTIVITIES.map(a => <button disabled={busy} key={a.id} className={profile?.activity === a.id ? "activity selected" : "activity"} onClick={() => mutate({ action: "activity", activity: a.id }, `Aktivitas diubah: ${a.name}.`)}><a.icon size={21}/><span><b>{a.name}</b><small>{a.desc}</small></span>{profile?.activity === a.id && <Check size={18}/>}</button>)}</div><button className="text-link edit-link" onClick={() => { setFormLook(profile!.appearance); setFormRole(profile!.role); setEditing(true); }}><Edit3 size={15}/> Edit kartu penyintas</button></>}
      </> : <><p className="panel-intro">Kita belum punya banyak. Tapi kamu nggak perlu bertahan sendirian. Buat karaktermu dan mulai hidup di markas.</p>{cardForm}</>}</>}
      {!selected && tab === "radio" && <><div className="radio-story"><span className="chapter">SIARAN 001 <span className="status-dot"/></span><h3>Kalau kamu dengar ini,<br/><em>ikut aku.</em></h3><p>Aku baru lolos dari kejaran zombie. Di ujung jalan, ada satu rumah di lahan kosong. Belum aman. Tapi kita bisa mulai dari sini.</p><span className="story-signature">— Perintis pertama</span></div><h3>Keadaan markas</h3><div className="fact-list"><span><House size={18}/> Rumah pertama ditemukan <Check size={17}/></span><span><Package size={18}/> Makanan tersisa dua kaleng</span><span><Droplets size={18}/> Air minum tersisa satu botol</span><span><Shield size={18}/> Pagar keliling belum ada</span></div><div className="warning-note"><Shield size={20}/><p><strong>Ada gerakan di tepi hutan.</strong> Dua zombie terlihat di luar batas lahan. Jangan pergi sendirian.</p></div><button className="button primary wide" onClick={() => open("rencana")}>Bantu tentukan langkah kita <ArrowRight size={18}/></button><p className="fine-print">Day mengikuti perkembangan episode, bukan pergantian tanggal. Markas akan tumbuh bersama cerita.</p></>}
      {!selected && tab === "rencana" && <><p className="panel-intro">Kita nggak bisa mengerjakan semuanya sekaligus. Apa yang paling mendesak untuk hari berikutnya?</p><div className="vote-choices">{[{ id: "pagar", title: "Bangun pagar", icon: Shield, desc: "Perkuat batas lahan supaya markas lebih aman.", cost: "Butuh kayu, alat, dan tenaga." }, { id: "air", title: "Cari sumber air", icon: Droplets, desc: "Satu botol nggak akan cukup untuk kita semua.", cost: "Butuh penjelajahan dan persiapan." }].map(v => <button key={v.id} className={`vote-card ${vote === v.id ? "chosen" : ""}`} disabled={busy} onClick={() => profile ? mutate({ action: "vote", choice: v.id }, "Pilihanmu sudah tercatat.") : open("kartu")}><span className="vote-icon"><v.icon size={27}/></span><div><span className="eyebrow">{v.id === "pagar" ? "PERLINDUNGAN" : "KEBUTUHAN DASAR"}</span><h3>{v.title}</h3><p>{v.desc}</p><small>{v.cost}</small></div><span className="choice-check">{vote === v.id ? <Check size={16}/> : <Plus size={16}/>}</span></button>)}</div><div className="vote-tally"><div className="mini-heading">SUARA PENYINTAS <span>{totalVotes} suara</span></div>{totalVotes === 0 ? <p className="muted">Belum ada suara. Jadilah yang pertama menentukan arah.</p> : ["pagar", "air"].map(k => { const n = world.votes[k as "pagar" | "air"]; return <div className="tally-row" key={k}><div><span>{k === "pagar" ? "Pagar" : "Air"}</span><b>{n} suara</b></div><div className="tally-track"><span style={{ width: `${n / totalVotes * 100}%` }}/></div></div>; })}</div><p className="fine-print">Satu penyintas, satu pilihan. Kamu bisa mengganti pilihanmu. Hasilnya jadi masukan pembangunan episode berikutnya; bangunannya belum berdiri.</p>{!profile && <button className="button primary wide" onClick={() => open("kartu")}>Gabung untuk ikut memilih <ArrowRight size={18}/></button>}{error && <p className="inline-error">{error}</p>}</>}
      {!selected && tab === "akun" && <>{profile ? <><div className="account-hero"><Avatar look={profile.appearance}/><div><h3>{profile.name}</h3><span>{roleName(profile.role)} · Day {profile.joinedDay}</span></div><span className="account-connected"><Check size={14}/> Tersimpan</span></div><button className="setting-row" onClick={() => open("kartu")}><IdCard size={21}/><span>Kartu penyintas<small>{profile.code}</small></span><ChevronRight size={17}/></button><button className="setting-row" onClick={findMe}><LocateFixed size={21}/><span>Temukan karakterku<small>Kembali ke posisimu di peta</small></span><ChevronRight size={17}/></button><div className="account-note"><Shield size={22}/><div><strong>Akses kartu ada di browser ini.</strong><p>Gunakan kunci pemulihan pribadimu melalui menu Akun di perangkat baru. Kode kartu untuk berbagi hanya membuka tampilan kartu. Simpan kunci sebelum menutup halaman pendaftaran.</p></div></div></> : <><div className="empty-state"><div className="empty-illustration"><Avatar/></div><h3>Kisahmu belum dimulai.</h3><p>Satu kartu, satu karakter, dan tempat untukmu di markas.</p></div><button className="button primary wide" onClick={() => open("kartu")}>Buat kartu penyintas <ArrowRight size={18}/></button></>}
        {!profile && <form className="join-form recovery-form" onSubmit={recoverCard}><div className="divider"/><h3>Sudah jadi penyintas?</h3><p className="muted">Buka karakter lama dengan kunci pemulihan pribadi yang kamu simpan.</p><label>Kunci pemulihan<input name="recoveryKey" autoComplete="off" minLength={48} maxLength={48} required placeholder="48 karakter dari file kunci pribadi"/></label><button className="button secondary wide" disabled={busy}>{busy ? "Membuka…" : "Pulihkan karaktermu"}</button>{error && <p className="inline-error" role="alert">{error}</p>}</form>}<div className="divider"/><h3>Pengaturan peta</h3><button className="setting-row" onClick={() => { setLabels(!labels); engine.current?.setLabels(!labels); }}><Eye size={21}/><span>Nama di peta<small>Tampilkan nama karakter</small></span><span className={`toggle ${labels ? "on" : ""}`}/></button><button className="setting-row" onClick={toggleSound}>{sound ? <Volume2 size={21}/> : <VolumeX size={21}/>}<span>Suara markas<small>Ambience pelan, tanpa autoplay</small></span><span className={`toggle ${sound ? "on" : ""}`}/></button><p className="fine-print">Pos Terakhir adalah dunia fiksi dari serial animasi. Karakter yang terlihat bergantian agar peta tetap nyaman dijelajahi.</p></>}
      </div></section></>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={19}/>{toast}</div>}
  </main>;
}

function SelectionContent({ selected, onJoin, onVote, profile }: { selected: Selection; onJoin: () => void; onVote: () => void; profile: Profile | null }) {
  const info: Record<string, { icon: typeof House; label: string; description: string; detail: string }> = {
    house: { icon: House, label: "TEMPAT BERLINDUNG", description: "Rumah pertama kita. Catnya pudar, beberapa jendela ditutup papan, tapi pintunya masih bisa melindungi kita malam ini.", detail: "1 rumah · Listrik belum tersedia" },
    crate: { icon: Package, label: "KOTAK PERSEDIAAN", description: "Sudah diperiksa dua kali. Isinya tetap kosong. Berharap ternyata bukan strategi bertahan hidup.", detail: "Kosong · Masih bisa dipakai menyimpan barang" },
    radio: { icon: Radio, label: "PENGHUBUNG PENYINTAS", description: "Kalau kamu masih di luar sana dan mendengar siaran ini, kamu tidak perlu bertahan sendirian.", detail: "Siaran 001 · Ada tempat untukmu" },
    water: { icon: Droplets, label: "PERSEDIAAN AWAL", description: "Dua kaleng makanan dan satu botol air. Kita harus mencari tambahan sebelum menerima lebih banyak penyintas.", detail: "Air: 1 botol · Makanan: 2 kaleng" },
    plot: { icon: Hammer, label: "LAHAN BELUM DIBANGUN", description: "Di sinilah kita akan membangun kehidupan baru. Untuk sekarang, tempat ini masih lahan kosong.", detail: "Tentukan prioritas melalui Rencana" },
    zombie: { icon: Shield, label: "ANCAMAN DI LUAR LAHAN", description: "Mereka terlihat di dekat pagar lama yang rusak. Tetap di dalam lahan dan jangan menjelajah sendirian.", detail: "Perlindungan markas masih terbatas" },
    survivor: { icon: UserRound, label: "PENYINTAS", description: `${selected.name} adalah bagian dari dunia Pos Terakhir. Kita punya jalan masing-masing, tapi tujuan yang sama: hidup lagi.`, detail: "Beraktivitas di sekitar markas" },
  }; const item = info[selected.kind] || info.plot;
  return <><div className={`object-hero ${selected.kind}`}><item.icon size={57}/><span>DAY 01</span></div><span className="eyebrow">{item.label}</span><p className="object-description">{item.description}</p><div className="object-detail">{item.detail}</div><button className="button primary wide" onClick={selected.kind === "radio" && !profile ? onJoin : onVote}>{selected.kind === "radio" && !profile ? "Bergabung jadi penyintas" : "Bantu langkah berikutnya"}<ArrowRight size={18}/></button></>;
}
