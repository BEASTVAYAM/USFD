import { GATE, PROBES, hash } from '../sim/engine';
import type { Rail } from '../sim/engine';
import type { InspectionException, ScanPoint } from './inspection';

const MARGIN = { left: 48, right: 14, top: 14, bottom: 30 };
const BG = '#04100d';
const GRID = '#1c3932';
const MAJOR = '#2b584c';
const TEXT = '#75a99b';

function grid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  xLabel: (index: number) => string,
  yLabel: (index: number) => string,
  xTitle: string,
  yTitle: string,
) {
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  ctx.fillStyle = BG;
  ctx.fillRect(MARGIN.left, MARGIN.top, plotWidth, plotHeight);
  ctx.font = '10px ui-monospace, monospace';
  for (let index = 0; index <= 10; index++) {
    const x = MARGIN.left + (plotWidth * index) / 10;
    const y = MARGIN.top + (plotHeight * index) / 10;
    ctx.strokeStyle = index === 0 || index === 10 ? MAJOR : GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, MARGIN.top);
    ctx.lineTo(Math.round(x) + 0.5, MARGIN.top + plotHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(MARGIN.left, Math.round(y) + 0.5);
    ctx.lineTo(MARGIN.left + plotWidth, Math.round(y) + 0.5);
    ctx.stroke();
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(xLabel(index), x, MARGIN.top + plotHeight + 5);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(yLabel(index), MARGIN.left - 6, y);
  }
  ctx.fillStyle = '#4f8a7b';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(xTitle, width - MARGIN.right, height - 1);
  ctx.save();
  ctx.translate(10, MARGIN.top + 4);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(yTitle, 0, 0);
  ctx.restore();
  return { plotWidth, plotHeight };
}

function nearestByProbe(points: ScanPoint[], rail: Rail, positionMm: number, active: Set<number>) {
  const result = new Map<number, { point: ScanPoint; delta: number }[]>();
  for (const point of points) {
    if (point.rail !== rail || !active.has(point.probe)) continue;
    const list = result.get(point.probe) ?? [];
    list.push({ point, delta: Math.abs(point.distanceMm - positionMm) });
    list.sort((a, b) => a.delta - b.delta);
    if (list.length > 6) list.pop();
    result.set(point.probe, list);
  }
  return new Map([...result].map(([probe, values]) => [probe, values.map((value) => value.point)]));
}

export function drawImportedAScan(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: ScanPoint[],
  rail: Rail,
  positionMm: number,
  active: Set<number>,
  gate = GATE,
  filled = false,
) {
  const range = 300;
  const { plotWidth, plotHeight } = grid(
    ctx,
    width,
    height,
    (index) => String((range * index) / 10),
    (index) => String(100 - index * 10),
    'SOUND PATH (mm)',
    'AMP %',
  );
  const gateY = MARGIN.top + plotHeight * (1 - gate / 100);
  ctx.strokeStyle = 'rgba(250,204,21,0.8)';
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(MARGIN.left, gateY);
  ctx.lineTo(MARGIN.left + plotWidth, gateY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#facc15';
  ctx.font = '9px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`G1 ${gate}%`, MARGIN.left + 4, gateY - 2);

  const echoes = nearestByProbe(points, rail, positionMm, active);
  ctx.save();
  ctx.beginPath();
  ctx.rect(MARGIN.left, MARGIN.top, plotWidth, plotHeight);
  ctx.clip();
  for (const [probeId, selected] of echoes) {
    const probe = PROBES[probeId];
    const coordinates: [number, number][] = [];
    for (let pixel = 0; pixel <= plotWidth; pixel += 1) {
      const soundPath = (pixel / plotWidth) * range;
      let amplitude = 0.6 + hash(pixel * 0.71 + positionMm * 0.003 + probeId * 39) * 1.8;
      amplitude += 68 * Math.exp(-Math.pow(soundPath / 2.8, 2));
      if (probeId === 0) amplitude += 42 * Math.exp(-Math.pow((soundPath - 172) / 3.2, 2));
      for (const echo of selected) {
        const delta = soundPath - echo.soundPathMm;
        amplitude += echo.amplitude * Math.exp(-Math.pow(delta / 3.5, 2)) * (0.87 + 0.13 * Math.cos(delta * 2.2));
      }
      amplitude = Math.min(100, amplitude);
      coordinates.push([MARGIN.left + pixel, MARGIN.top + plotHeight * (1 - amplitude / 100)]);
    }
    if (filled && active.size === 1) {
      ctx.beginPath();
      ctx.moveTo(coordinates[0][0], MARGIN.top + plotHeight);
      coordinates.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(coordinates[coordinates.length - 1][0], MARGIN.top + plotHeight);
      ctx.closePath();
      ctx.fillStyle = `${probe.color}55`;
      ctx.fill();
    }
    ctx.beginPath();
    coordinates.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = probe.color;
    ctx.shadowColor = probe.color;
    ctx.shadowBlur = 4;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
  ctx.shadowBlur = 0;
}

export interface BScanDrawOptions {
  rail: Rail;
  active: Set<number>;
  gate: number;
  cursorMm: number;
  offsetMm?: number;
  exceptions?: InspectionException[];
  selectedException?: string | null;
}

export function drawImportedBScan(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: ScanPoint[],
  options: BScanDrawOptions,
) {
  const filtered = points.filter((point) => point.rail === options.rail && options.active.has(point.probe));
  const bounds = filtered.reduce(
    (value, point) => ({ min: Math.min(value.min, point.distanceMm), max: Math.max(value.max, point.distanceMm) }),
    { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
  );
  const min = filtered.length ? bounds.min : 0;
  const max = filtered.length ? bounds.max : 1000;
  const span = Math.max(1, max - min);
  const { plotWidth, plotHeight } = grid(
    ctx,
    width,
    height,
    (index) => ((min + (span * index) / 10) / 1000).toFixed(1),
    (index) => String(index * 20),
    'DISTANCE (m)',
    'DEPTH (mm)',
  );

  ctx.save();
  ctx.beginPath();
  ctx.rect(MARGIN.left, MARGIN.top, plotWidth, plotHeight);
  ctx.clip();

  for (const point of filtered) {
    if (point.amplitude < Math.max(5, options.gate * 0.45)) continue;
    const adjusted = point.distanceMm + (options.offsetMm ?? 0);
    const x = MARGIN.left + ((adjusted - min) / span) * plotWidth;
    const y = MARGIN.top + (Math.min(200, point.depthMm) / 200) * plotHeight;
    const size = 1 + Math.min(4, point.amplitude / 24);
    const probe = PROBES[point.probe];
    ctx.globalAlpha = point.amplitude >= options.gate ? 0.9 : 0.24;
    ctx.fillStyle = probe.color;
    if (point.amplitude >= options.gate) {
      ctx.shadowColor = probe.color;
      ctx.shadowBlur = 4;
    }
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  for (const item of options.exceptions ?? []) {
    if (item.rail !== options.rail) continue;
    const x0 = MARGIN.left + ((item.fromMm - min) / span) * plotWidth;
    const x1 = MARGIN.left + ((item.toMm - min) / span) * plotWidth;
    const y = MARGIN.top + (Math.min(200, item.depthMm) / 200) * plotHeight;
    const selected = item.id === options.selectedException;
    if (selected) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x0 - 6, MARGIN.top, Math.max(12, x1 - x0 + 12), plotHeight);
    }
    ctx.strokeStyle = selected ? '#ffffff' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(x0 - 4, y - 8, Math.max(8, x1 - x0 + 8), 16);
  }

  const cursorX = MARGIN.left + ((options.cursorMm - min) / span) * plotWidth;
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cursorX, MARGIN.top);
  ctx.lineTo(cursorX, MARGIN.top + plotHeight);
  ctx.stroke();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(cursorX, MARGIN.top);
  ctx.lineTo(cursorX - 5, MARGIN.top + 7);
  ctx.lineTo(cursorX + 5, MARGIN.top + 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}