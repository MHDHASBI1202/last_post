export type Survivor = { id: string; name: string; role: string; activity: string; appearance: string; joinedDay: number };
type Selection = { kind: 'house' | 'crate' | 'radio' | 'water' | 'plot' | 'survivor' | 'zombie'; id?: string; name: string };
type Point = { x: number; y: number };
type SceneItem = { x: number; y: number; depth: number; draw: () => void; selection?: Selection; hit?: { x: number; y: number; w: number; h: number } };
type Tree = { x: number; y: number; size: number; variant: number };

const TILE_X = 43, TILE_Y = 22, HEIGHT = 39;
const C = { ink: '#233e37', wood: '#765a3a', timber: '#aa8658', cream: '#e5d5aa', shade: '#bcb997', teal: '#447f77', tealLight: '#73a398', slate: '#5d7e7b', slateDark: '#3c5b5e', gold: '#edb86b', ground: '#b8c598', clay: '#c9b68b' };

function seeded(seed: number) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(s: string) { let n = 2166136261; for (const c of s) { n ^= c.charCodeAt(0); n = Math.imul(n, 16777619); } return n >>> 0; }
function iso(x: number, y: number, z = 0): Point { return { x: (x - y) * TILE_X, y: (x + y) * TILE_Y - z * HEIGHT }; }
function canvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function polygon(ctx: CanvasRenderingContext2D, points: Point[], fill: string, stroke?: string, width = 1) { ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); } }
function path(ctx: CanvasRenderingContext2D, points: Point[], color: string, width: number) { ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number, fill: string, stroke?: string) { ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } }
function box(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, w: number, d: number, h: number, top: string, front: string, side: string, outline?: string) {
  const p = (a: number, b: number, c: number) => iso(a, b, c);
  polygon(ctx, [p(x, y + d, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x, y + d, z + h)], front, outline);
  polygon(ctx, [p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x + w, y, z + h)], side, outline);
  polygon(ctx, [p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)], top, outline);
}
function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, opacity = .13) { ctx.fillStyle = `rgba(28,52,37,${opacity})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -.12, 0, Math.PI * 2); ctx.fill(); }

/** An entirely 2D isometric world: no textures, network assets, or WebGL required. */
export class WorldEngine {
  private ctx: CanvasRenderingContext2D;
  private width = 1; private height = 1; private dpr = 1;
  private zoom = 1; private pan = { x: 0, y: 0 }; private initialized = false;
  private pointers = new Map<number, Point>(); private moved = false; private pointerStart: Point = { x: 0, y: 0 }; private pinch = 0;
  private resizeObserver: ResizeObserver; private frame = 0; private destroyed = false; private started = performance.now(); private lastDraw = 0;
  private survivors: Survivor[] = []; private ownId?: string; private labels = true; private focusedId?: string;
  private trees: Tree[] = []; private terrain: HTMLCanvasElement; private house: HTMLCanvasElement; private treeSprites: HTMLCanvasElement[] = [];
  private hits: { selection: Selection; x: number; y: number; w: number; h: number }[] = [];
  private listeners: (() => void)[] = [];
  private palette = { amber: '#dca34d', teal: '#4d8a76', clay: '#b66c4f', slate: '#667c8e' };

  constructor(private element: HTMLCanvasElement, private callbacks: { onSelect: (item: Selection) => void; onViewChange?: (zoom: number) => void }) {
    const ctx = element.getContext('2d', { alpha: false }); if (!ctx) throw new Error('Canvas 2D tidak tersedia.'); this.ctx = ctx;
    element.style.touchAction = 'none'; element.style.cursor = 'grab';
    this.terrain = this.makeTerrain(); this.house = this.makeHouse();
    for (let i = 0; i < 12; i++) this.treeSprites.push(this.makeTree(i));
    const rand = seeded(71);
    for (let i = 0; i < 190; i++) {
      const a = rand() * Math.PI * 2, radius = 9.7 + rand() * 14;
      const x = Math.cos(a) * radius, y = Math.sin(a) * radius;
      if (y > 6 && Math.abs(x) < 7.5) continue;
      if (x + y > 8 && Math.abs(x - y) < 7.5) continue;
      this.trees.push({ x, y, size: .75 + rand() * .55, variant: i % 12 });
    }
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(element); this.resize();
    this.bind(); this.frame = requestAnimationFrame(this.tick);
  }
  setSurvivors(list: Survivor[], ownId?: string) { this.survivors = list.filter((s, i, arr) => s.id && arr.findIndex(v => v.id === s.id) === i); this.ownId = ownId; }
  zoomBy(factor: number) { this.zoomAt(factor, this.width / 2, this.height / 2); }
  resetView() { this.zoom = this.initialZoom(); this.pan = { x: 0, y: 0 }; this.focusedId = undefined; this.callbacks.onViewChange?.(this.zoom); }
  setLabels(on: boolean) { this.labels = on; }
  focusSurvivor(id: string) {
    const s = id === 'arga' ? this.arga() : this.survivors.find(s => s.id === id); if (!s) return false;
    this.focusedId = id; const p = this.actorPosition(s, (performance.now() - this.started) / 1000);
    const v = iso(p.x, p.y); this.pan = { x: -v.x * this.zoom, y: -v.y * this.zoom + 50 }; return true;
  }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.frame); this.resizeObserver.disconnect(); this.listeners.forEach(fn => fn()); }
  private initialZoom() { return Math.max(.47, Math.min(1.16, this.width < 700 ? this.width / 660 : Math.min(this.width / 1020, this.height / 700))); }
  private resize() {
    const rect = this.element.getBoundingClientRect(); if (rect.width < 1 || rect.height < 1) return;
    const changed = Math.abs(this.width - rect.width) > 80 || Math.abs(this.height - rect.height) > 140;
    this.width = rect.width; this.height = rect.height; this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.element.width = Math.round(this.width * this.dpr); this.element.height = Math.round(this.height * this.dpr);
    if (!this.initialized || changed) { this.resetView(); this.initialized = true; }
  }
  private bind() {
    const on = <K extends keyof HTMLElementEventMap>(event: K, handler: (e: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => { this.element.addEventListener(event, handler as EventListener, options); this.listeners.push(() => this.element.removeEventListener(event, handler as EventListener)); };
    const local = (e: PointerEvent) => { const r = this.element.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    on('pointerdown', e => { const p = local(e); this.pointers.set(e.pointerId, p); this.element.setPointerCapture(e.pointerId); this.pointerStart = p; this.moved = false; this.focusedId = undefined; this.element.style.cursor = 'grabbing'; if (this.pointers.size === 2) this.pinch = this.pointerDistance(); });
    on('pointermove', e => {
      const old = this.pointers.get(e.pointerId); if (!old) return; const p = local(e); this.pointers.set(e.pointerId, p);
      if (Math.hypot(p.x - this.pointerStart.x, p.y - this.pointerStart.y) > 5) this.moved = true;
      if (this.pointers.size === 2) { const distance = this.pointerDistance(); const points = [...this.pointers.values()]; if (this.pinch > 0) this.zoomAt(distance / this.pinch, (points[0].x + points[1].x) / 2, (points[0].y + points[1].y) / 2); this.pinch = distance; this.moved = true; }
      else { this.pan.x += p.x - old.x; this.pan.y += p.y - old.y; this.clampPan(); }
    });
    on('pointerup', e => { const p = local(e); const wasSingle = this.pointers.size === 1; this.pointers.delete(e.pointerId); if (!this.moved && wasSingle) this.select(p.x, p.y); this.pinch = 0; this.element.style.cursor = 'grab'; });
    on('pointercancel', e => { this.pointers.delete(e.pointerId); this.pinch = 0; this.element.style.cursor = 'grab'; });
    on('wheel', e => { e.preventDefault(); const r = this.element.getBoundingClientRect(); this.focusedId = undefined; this.zoomAt(Math.exp(-e.deltaY * .0014), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  }
  private pointerDistance() { const p = [...this.pointers.values()]; return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }
  private zoomAt(factor: number, x: number, y: number) {
    const prev = this.zoom; this.zoom = Math.max(.30, Math.min(2.3, this.zoom * factor)); const ratio = this.zoom / prev;
    this.pan.x = x - this.width / 2 - (x - this.width / 2 - this.pan.x) * ratio;
    this.pan.y = y - this.height * .55 - (y - this.height * .55 - this.pan.y) * ratio;
    this.clampPan(); this.callbacks.onViewChange?.(this.zoom);
  }
  private clampPan() { const maxX = Math.min(1400 * this.zoom, Math.max(0, 2100 * this.zoom - this.width / 2 - 24)), maxY = Math.min(850 * this.zoom, Math.max(0, 1300 * this.zoom - this.height * .55 - 24)); this.pan.x = Math.max(-maxX, Math.min(maxX, this.pan.x)); this.pan.y = Math.max(-maxY, Math.min(maxY, this.pan.y)); }
  private select(x: number, y: number) { for (let i = this.hits.length - 1; i >= 0; i--) { const h = this.hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { this.callbacks.onSelect(h.selection); return; } } }
  private tick = (now: number) => { if (this.destroyed) return; if (now - this.lastDraw > 1000 / 30) { this.draw((now - this.started) / 1000); this.lastDraw = now; } this.frame = requestAnimationFrame(this.tick); };
  private arga(): Survivor { return { id: 'arga', name: 'Arga', role: 'Penyintas pertama', activity: 'jelajah', appearance: 'amber', joinedDay: 1 }; }

  private makeTerrain() {
    const out = canvas(4200, 2700), ctx = out.getContext('2d')!; ctx.translate(2100, 1300); ctx.fillStyle = C.ground; ctx.fillRect(-2100, -1300, 4200, 2700);
    const rand = seeded(821);
    for (let i = 0; i < 110; i++) {
      const x = (rand() - .5) * 55, y = (rand() - .5) * 55, p = iso(x, y);
      ctx.fillStyle = ['#b0bd90', '#bdc99b', '#c4cca5', '#aabc8c'][i % 4]; ctx.beginPath(); ctx.ellipse(p.x, p.y, 100 + rand() * 200, 40 + rand() * 70, -.15, 0, Math.PI * 2); ctx.fill();
    }
    const clearing: Point[] = [];
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, r = 1 + Math.sin(i * 2.3) * .055; clearing.push(iso(Math.cos(a) * 8.9 * r, Math.sin(a) * 8.5 * r)); }
    polygon(ctx, clearing, '#c9c49e');
    const road = [iso(-1, 24), iso(-.8, 16), iso(.4, 10), iso(.8, 6), iso(.6, 3.2)];
    path(ctx, road, '#b5a682', 79); path(ctx, road, '#cdb991', 69); path(ctx, road, '#d4c19a', 47);
    path(ctx, road.map(p => ({ x: p.x - 20, y: p.y })), 'rgba(111,99,66,.14)', 3); path(ctx, road.map(p => ({ x: p.x + 20, y: p.y })), 'rgba(111,99,66,.12)', 3);
    for (let i = 0; i < 2100; i++) {
      const x = (rand() - .5) * 48, y = (rand() - .5) * 48;
      if (Math.abs(x) < 3.1 && y > -4 && y < 4) continue;
      if (Math.abs(x - .3) < .9 && y > 3) continue;
      if (Math.abs(x) < 7 && Math.abs(y) < 6 && rand() < .68) continue;
      const p = iso(x, y), h = 4 + rand() * 9; ctx.strokeStyle = ['#8eaa71', '#9ca775', '#a8ae7c'][i % 3]; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x - 2, p.y - h); ctx.lineTo(p.x, p.y); ctx.lineTo(p.x + 3, p.y - h * .7); ctx.stroke();
    }
    for (let i = 0; i < 80; i++) { const x = (rand() - .5) * 40, y = (rand() - .5) * 40; if (Math.abs(x) < 4 && Math.abs(y) < 5) continue; const p = iso(x, y), r = 4 + rand() * 10; shadow(ctx, p.x + 3, p.y + 2, r, r * .4, .1); polygon(ctx, [{ x: p.x - r, y: p.y }, { x: p.x - r * .5, y: p.y - r * .6 }, { x: p.x + r * .5, y: p.y - r * .5 }, { x: p.x + r, y: p.y }, { x: p.x, y: p.y + r * .3 }], '#a6b0a0', '#929e8f', .5); }
    // Dashed survey corners are vacant land, not constructed buildings.
    const plot = [iso(-7, 0), iso(-4, 0), iso(-4, 3), iso(-7, 3)]; ctx.save(); ctx.setLineDash([7, 10]); path(ctx, [...plot, plot[0]], 'rgba(92,117,75,.35)', 2); ctx.restore();
    return out;
  }
  private makeTree(variant: number) {
    const out = canvas(260, 315), ctx = out.getContext('2d')!; ctx.translate(130, 286); const rand = seeded(variant * 717 + 5);
    shadow(ctx, 24, 4, 75, 25, .13);
    path(ctx, [{ x: 1, y: 0 }, { x: -2, y: -100 }, { x: 4, y: -155 }], '#77664a', 13);
    path(ctx, [{ x: 1, y: -80 }, { x: -42, y: -132 }], '#816c4b', 7); path(ctx, [{ x: 2, y: -105 }, { x: 43, y: -159 }], '#816c4b', 6);
    path(ctx, [{ x: -3, y: -4 }, { x: -5, y: -116 }], '#a18c60', 3);
    const colors = variant % 3 === 0 ? ['#708c58', '#8ca36a', '#a3b678'] : variant % 3 === 1 ? ['#52765a', '#6e9065', '#87a674'] : ['#65865c', '#7c9d68', '#9db57b'];
    const crowns = [{ x: -43, y: -142, rx: 59, ry: 48 }, { x: 40, y: -164, rx: 64, ry: 50 }, { x: -4, y: -203, rx: 66, ry: 53 }, { x: 0, y: -136, rx: 67, ry: 47 }];
    for (const [j, crown] of crowns.entries()) {
      const points: Point[] = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, jitter = .91 + rand() * .18; points.push({ x: crown.x + Math.cos(a) * crown.rx * jitter, y: crown.y + Math.sin(a) * crown.ry * jitter }); }
      polygon(ctx, points, colors[j % 3]); const center = { x: crown.x - 8, y: crown.y - 10 };
      for (let i = 0; i < points.length; i += 3) polygon(ctx, [center, points[i], points[(i + 1) % points.length], points[(i + 2) % points.length]], i % 2 ? 'rgba(255,244,171,.065)' : 'rgba(26,63,38,.055)');
    }
    return out;
  }
  private makeHouse() {
    const out = canvas(700, 600), ctx = out.getContext('2d')!; ctx.translate(350, 390);
    shadow(ctx, 25, 45, 200, 67, .16);
    box(ctx, -2.2, -2, -.03, 4.4, 3.9, .35, '#b3ac90', '#a79d7f', '#8e947d');
    // Individual foundation bricks and timber frame remain readable at mobile scale.
    for (let i = 0; i < 11; i++) box(ctx, -2.16 + i * .4, 1.91, .04, .36, .045, .15, '#ac8863', '#ab805a', '#8e7152');
    box(ctx, -2.1, -1.9, .3, 4.2, 3.7, 2.8, '#ded5b4', '#dfd4b1', '#bec4a6', '#7b8b75');
    for (const x of [-2.1, 2.02]) box(ctx, x, 1.81, .3, .09, .11, 2.8, C.timber, C.wood, '#6c634a');
    const frontWindow = (x: number) => {
      polygon(ctx, [iso(x, 1.825, 1.28), iso(x + 1, 1.825, 1.28), iso(x + 1, 1.825, 2.36), iso(x, 1.825, 2.36)], C.teal);
      polygon(ctx, [iso(x + .08, 1.84, 1.37), iso(x + .91, 1.84, 1.37), iso(x + .91, 1.84, 2.27), iso(x + .08, 1.84, 2.27)], '#294f53');
      path(ctx, [iso(x + .5, 1.86, 1.4), iso(x + .5, 1.86, 2.26)], '#6a9b8d', 3);
      for (const z of [1.52, 1.96]) { path(ctx, [iso(x - .08, 1.9, z), iso(x + 1.12, 1.9, z + .08)], '#ba9565', 9); for (const xx of [x + .12, x + .88]) { const p = iso(xx, 1.91, z + .025); ctx.fillStyle = '#758277'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2); ctx.fill(); } }
      path(ctx, [iso(x - .08, 1.91, 1.25), iso(x + 1.09, 1.91, 1.25)], '#80a68e', 5);
    };
    frontWindow(-1.85); frontWindow(1.05);
    // Dark entrance and a slightly open plank door.
    polygon(ctx, [iso(-.32, 1.83, .3), iso(.65, 1.83, .3), iso(.65, 1.83, 2.49), iso(-.32, 1.83, 2.49)], '#233f3e');
    path(ctx, [iso(-.36, 1.86, .3), iso(-.36, 1.86, 2.52), iso(.72, 1.86, 2.52), iso(.72, 1.86, .3)], '#4f8a7d', 6);
    polygon(ctx, [iso(.68, 1.85, .31), iso(.04, 2.26, .31), iso(.04, 2.26, 2.42), iso(.68, 1.85, 2.42)], '#548a7e', '#395f57', 1);
    for (const z of [.67, 1.95]) path(ctx, [iso(.61, 1.92, z), iso(.1, 2.25, z)], '#8c7750', 4);
    // Side window and modest patches of plaster, rather than noisy decoration.
    polygon(ctx, [iso(2.11, -.9, 1.2), iso(2.11, .3, 1.2), iso(2.11, .3, 2.27), iso(2.11, -.9, 2.27)], '#478378');
    polygon(ctx, [iso(2.12, -.79, 1.32), iso(2.12, .2, 1.32), iso(2.12, .2, 2.16), iso(2.12, -.79, 2.16)], '#345a5b');
    for (const z of [1.5, 1.9]) path(ctx, [iso(2.14, -1, z), iso(2.14, .4, z)], '#a6895b', 7);
    for (const [x, z, w] of [[-1.7, .6, .3], [-1.45, .48, .2], [1.3, .7, .25], [1.65, .6, .15]]) polygon(ctx, [iso(x, 1.831, z), iso(x + w, 1.831, z), iso(x + w, 1.831, z + .12), iso(x, 1.831, z + .12)], '#b0b194');
    polygon(ctx, [iso(-2.1, 1.8, 3.1), iso(2.1, 1.8, 3.1), iso(0, 1.8, 4.22)], '#dfd5b3', '#8d977e');
    for (let x = -1.7; x <= 1.7; x += .43) path(ctx, [iso(x, 1.815, 3.13), iso(x, 1.815, 4.20 - Math.abs(x) * .53)], '#b3b89a', 1);
    polygon(ctx, [iso(-2.38, -2.18, 3.1), iso(0, -2.18, 4.29), iso(0, 2.04, 4.29), iso(-2.38, 2.04, 3.1)], '#78918a', '#536f6d');
    polygon(ctx, [iso(0, -2.18, 4.29), iso(2.38, -2.18, 3.1), iso(2.38, 2.04, 3.1), iso(0, 2.04, 4.29)], '#5e7f7d', '#3f6565');
    for (let y = -2.1; y < 2.04; y += .21) { path(ctx, [iso(-2.38, y, 3.14), iso(0, y, 4.32)], '#94aaa0', 1.4); path(ctx, [iso(0, y, 4.32), iso(2.38, y, 3.14)], '#8da49a', 1.4); }
    path(ctx, [iso(0, -2.24, 4.31), iso(0, 2.1, 4.31)], '#a3b1a0', 4);
    path(ctx, [iso(-2.42, 2.08, 3.1), iso(0, 2.08, 4.31), iso(2.42, 2.08, 3.1)], '#947b53', 4);
    // Porch, real footing blocks and front steps.
    for (let i = 0; i < 11; i++) box(ctx, -2.2 + i * .4, 1.8, .25, .38, 1.08, .1, '#bd9d70', '#a2855e', '#8f7758');
    for (const x of [-1.95, 1.95]) { box(ctx, x - .1, 2.58, -.04, .3, .3, .33, '#aba68c', '#97967e', '#858f7b'); box(ctx, x, 2.65, .33, .09, .09, 2.35, '#b09668', '#8c704a', '#785f40'); }
    for (let i = 0; i < 3; i++) box(ctx, -.43, 2.85 + i * .27, .20 - i * .075, 1.38, .31, .12, '#d4cdb0', '#bbb89a', '#a8ad95');
    polygon(ctx, [iso(-2.25, 1.77, 2.94), iso(2.25, 1.77, 2.94), iso(2.25, 2.96, 2.66), iso(-2.25, 2.96, 2.66)], '#668780', '#476b65');
    for (let x = -2.2; x <= 2.2; x += .20) path(ctx, [iso(x, 1.78, 2.96), iso(x, 2.97, 2.68)], '#96afa0', 1.2);
    // Address plate 07 and unlit fixtures; there is no electrical supply yet.
    const addr = iso(.15, 1.91, 2.7); roundRect(ctx, addr.x - 10, addr.y - 6, 21, 11, 2, '#416d60'); ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#e4dec2'; ctx.fillText('07', addr.x, addr.y + 2);
    return out;
  }

  private drawCrate() {
    const ctx = this.ctx; shadow(ctx, 4, 4, 26, 12);
    box(ctx, -.43, -.30, 0, .86, .6, .07, '#9a794a', '#87683f', '#725a38');
    for (const z of [.17, .34, .51]) { box(ctx, -.46, .27, z, .92, .07, .11, '#b28c56', '#a2804e', '#7d643d'); box(ctx, .39, -.31, z, .07, .64, .11, '#ad8751', '#947545', '#80643b'); }
    for (const z of [.17, .34, .51]) { path(ctx, [iso(-.46, -.30, z), iso(.40, -.30, z)], '#aa8752', 4); path(ctx, [iso(-.46, -.30, z), iso(-.46, .30, z)], '#987547', 4); }
    for (const [x, y] of [[-.43, -.3], [.43, -.3], [-.43, .3], [.43, .3]]) box(ctx, x, y, 0, .055, .055, .67, '#bb9662', '#987849', '#7e653e');
  }
  private drawSupplies() {
    const ctx = this.ctx;
    for (const x of [-.58, .58]) for (const y of [-.28, .28]) box(ctx, x, y, 0, .07, .07, .79, '#977949', '#896b40', '#715a38');
    for (let i = 0; i < 5; i++) box(ctx, -.67 + i * .28, -.35, .77, .26, .77, .08, '#c4a473', '#a4865a', '#92764c');
    for (const x of [-.39, -.03]) {
      const p = iso(x, .08, 1.03); ctx.fillStyle = '#ae694c'; ctx.fillRect(p.x - 5.5, p.y - 8, 11, 15); ctx.fillStyle = '#d3d9bc'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 8, 5.5, 2.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#77897e'; ctx.lineWidth = .8; ctx.stroke(); ctx.fillStyle = '#e3d1a5'; ctx.fillRect(p.x - 3, p.y - 3, 6, 3);
    }
    const p = iso(.40, -.02, 1.05); roundRect(ctx, p.x - 4.5, p.y - 14, 9, 21, 2, '#6daab2'); ctx.fillStyle = '#b7d5cd'; ctx.fillRect(p.x - 3, p.y - 19, 6, 6); ctx.fillStyle = '#e9e5ce'; ctx.fillRect(p.x - 3.4, p.y - 4, 6.8, 5);
  }
  private drawRadio() {
    const ctx = this.ctx; const p = iso(0, 0, .44); roundRect(ctx, p.x - 12, p.y - 11, 24, 16, 3, '#386c62', '#244e47');
    roundRect(ctx, p.x - 9, p.y - 8, 11, 10, 1, '#1f3f3c'); ctx.fillStyle = '#cbb170'; ctx.fillRect(p.x + 4, p.y - 7, 5, 3); ctx.strokeStyle = '#81968b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x + 8, p.y - 11); ctx.lineTo(p.x + 13, p.y - 33); ctx.stroke();
  }
  private actorPosition(s: Survivor, t: number) {
    const seed = hash(s.id); const phase = (seed % 1000) / 1000; const activity = (s.activity || s.role).toLowerCase(); let route: [number, number][];
    if (/jaga|perimeter|penjaga/.test(activity)) route = [[-6, -6], [-2, -6], [4.8, -6], [6, -4], [4.8, -6], [-2, -6]];
    else if (/air|logistik|persediaan/.test(activity)) route = [[-4, 4.2], [-2.8, 4.0], [-2.6, 3.6], [-2.8, 4], [-4, 4.2]];
    else if (/istirahat|tidur/.test(activity)) return { x: 1.4 + phase * 1.2, y: 3.4 + phase * .25, walking: false, heading: .3, phase };
    else if (/bangun|perakit|perajin|tukang/.test(activity)) route = [[-5.2, 3], [-5.2, 1], [-6, 1], [-6, 3]];
    else if (/medis|medik|dokter/.test(activity)) route = [[-2.8, 4.1], [-1, 4.2], [.8, 4.1], [-1, 4.2]];
    else route = [[-4, 4], [-1, 5.3], [3.9, 4.4], [4.7, .3], [4.5, -4.3], [-3.8, -4.6], [-5.1, .2]];
    const durations = route.map((p, i) => Math.hypot(p[0] - route[(i + 1) % route.length][0], p[1] - route[(i + 1) % route.length][1]));
    const total = durations.reduce((a, b) => a + b, 0); let d = (t * (.38 + phase * .15) + phase * total) % total; let index = 0;
    while (d > durations[index] && index < durations.length - 1) { d -= durations[index]; index++; }
    const a = route[index], b = route[(index + 1) % route.length]; const u = d / durations[index];
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, walking: true, heading: b[0] - b[1] - a[0] + a[1], phase };
  }
  private drawActor(s: Survivor, time: number, walking: boolean, heading: number, own: boolean, infected = false) {
    const ctx = this.ctx, stride = walking ? Math.sin(time * (infected ? 3.8 : 8) + hash(s.id)) : 0;
    const palette = this.palette[s.appearance as keyof typeof this.palette] || this.palette.amber; const shirt = infected ? '#925747' : palette; const skin = infected ? '#a4af82' : '#c79a70';
    shadow(ctx, 1, 0, 13, 5, .18);
    if (own) { ctx.strokeStyle = '#f7ce7b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, 1, 18, 7, 0, 0, Math.PI * 2); ctx.stroke(); }
    for (const side of [-1, 1]) { const x = side * 4.2, dy = stride * side * 2.8; roundRect(ctx, x - 3, -15 + dy, 6, 13, 2, '#506c71'); roundRect(ctx, x - 3.8, -4 + dy, 8, 4, 1.5, '#40544d'); }
    const bob = walking ? Math.abs(stride) * 1.4 : Math.sin(time * 1.5) * .3;
    ctx.save(); ctx.translate(0, -bob);
    roundRect(ctx, -9, -35, 18, 22, 5, shirt); ctx.fillStyle = infected ? '#6f5945' : '#bcb280'; ctx.fillRect(-.6, -32, 1.2, 17);
    for (const side of [-1, 1]) { const swing = stride * side * 3; roundRect(ctx, side * 10 - 3, -33 + swing, 6, 15, 3, shirt); roundRect(ctx, side * 10 - 2.3, -19 + swing, 4.6, 5, 2, skin); }
    if (!infected && heading < 0) { roundRect(ctx, -8, -34, 16, 17, 4, '#3e756b'); ctx.fillStyle = '#91ac8a'; ctx.fillRect(-6, -33, 12, 3); }
    roundRect(ctx, -8.5, -52, 17, 19, 5, skin);
    if (!infected) { roundRect(ctx, -8.6, -54, 17.2, 8, 3, '#4b493b'); ctx.fillStyle = '#5a5141'; ctx.fillRect(-8.6, -49, 3, 7); }
    const face = heading >= -1;
    if (face || infected) { ctx.fillStyle = '#f0e6c9'; ctx.fillRect(-4.5, -44, 3.2, 3); ctx.fillRect(2, -44, 3.2, 3); ctx.fillStyle = '#314b41'; ctx.fillRect(-3.1, -43.7, 1.6, 2.4); ctx.fillRect(3.4, -43.7, 1.6, 2.4); ctx.fillStyle = infected ? '#6b7456' : '#976f51'; ctx.fillRect(-1.2, -38, 3, 1.2); }
    ctx.restore();
    if (own) { ctx.fillStyle = '#f2c36f'; polygon(ctx, [{ x: -5, y: -65 }, { x: 5, y: -65 }, { x: 0, y: -59 }], '#f2c36f'); }
    if (this.labels && !infected && !own) this.drawName(s.name, 0, -78, false);
  }
  private drawName(name: string, x: number, y: number, own = false) {
    const ctx = this.ctx; const display = name.length > 19 ? `${name.slice(0, 18)}…` : name;
    const size = Math.round(13 / Math.max(.60, Math.min(1, this.zoom))); ctx.font = `600 ${size}px system-ui, sans-serif`; const w = ctx.measureText(display).width + 20, h = size + 12;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 8, own ? '#f5d58b' : '#f8f2df', own ? '#b08a43' : '#b0b08d'); ctx.textAlign = 'center'; ctx.fillStyle = '#334b3d'; ctx.fillText(display, x, y + size * .32);
  }
  private draw(time: number) {
    const ctx = this.ctx; ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.fillStyle = C.ground; ctx.fillRect(0, 0, this.width, this.height);
    if (this.focusedId) { const s = this.focusedId === 'arga' ? this.arga() : this.survivors.find(s => s.id === this.focusedId); if (s) { const p = this.actorPosition(s, time), v = iso(p.x, p.y); this.pan.x += (-v.x * this.zoom - this.pan.x) * .07; this.pan.y += (-v.y * this.zoom + 50 - this.pan.y) * .07; } }
    const ox = this.width / 2 + this.pan.x, oy = this.height * .55 + this.pan.y; ctx.translate(ox, oy); ctx.scale(this.zoom, this.zoom); this.hits = [];
    ctx.drawImage(this.terrain, -2100, -1300);
    const items: SceneItem[] = [];
    for (const tree of this.trees) { const p = iso(tree.x, tree.y), w = 260 * tree.size, h = 315 * tree.size; items.push({ x: tree.x, y: tree.y, depth: tree.x + tree.y, draw: () => ctx.drawImage(this.treeSprites[tree.variant], p.x - w / 2, p.y - h * .908, w, h) }); }
    items.push({ x: 0, y: -1, depth: 1, selection: { kind: 'house', name: 'Rumah pertama' }, hit: { x: -214, y: -237, w: 428, h: 337 }, draw: () => { const p = iso(0, -1); ctx.drawImage(this.house, p.x - 350, p.y - 390); } });
    items.push({ x: -3, y: 2.8, depth: -.2, selection: { kind: 'crate', name: 'Kotak persediaan kosong' }, hit: { x: -30, y: -36, w: 60, h: 52 }, draw: () => { const p = iso(-3, 2.8); ctx.save(); ctx.translate(p.x, p.y); this.drawCrate(); ctx.restore(); } });
    items.push({ x: -1.4, y: 3.1, depth: 1.7, selection: { kind: 'water', name: 'Persediaan awal' }, hit: { x: -51, y: -68, w: 102, h: 80 }, draw: () => { const p = iso(-1.4, 3.1); ctx.save(); ctx.translate(p.x, p.y); this.drawSupplies(); ctx.restore(); } });
    items.push({ x: .55, y: 2.2, depth: 2.75, selection: { kind: 'radio', name: 'Radio darurat' }, hit: { x: -20, y: -50, w: 40, h: 54 }, draw: () => { const p = iso(.55, 2.2); ctx.save(); ctx.translate(p.x, p.y); this.drawRadio(); ctx.restore(); } });
    items.push({ x: -5.5, y: 1.5, depth: -4, selection: { kind: 'plot', name: 'Lahan pembangunan' }, hit: { x: -70, y: -25, w: 140, h: 75 }, draw: () => { const p = iso(-5.5, 1.5); if (this.labels) { ctx.save(); ctx.globalAlpha = .7; this.drawName('Lahan kosong', p.x, p.y - 2); ctx.restore(); } } });
    // A sparse old agricultural fence. It does not enclose the settlement.
    for (let x = -6; x <= 6; x += 2) { const p = iso(x, -6.7); items.push({ x, y: -6.7, depth: x - 6.7, draw: () => { ctx.save(); ctx.translate(p.x, p.y); box(ctx, -.05, -.05, 0, .1, .1, 1.05, '#a28b60', '#8e7750', '#776446'); for (const z of [.35, .72]) path(ctx, [iso(0, 0, z), iso(1.8, 0, z - .12)], '#a0a68c', 1); ctx.restore(); } }); }
    for (let i = 0; i < 2; i++) { const x = -1 + i * 4 + Math.sin(time * .2 + i) * .13, y = -8.15 - i * .4, p = iso(x, y); items.push({ x, y, depth: x + y, selection: { kind: 'zombie', id: `zombie-${i}`, name: 'Zombie di luar lahan' }, hit: { x: -16, y: -56, w: 32, h: 59 }, draw: () => { ctx.save(); ctx.translate(p.x, p.y); this.drawActor({ id: `zombie-${i}`, name: '', role: '', activity: '', appearance: 'clay', joinedDay: 1 }, time + i, true, 1, false, true); ctx.restore(); } }); }
    let active = this.survivors;
    if (active.length > 29) { const start = Math.floor(time / 28) * 28 % active.length; active = [...active.slice(start), ...active.slice(0, start)].slice(0, 29); let reserved = 0; for (const id of [this.ownId, this.focusedId]) { const required = this.survivors.find(s => s.id === id); if (required && !active.some(s => s.id === required.id)) { active[active.length - 1 - reserved] = required; reserved++; } } }
    for (const s of [this.arga(), ...active]) { const p = this.actorPosition(s, time), v = iso(p.x, p.y); const own = s.id === this.ownId; items.push({ x: p.x, y: p.y, depth: p.x + p.y + .15, selection: { kind: 'survivor', id: s.id, name: s.name }, hit: { x: -18, y: -61, w: 36, h: 65 }, draw: () => { ctx.save(); ctx.translate(v.x, v.y); this.drawActor(s, time, p.walking, p.heading, own); ctx.restore(); } }); }
    items.sort((a, b) => a.depth - b.depth);
    for (const item of items) {
      const p = iso(item.x, item.y); const sx = ox + p.x * this.zoom, sy = oy + p.y * this.zoom;
      if (sx < -420 * this.zoom || sx > this.width + 420 * this.zoom || sy < -360 * this.zoom || sy > this.height + 360 * this.zoom) continue;
      item.draw(); if (item.selection && item.hit) { const h = item.hit; this.hits.push({ selection: item.selection, x: sx + h.x * this.zoom - 6, y: sy + h.y * this.zoom - 6, w: h.w * this.zoom + 12, h: h.h * this.zoom + 12 }); }
    }
    const own = active.find(s => s.id === this.ownId);
    if (this.labels && own) { const p = this.actorPosition(own, time), v = iso(p.x, p.y); this.drawName(own.name, v.x, v.y - 78, true); }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const vignette = ctx.createRadialGradient(this.width / 2, this.height * .5, this.width * .2, this.width / 2, this.height * .5, Math.max(this.width, this.height) * .85); vignette.addColorStop(0, 'rgba(231,235,196,0)'); vignette.addColorStop(1, 'rgba(206,220,181,.32)'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, this.width, this.height);
  }
}
