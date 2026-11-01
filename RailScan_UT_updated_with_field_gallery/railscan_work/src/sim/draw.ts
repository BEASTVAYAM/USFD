import { A_RANGE, B_DEPTH, B_WINDOW, GATE, PROBES, hash } from './engine';
import type { Engine, Rail } from './engine';

const M = { l: 44, r: 12, t: 12, b: 28 };
const GRID = '#1e3a34';
const GRID_MAJOR = '#2b5248';
const TEXT = '#7fb5a6';

function frame(ctx: CanvasRenderingContext2D, w: number, h: number, xLabel: (i: number) => string, yLabel: (i: number) => string, xTitle: string, yTitle: string) {
  const pw = w - M.l - M.r;
  const ph = h - M.t - M.b;
  ctx.fillStyle = '#04100d';
  ctx.fillRect(M.l, M.t, pw, ph);
  ctx.lineWidth = 1;
  ctx.font = '10px ui-monospace, monospace';
  ctx.fillStyle = TEXT;
  for (let i = 0; i <= 10; i++) {
    const x = M.l + (pw * i) / 10;
    const y = M.t + (ph * i) / 10;
    ctx.strokeStyle = i === 0 || i === 10 ? GRID_MAJOR : GRID;
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, M.t);
    ctx.lineTo(Math.round(x) + 0.5, M.t + ph);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(M.l, Math.round(y) + 0.5);
    ctx.lineTo(M.l + pw, Math.round(y) + 0.5);
    ctx.stroke();
    // minor ticks
    if (i < 10) {
      ctx.strokeStyle = GRID;
      for (let k = 1; k < 5; k++) {
        const xx = x + (pw / 10) * (k / 5);
        ctx.beginPath();
        ctx.moveTo(xx, M.t + ph);
        ctx.lineTo(xx, M.t + ph - 3);
        ctx.stroke();
        const yy = y + (ph / 10) * (k / 5);
        ctx.beginPath();
        ctx.moveTo(M.l, yy);
        ctx.lineTo(M.l + 3, yy);
        ctx.stroke();
      }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (i % 1 === 0) ctx.fillText(xLabel(i), x, M.t + ph + 4);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(yLabel(i), M.l - 5, y);
  }
  ctx.fillStyle = '#4f8a7b';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(xTitle, w - M.r, h - 1);
  ctx.save();
  ctx.translate(10, M.t + 6);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(yTitle, 0, 0);
  ctx.restore();
  return { pw, ph };
}

export function drawAScan(ctx: CanvasRenderingContext2D, w: number, h: number, eng: Engine, rail: Rail) {
  const { pw, ph } = frame(
    ctx,
    w,
    h,
    (i) => String(Math.round((A_RANGE * i) / 10)),
    (i) => String(100 - i * 10),
    'SOUND PATH (mm)',
    'AMP %',
  );
  // gate
  const gy = M.t + ph * (1 - GATE / 100);
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = 'rgba(250,204,21,0.7)';
  ctx.beginPath();
  ctx.moveTo(M.l, gy);
  ctx.lineTo(M.l + pw, gy);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(250,204,21,0.85)';
  ctx.font = '9px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`GATE ${GATE}%`, M.l + 4, gy - 1);

  ctx.save();
  ctx.beginPath();
  ctx.rect(M.l, M.t, pw, ph);
  ctx.clip();
  ctx.lineJoin = 'round';
  const step = 1;
  for (const p of PROBES) {
    const echoes = eng.echoes[rail][p.id];
    ctx.beginPath();
    for (let px = 0; px <= pw; px += step) {
      const path = (px / pw) * A_RANGE;
      let a = 1.2 + hash(eng.frame * 3.1 + px * 0.37 + p.id * 91 + (rail === 'LR' ? 0 : 500)) * 2.6;
      // main bang (initial pulse)
      a += 70 * Math.exp(-Math.pow(path / 2.6, 2)) * (p.id === 0 ? 1 : 0.55);
      for (const e of echoes) {
        const d = path - e.path;
        // oscillating pulse with envelope
        a += e.amp * Math.exp(-Math.pow(d / 2.6, 2)) * (0.85 + 0.15 * Math.cos(d * 2.2));
      }
      a = Math.min(100, a);
      const x = M.l + px;
      const y = M.t + ph * (1 - a / 100);
      if (px === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 4;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
  ctx.shadowBlur = 0;
}

export function bScanX(w: number, eng: Engine, pos: number) {
  const pw = w - M.l - M.r;
  return M.l + ((pos - (eng.pos - B_WINDOW)) / B_WINDOW) * pw;
}

export function bScanPosFromX(w: number, eng: Engine, x: number) {
  const pw = w - M.l - M.r;
  const frac = Math.min(1, Math.max(0, (x - M.l) / pw));
  return eng.pos - B_WINDOW + frac * B_WINDOW;
}

export function drawBScan(ctx: CanvasRenderingContext2D, w: number, h: number, eng: Engine, rail: Rail, hoverX: number | null) {
  const start = eng.pos - B_WINDOW;
  const { pw, ph } = frame(
    ctx,
    w,
    h,
    (i) => ((start + (B_WINDOW * i) / 10) / 1000).toFixed(1),
    (i) => String(Math.round((B_DEPTH * i) / 10)),
    'DISTANCE (m)',
    'DEPTH (mm)',
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(M.l, M.t, pw, ph);
  ctx.clip();

  // rail zones (head / web / foot)
  const zones = [
    { from: 0, to: 40, label: 'HEAD' },
    { from: 40, to: 130, label: 'WEB' },
    { from: 130, to: 172, label: 'FOOT' },
  ];
  ctx.font = '9px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  zones.forEach((z, i) => {
    const y0 = M.t + (z.from / B_DEPTH) * ph;
    const y1 = M.t + (z.to / B_DEPTH) * ph;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(80,140,120,0.07)' : 'rgba(80,140,120,0.02)';
    ctx.fillRect(M.l, y0, pw, y1 - y0);
    ctx.fillStyle = 'rgba(127,181,166,0.5)';
    ctx.fillText(z.label, M.l + 4, (y0 + y1) / 2);
  });
  // rail bottom line
  const yb = M.t + (172 / B_DEPTH) * ph;
  ctx.strokeStyle = 'rgba(127,181,166,0.35)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(M.l, yb);
  ctx.lineTo(M.l + pw, yb);
  ctx.stroke();
  ctx.setLineDash([]);

  // indications
  for (const ind of eng.indications[rail]) {
    const x = bScanX(w, eng, ind.pos);
    if (x < M.l - 6) continue;
    const y = M.t + (ind.depth / B_DEPTH) * ph;
    const p = PROBES[ind.probe];
    const r = 1.8 + (ind.amp / 100) * 3.2;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.55 + (ind.amp / 100) * 0.45;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 5;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // probe carriage marker
  const px = M.l + pw - 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px, M.t);
  ctx.lineTo(px, M.t + ph);
  ctx.stroke();
  ctx.lineWidth = 1;

  // flags
  for (const f of eng.flags) {
    if (f.rail !== rail) continue;
    const x = bScanX(w, eng, f.pos);
    if (x < M.l || x > M.l + pw + 1) continue;
    ctx.strokeStyle = f.color;
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, M.t);
    ctx.lineTo(x, M.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.moveTo(x, M.t + 2);
    ctx.lineTo(x + 16, M.t + 8);
    ctx.lineTo(x, M.t + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 1, M.t, 2, 30);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`#${f.id}`, x + 4, M.t + 16);
  }

  // hover line
  if (hoverX !== null && !eng.running) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(hoverX, M.t);
    ctx.lineTo(hoverX, M.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);
    const pos = bScanPosFromX(w, eng, hoverX);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    const tx = Math.min(hoverX + 6, M.l + pw - 78);
    ctx.fillRect(tx, M.t + ph - 20, 74, 16);
    ctx.fillStyle = '#e2fff6';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${(pos / 1000).toFixed(3)} m`, tx + 5, M.t + ph - 12);
  }
  ctx.restore();
}

/** decorative waveform for the login page */
export function drawLoginWave(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(52,211,153,0.07)';
  for (let x = 0; x <= w; x += w / 10) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += h / 10) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const tt = t / 1000;
  PROBES.forEach((p, i) => {
    ctx.beginPath();
    const c1 = 0.2 + ((i * 0.083 + tt * 0.03) % 0.7);
    const c2 = 0.25 + ((i * 0.11 + 0.4 + tt * 0.02) % 0.65);
    for (let x = 0; x <= w; x += 2) {
      const f = x / w;
      let a = 0.02 + hash(x * 0.37 + Math.floor(tt * 14) + i * 31) * 0.03;
      a += 0.9 * Math.exp(-Math.pow(f / 0.012, 2));
      a += (0.35 + 0.4 * hash(i + 3)) * Math.exp(-Math.pow((f - c1) / 0.01, 2));
      a += (0.2 + 0.3 * hash(i + 9)) * Math.exp(-Math.pow((f - c2) / 0.01, 2));
      const y = h - 20 - a * (h - 60);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = 0.55;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}
