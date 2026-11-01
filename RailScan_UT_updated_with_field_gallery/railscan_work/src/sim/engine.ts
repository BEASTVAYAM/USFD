export type Rail = 'LR' | 'RR';
export const RAILS: Rail[] = ['LR', 'RR'];

export interface ProbeDef {
  id: number;
  angle: number;
  label: string; // e.g. 37° Fwd
  short: string;
  color: string;
  zone: string;
}

export const PROBES: ProbeDef[] = [
  { id: 0, angle: 0, label: '0° Straight', short: '0°', color: '#ff3b30', zone: 'Head / Web / Foot' },
  { id: 1, angle: 70, label: 'CF · 70° Centre Forward', short: 'CF', color: '#ff2b9d', zone: 'Centre head' },
  { id: 2, angle: 70, label: 'CR · 70° Centre Reverse', short: 'CR', color: '#23b14d', zone: 'Centre head' },
  { id: 3, angle: 37, label: '37F · 37° Forward', short: '37F', color: '#3157ff', zone: 'Web / Bolt hole' },
  { id: 4, angle: 37, label: '37R · 37° Reverse', short: '37R', color: '#b6483c', zone: 'Web / Bolt hole' },
  { id: 5, angle: 70, label: 'GFF · 70° Gauge Forward', short: 'GFF', color: '#558789', zone: 'Gauge corner' },
  { id: 6, angle: 70, label: 'GFR · 70° Gauge Reverse', short: 'GFR', color: '#8a9626', zone: 'Gauge corner' },
  { id: 7, angle: 70, label: 'FF · 70° Field Forward', short: 'FF', color: '#9b4aa4', zone: 'Field corner' },
  { id: 8, angle: 70, label: 'FR · 70° Field Reverse', short: 'FR', color: '#2d2d73', zone: 'Field corner' },
];

export const A_RANGE = 300; // mm of sound path on A-scan X axis
export const B_DEPTH = 200; // mm depth on B-scan Y axis
export const B_WINDOW = 3000; // mm of rail shown on B-scan X axis
export const GATE = 20; // % threshold
export const BACKWALL = 172; // rail height, mm
const TRACK = 150000;

export interface DefectType {
  name: string;
  depth: [number, number];
  sens: number[];
  len: [number, number];
}

export const DEFECT_TYPES: DefectType[] = [
  { name: 'Transverse head crack', depth: [8, 25], sens: [0.25, 0.5, 0.4, 0.95, 0.8, 0.5, 0.4, 0.3, 0.3], len: [20, 60] },
  { name: 'Horizontal split (head)', depth: [15, 38], sens: [0.95, 0.2, 0.2, 0.3, 0.3, 0.2, 0.2, 0.4, 0.4], len: [50, 160] },
  { name: 'Web / bolt-hole crack', depth: [60, 105], sens: [0.4, 0.9, 0.8, 0.2, 0.2, 0.85, 0.75, 0.1, 0.1], len: [25, 90] },
  { name: 'Vertical split head', depth: [20, 45], sens: [0.3, 0.2, 0.2, 0.5, 0.5, 0.2, 0.2, 0.95, 0.9], len: [60, 200] },
  { name: 'Foot crack', depth: [150, 168], sens: [0.5, 0.8, 0.7, 0, 0, 0.8, 0.7, 0, 0], len: [20, 70] },
  { name: 'Weld defect', depth: [30, 120], sens: [0.6, 0.7, 0.7, 0.6, 0.6, 0.7, 0.7, 0.5, 0.5], len: [30, 100] },
];

export interface Defect {
  id: string;
  rail: Rail;
  pos: number;
  depth: number;
  len: number;
  type: number;
  strength: number;
}

export interface Severity {
  key: 'none' | 'minor' | 'moderate' | 'severe' | 'critical';
  label: string;
  color: string;
  action: string;
}

export const SEVERITIES: Severity[] = [
  { key: 'none', label: 'No defect', color: '#64748b', action: 'Continue' },
  { key: 'minor', label: 'Minor', color: '#22c55e', action: 'Monitor' },
  { key: 'moderate', label: 'Moderate', color: '#facc15', action: 'Re-test' },
  { key: 'severe', label: 'Severe', color: '#fb923c', action: 'Speed restriction' },
  { key: 'critical', label: 'Critical', color: '#ef4444', action: 'Replace / Stop traffic' },
];

export function severityOf(amp: number): Severity {
  if (amp >= 80) return SEVERITIES[4];
  if (amp >= 60) return SEVERITIES[3];
  if (amp >= 40) return SEVERITIES[2];
  if (amp >= GATE) return SEVERITIES[1];
  return SEVERITIES[0];
}

export interface Indication {
  probe: number;
  pos: number;
  depth: number;
  amp: number;
}

export interface Echo {
  path: number;
  amp: number;
}

export interface Flag {
  id: number;
  rail: Rail;
  pos: number;
  kind: string;
  color: string;
  note: string;
  time: string;
}

export const FLAG_KINDS = [
  { kind: 'Defect – verify manually', color: '#ef4444' },
  { kind: 'Mark for repair', color: '#fb923c' },
  { kind: 'Re-test required', color: '#a855f7' },
  { kind: 'Weld joint', color: '#38bdf8' },
  { kind: 'Checked – OK', color: '#22c55e' },
  { kind: 'Speed restriction', color: '#facc15' },
];

export interface LogEntry {
  id: string;
  rail: Rail;
  pos: number;
  type: string;
  depth: number;
  len: number;
  maxAmp: number;
  probe: number;
}

export interface ActiveDefect {
  defect: Defect;
  amp: number;
  probe: number;
}

// deterministic PRNG
function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function genDefects(rail: Rail, seed: number): Defect[] {
  const r = mulberry(seed);
  const out: Defect[] = [];
  let p = B_WINDOW + 1200;
  let i = 0;
  while (p < TRACK) {
    const type = Math.floor(r() * DEFECT_TYPES.length);
    const t = DEFECT_TYPES[type];
    out.push({
      id: `${rail}-${i++}`,
      rail,
      pos: p,
      depth: t.depth[0] + r() * (t.depth[1] - t.depth[0]),
      len: t.len[0] + r() * (t.len[1] - t.len[0]),
      type,
      strength: 45 + r() * 65,
    });
    p += 1300 + r() * 2200;
  }
  return out;
}

const PROBE_SPREAD = 55; // mm spacing between probes along carriage

export class Engine {
  pos = B_WINDOW;
  speed = 600; // mm/s
  running = true;
  frame = 0;
  defects: Record<Rail, Defect[]> = { LR: genDefects('LR', 11), RR: genDefects('RR', 29) };
  indications: Record<Rail, Indication[]> = { LR: [], RR: [] };
  lastPush: Record<Rail, number[]> = { LR: PROBES.map(() => -1e9), RR: PROBES.map(() => -1e9) };
  echoes: Record<Rail, Echo[][]> = { LR: PROBES.map(() => []), RR: PROBES.map(() => []) };
  live: Record<Rail, number[]> = { LR: PROBES.map(() => 0), RR: PROBES.map(() => 0) };
  hold: Record<Rail, number> = { LR: 0, RR: 0 };
  active: Record<Rail, ActiveDefect | null> = { LR: null, RR: null };
  log = new Map<string, LogEntry>();
  flags: Flag[] = [];
  private flagId = 1;
  private acc = 0;

  probePos(i: number) {
    return this.pos + (i - 4) * PROBE_SPREAD;
  }

  update(dt: number) {
    if (!this.running) return;
    dt = Math.min(dt, 0.05);
    this.frame++;
    this.pos += this.speed * dt;
    if (this.pos > TRACK - 500) this.reset();
    this.acc += dt;
    for (const rail of RAILS) this.sample(rail, dt);
  }

  reset() {
    this.pos = B_WINDOW;
    this.indications = { LR: [], RR: [] };
    this.lastPush = { LR: PROBES.map(() => -1e9), RR: PROBES.map(() => -1e9) };
  }

  private sample(rail: Rail, dt: number) {
    const near = this.defects[rail].filter((d) => Math.abs(d.pos - this.pos) < 700);
    let best: ActiveDefect | null = null;
    for (const p of PROBES) {
      const pp = this.probePos(p.id);
      const echoes: Echo[] = [];
      let liveMax = 0;
      const cos = Math.cos((p.angle * Math.PI) / 180);
      for (const d of near) {
        const half = d.len / 2;
        const dx = Math.max(0, Math.abs(pp - d.pos) - half);
        const env = Math.exp(-Math.pow(dx / 55, 2));
        let amp = d.strength * DEFECT_TYPES[d.type].sens[p.id] * env;
        if (amp < 4) continue;
        amp *= 0.93 + hash(this.frame * 7 + p.id * 3 + d.pos) * 0.14;
        amp = Math.min(100, amp);
        const path = d.depth / cos + (hash(this.frame + p.id) - 0.5) * 1.2;
        if (path < A_RANGE) echoes.push({ path, amp });
        if (amp > liveMax) liveMax = amp;
        if (amp >= GATE) {
          // log
          const e = this.log.get(d.id);
          if (!e) {
            this.log.set(d.id, {
              id: d.id,
              rail,
              pos: d.pos,
              type: DEFECT_TYPES[d.type].name,
              depth: d.depth,
              len: d.len,
              maxAmp: amp,
              probe: p.id,
            });
          } else if (amp > e.maxAmp) {
            e.maxAmp = amp;
            e.probe = p.id;
          }
          // B-scan indication
          if (Math.abs(pp - this.lastPush[rail][p.id]) >= 14) {
            this.lastPush[rail][p.id] = pp;
            this.indications[rail].push({
              probe: p.id,
              pos: pp,
              depth: d.depth + (hash(pp + p.id) - 0.5) * 3,
              amp,
            });
          }
          if (!best || amp > best.amp) best = { defect: d, amp, probe: p.id };
        }
      }
      if (p.id === 0) {
        const bw = Math.max(4, 80 - liveMax * 0.75);
        echoes.push({ path: BACKWALL, amp: bw });
      }
      this.echoes[rail][p.id] = echoes;
      this.live[rail][p.id] = liveMax;
    }
    this.active[rail] = best;
    const cur = Math.max(...this.live[rail]);
    this.hold[rail] = Math.max(cur, this.hold[rail] - dt * 25);
    // prune
    const arr = this.indications[rail];
    const minPos = this.pos - B_WINDOW - 400;
    if (arr.length && arr[0].pos < minPos) {
      this.indications[rail] = arr.filter((i) => i.pos >= minPos);
    }
  }

  addFlag(rail: Rail, pos: number, kind: string, color: string, note: string) {
    this.flags.push({
      id: this.flagId++,
      rail,
      pos,
      kind,
      color,
      note,
      time: new Date().toLocaleTimeString(),
    });
  }

  removeFlag(id: number) {
    this.flags = this.flags.filter((f) => f.id !== id);
  }
}
