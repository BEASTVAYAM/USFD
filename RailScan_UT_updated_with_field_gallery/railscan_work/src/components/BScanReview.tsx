import { useEffect, useMemo, useRef, useState } from 'react';
import CanvasView from './CanvasView';
import ProbeSelector from './ProbeSelector';
import { drawImportedAScan, drawImportedBScan } from '../data/drawImported';
import { buildExceptions } from '../data/inspection';
import type { InspectionDataset } from '../data/inspection';
import { GATE, PROBES, severityOf } from '../sim/engine';
import type { Rail } from '../sim/engine';

interface Props {
  dataset: InspectionDataset;
  onOpenExceptions: () => void;
}

function saveCharts(container: HTMLElement | null, reportNo: string) {
  const canvases = Array.from(container?.querySelectorAll('canvas') ?? []);
  if (!canvases.length) return;
  const width = Math.max(...canvases.map((canvas) => canvas.width));
  const height = canvases.reduce((sum, canvas) => sum + canvas.height, 0);
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const context = output.getContext('2d');
  if (!context) return;
  context.fillStyle = '#04100d';
  context.fillRect(0, 0, width, height);
  let y = 0;
  canvases.forEach((canvas) => {
    context.drawImage(canvas, 0, y);
    y += canvas.height;
  });
  const anchor = document.createElement('a');
  anchor.href = output.toDataURL('image/png');
  anchor.download = `${reportNo}_bscan.png`;
  anchor.click();
}

export default function BScanReview({ dataset, onOpenExceptions }: Props) {
  const exceptions = useMemo(() => buildExceptions(dataset.points), [dataset]);
  const { minDistance, maxDistance } = dataset.points.reduce(
    (bounds, point) => ({
      minDistance: Math.min(bounds.minDistance, point.distanceMm),
      maxDistance: Math.max(bounds.maxDistance, point.distanceMm),
    }),
    { minDistance: Number.POSITIVE_INFINITY, maxDistance: Number.NEGATIVE_INFINITY },
  );
  const [rail, setRail] = useState<Rail>('LR');
  const [cursor, setCursor] = useState(minDistance);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [active, setActive] = useState(new Set(PROBES.map((probe) => probe.id)));
  const [envelope, setEnvelope] = useState(false);
  const [ror, setRor] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const chartsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    const update = (now: number) => {
      const delta = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      setCursor((current) => {
        const next = current + 320 * speed * delta;
        return next > maxDistance ? minDistance : next;
      });
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [maxDistance, minDistance, playing, speed]);

  const primaryChannel = active.values().next().value as number | undefined;
  const envelopeChannels = envelope && primaryChannel !== undefined ? new Set([primaryChannel]) : active;
  const near = dataset.points
    .filter((point) => point.rail === rail && active.has(point.probe))
    .sort((a, b) => Math.abs(a.distanceMm - cursor) - Math.abs(b.distanceMm - cursor))[0];

  const chooseException = (id: string) => {
    const item = exceptions.find((exception) => exception.id === id);
    if (!item) return;
    setSelected(item.id);
    setRail(item.rail);
    setCursor((item.fromMm + item.toMm) / 2);
    setPlaying(false);
  };

  const clickPosition = (x: number, width: number) => {
    const fraction = Math.min(1, Math.max(0, (x - 48) / Math.max(1, width - 62)));
    setCursor(minDistance + fraction * (maxDistance - minDistance));
    setPlaying(false);
  };

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-5 space-y-4">
      <header className="flex flex-wrap items-end gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-400">Synchronized review</div>
          <h1 className="text-2xl font-semibold mt-1">Ultrasonic B-scan test report</h1>
          <p className="text-sm text-emerald-100/45 mt-1">A-scan follows the B-scan cursor · all probe colours are preserved</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={onOpenExceptions} className="rounded-lg border border-emerald-800 px-3 py-2 text-xs hover:bg-emerald-900/40">Exception report</button>
          <button onClick={() => saveCharts(chartsRef.current, dataset.meta.reportNo)} className="rounded-lg bg-emerald-500 text-emerald-950 font-semibold px-3 py-2 text-xs hover:bg-emerald-400">Save scan image</button>
        </div>
      </header>

      <section className="rounded-xl border border-emerald-900/70 bg-[#06161a] overflow-hidden">
        <div className="grid xl:grid-cols-[1fr_300px]">
          <div className="min-w-0 border-b xl:border-b-0 xl:border-r border-emerald-900/60">
            <div className="px-4 py-3 bg-[#071c1f] border-b border-emerald-900/60 flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg border border-emerald-800 overflow-hidden">
                {(['LR', 'RR'] as Rail[]).map((side) => (
                  <button key={side} onClick={() => setRail(side)} disabled={ror} className={`px-4 py-1.5 text-xs font-semibold disabled:opacity-40 ${rail === side ? 'bg-emerald-400 text-emerald-950' : 'text-emerald-100/60'}`}>
                    {side === 'LR' ? 'Left Rail' : 'Right Rail'}
                  </button>
                ))}
              </div>
              <span className="font-mono text-xs text-emerald-200/60">Cursor {(cursor / 1000).toFixed(3)} m</span>
              {near && (
                <span className="text-xs ml-auto flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PROBES[near.probe].color }} />
                  {PROBES[near.probe].short} · {near.amplitude.toFixed(0)}% · depth {near.depthMm.toFixed(0)} mm
                </span>
              )}
            </div>

            <div ref={chartsRef} className="p-3 space-y-3">
              {ror ? (
                <>
                  <div className="grid lg:grid-cols-2 gap-3">
                    {(['LR', 'RR'] as Rail[]).map((side) => (
                      <div key={side}>
                        <div className="text-[10px] uppercase tracking-wider text-emerald-300/50 px-1 mb-1">{side} A-scan {side === 'RR' && offset ? `· offset ${offset} mm` : ''}</div>
                        <CanvasView className="block w-full h-[230px]" animate={false} draw={(ctx, width, height) => drawImportedAScan(ctx, width, height, dataset.points, side, cursor + (side === 'RR' ? offset : 0), envelopeChannels, GATE, envelope)} />
                      </div>
                    ))}
                  </div>
                  <div className="grid lg:grid-cols-2 gap-3">
                    {(['LR', 'RR'] as Rail[]).map((side) => (
                      <div key={side}>
                        <div className="text-[10px] uppercase tracking-wider text-emerald-300/50 px-1 mb-1">{side} B-scan comparison</div>
                        <CanvasView
                          className="block w-full h-[270px] cursor-crosshair"
                          animate={false}
                          draw={(ctx, width, height) => drawImportedBScan(ctx, width, height, dataset.points, { rail: side, active, gate: GATE, cursorMm: cursor, offsetMm: side === 'RR' ? offset : 0, exceptions, selectedException: selected })}
                          onClick={(x, _y, width) => clickPosition(x, width)}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-300/50 px-1 mb-1">A-scan · position linked to B-scan cursor</div>
                    <CanvasView className="block w-full h-[270px]" animate={false} draw={(ctx, width, height) => drawImportedAScan(ctx, width, height, dataset.points, rail, cursor, envelopeChannels, GATE, envelope)} />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-300/50 px-1 mb-1">B-scan · click to move cursor</div>
                    <CanvasView
                      className="block w-full h-[330px] cursor-crosshair"
                      animate={false}
                      draw={(ctx, width, height) => drawImportedBScan(ctx, width, height, dataset.points, { rail, active, gate: GATE, cursorMm: cursor, exceptions, selectedException: selected })}
                      onClick={(x, _y, width) => clickPosition(x, width)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-4 py-3 border-t border-emerald-900/60 bg-[#071c1f] flex flex-wrap items-center gap-2">
              <button onClick={() => setPlaying(true)} disabled={playing} className="rounded-md border border-emerald-800 px-3 py-1.5 text-xs disabled:opacity-35 hover:bg-emerald-900/40">Play</button>
              <button onClick={() => setPlaying(false)} disabled={!playing} className="rounded-md border border-emerald-800 px-3 py-1.5 text-xs disabled:opacity-35 hover:bg-emerald-900/40">Pause</button>
              <button onClick={() => setEnvelope((value) => !value)} className={`rounded-md border px-3 py-1.5 text-xs ${envelope ? 'border-fuchsia-400 text-fuchsia-300 bg-fuchsia-400/10' : 'border-emerald-800'}`}>Envelope</button>
              <button onClick={() => setRor((value) => !value)} className={`rounded-md border px-3 py-1.5 text-xs ${ror ? 'border-cyan-400 text-cyan-300 bg-cyan-400/10' : 'border-emerald-800'}`}>Run-on-run (ROR)</button>
              <label className="ml-auto flex items-center gap-2 text-xs text-emerald-100/55">Play speed
                <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="rounded bg-[#071d17] border border-emerald-900 px-2 py-1 outline-none">
                  <option value={0.5}>0.5x</option><option value={1}>1x</option><option value={2}>2x</option><option value={5}>5x</option><option value={10}>10x</option>
                </select>
              </label>
              {ror && <label className="flex items-center gap-2 text-xs text-emerald-100/55">RR offset
                <input type="number" value={offset} onChange={(event) => setOffset(Number(event.target.value))} className="w-20 rounded bg-[#071d17] border border-emerald-900 px-2 py-1 font-mono outline-none" /> mm
              </label>}
            </div>
          </div>

          <aside className="p-4 space-y-5">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-emerald-300/60 mb-2">Channel visibility</h2>
              <ProbeSelector active={active} onChange={setActive} />
            </div>
            <div className="border-t border-emerald-900/60 pt-4">
              <h2 className="text-xs uppercase tracking-wider text-emerald-300/60 mb-2">Detected indications</h2>
              <div className="max-h-64 overflow-auto -mx-1">
                {exceptions.map((item) => {
                  const severity = severityOf(item.peakAmp);
                  return (
                    <button key={item.id} onClick={() => chooseException(item.id)} className={`w-full text-left px-2 py-2 border-b border-emerald-900/40 hover:bg-emerald-900/25 ${selected === item.id ? 'bg-emerald-900/40' : ''}`}>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ background: severity.color }} />
                        <span className="font-semibold">{item.id}</span>
                        <span className="font-mono text-emerald-100/50">{item.rail} · {(item.fromMm / 1000).toFixed(3)} m</span>
                      </div>
                      <div className="mt-1 text-[11px] text-emerald-100/45 truncate">{item.defectType} · {item.peakAmp.toFixed(0)}%</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}