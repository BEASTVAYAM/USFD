import { useMemo, useRef, useState } from 'react';
import CanvasView from './CanvasView';
import ProbeSelector from './ProbeSelector';
import { drawImportedAScan } from '../data/drawImported';
import { buildExceptions, downloadFile, exceptionCsv } from '../data/inspection';
import type { InspectionDataset } from '../data/inspection';
import { GATE, PROBES } from '../sim/engine';
import type { Rail } from '../sim/engine';

interface Props {
  dataset: InspectionDataset;
  onOpenExceptions: () => void;
  onOpenBScan: () => void;
}

function saveCanvas(container: HTMLElement | null, name: string) {
  const canvas = container?.querySelector('canvas');
  if (!canvas) return;
  const anchor = document.createElement('a');
  anchor.href = canvas.toDataURL('image/png');
  anchor.download = name;
  anchor.click();
}

export default function AScanReview({ dataset, onOpenExceptions, onOpenBScan }: Props) {
  const { minDistance, maxDistance } = dataset.points.reduce(
    (bounds, point) => ({
      minDistance: Math.min(bounds.minDistance, point.distanceMm),
      maxDistance: Math.max(bounds.maxDistance, point.distanceMm),
    }),
    { minDistance: Number.POSITIVE_INFINITY, maxDistance: Number.NEGATIVE_INFINITY },
  );
  const exceptions = useMemo(() => buildExceptions(dataset.points), [dataset]);
  const [rail, setRail] = useState<Rail>('LR');
  const [position, setPosition] = useState(exceptions[0]?.fromMm ?? minDistance);
  const [active, setActive] = useState(new Set(PROBES.map((probe) => probe.id)));
  const [filled, setFilled] = useState(false);
  const [gate, setGate] = useState(GATE);
  const chartRef = useRef<HTMLDivElement>(null);

  const nearest = useMemo(() => {
    return dataset.points
      .filter((point) => point.rail === rail && active.has(point.probe))
      .sort((a, b) => Math.abs(a.distanceMm - position) - Math.abs(b.distanceMm - position))[0];
  }, [active, dataset, position, rail]);
  const severityHits = exceptions.filter((item) => item.rail === rail);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-5 space-y-4">
      <header className="flex flex-wrap items-end gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-400">Imported data review</div>
          <h1 className="text-2xl font-semibold mt-1">Ultrasonic A-scan test report</h1>
          <p className="text-sm text-emerald-100/45 mt-1">{dataset.name} · {dataset.points.length.toLocaleString()} validated records</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={onOpenBScan} className="rounded-lg border border-emerald-800 px-3 py-2 text-xs hover:bg-emerald-900/40">Open B-scan</button>
          <button
            onClick={() => downloadFile(`${dataset.meta.reportNo}_exceptions.csv`, exceptionCsv(exceptions))}
            className="rounded-lg border border-emerald-800 px-3 py-2 text-xs hover:bg-emerald-900/40"
          >
            Export TMS CSV
          </button>
          <button onClick={() => saveCanvas(chartRef.current, `${dataset.meta.reportNo}_ascan.png`)} className="rounded-lg bg-emerald-500 text-emerald-950 font-semibold px-3 py-2 text-xs hover:bg-emerald-400">Save chart</button>
        </div>
      </header>

      <section className="rounded-xl border border-emerald-900/70 bg-[#06161a] overflow-hidden">
        <div className="grid xl:grid-cols-[1fr_300px]">
          <div className="min-w-0 border-b xl:border-b-0 xl:border-r border-emerald-900/60">
            <div className="px-4 py-3 border-b border-emerald-900/60 flex flex-wrap items-center gap-3 bg-[#071c1f]">
              <div className="flex rounded-lg border border-emerald-800 overflow-hidden">
                {(['LR', 'RR'] as Rail[]).map((side) => (
                  <button key={side} onClick={() => setRail(side)} className={`px-4 py-1.5 text-xs font-semibold ${rail === side ? 'bg-emerald-400 text-emerald-950' : 'text-emerald-100/60'}`}>
                    {side === 'LR' ? 'Left Rail' : 'Right Rail'}
                  </button>
                ))}
              </div>
              <select
                value={`${rail}-${position}`}
                onChange={(event) => {
                  const item = exceptions.find((exception) => `${exception.rail}-${exception.fromMm}` === event.target.value);
                  if (item) {
                    setRail(item.rail);
                    setPosition((item.fromMm + item.toMm) / 2);
                  }
                }}
                className="rounded-md bg-[#071d17] border border-emerald-900 px-2 py-1.5 text-xs outline-none"
              >
                <option value={`${rail}-${position}`}>Current set · {(position / 1000).toFixed(3)} m</option>
                {exceptions.map((item) => <option key={item.id} value={`${item.rail}-${item.fromMm}`}>{item.id} · {item.rail} · {(item.fromMm / 1000).toFixed(3)} m · {item.peakAmp.toFixed(0)}%</option>)}
              </select>
              <label className="flex items-center gap-2 text-xs ml-auto">
                <input type="checkbox" checked={filled} onChange={(event) => setFilled(event.target.checked)} className="accent-emerald-400" />
                Filled envelope
              </label>
            </div>
            <div ref={chartRef} className="p-3">
              <CanvasView
                className="block w-full h-[440px]"
                animate={false}
                draw={(ctx, width, height) => drawImportedAScan(ctx, width, height, dataset.points, rail, position, active, gate, filled)}
              />
            </div>
            <div className="px-5 pb-4">
              <div className="flex justify-between text-[10px] font-mono text-emerald-100/45 mb-1">
                <span>{(minDistance / 1000).toFixed(3)} m</span>
                <span className="text-emerald-300">Cursor {(position / 1000).toFixed(3)} m</span>
                <span>{(maxDistance / 1000).toFixed(3)} m</span>
              </div>
              <input type="range" min={minDistance} max={maxDistance} step={10} value={position} onChange={(event) => setPosition(Number(event.target.value))} className="w-full accent-emerald-400" />
            </div>
          </div>

          <aside className="p-4 space-y-5">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-emerald-300/60 mb-2">Active channels</h2>
              <ProbeSelector active={active} onChange={setActive} />
            </div>
            <div className="border-t border-emerald-900/60 pt-4">
              <h2 className="text-xs uppercase tracking-wider text-emerald-300/60 mb-3">A-scan parameters</h2>
              <dl className="grid grid-cols-2 gap-y-2 text-xs">
                <dt className="text-emerald-100/45">Channel</dt><dd className="font-mono text-right">{nearest ? PROBES[nearest.probe].short : '--'}</dd>
                <dt className="text-emerald-100/45">Gain</dt><dd className="font-mono text-right">27 dB</dd>
                <dt className="text-emerald-100/45">Range</dt><dd className="font-mono text-right">300 mm</dd>
                <dt className="text-emerald-100/45">Delay</dt><dd className="font-mono text-right">0 mm</dd>
                <dt className="text-emerald-100/45">Probe zero</dt><dd className="font-mono text-right">23 µs</dd>
                <dt className="text-emerald-100/45">Angle</dt><dd className="font-mono text-right">{nearest ? PROBES[nearest.probe].angle : 0}°</dd>
                <dt className="text-emerald-100/45">G1 start</dt><dd className="font-mono text-right">3 mm</dd>
                <dt className="text-emerald-100/45">G1 end</dt><dd className="font-mono text-right">290 mm</dd>
              </dl>
              <label className="mt-4 block text-[10px] uppercase tracking-wider text-emerald-300/50">Gate height · {gate}%</label>
              <input type="range" min={10} max={80} value={gate} onChange={(event) => setGate(Number(event.target.value))} className="w-full accent-amber-400" />
            </div>
            <div className="border-t border-emerald-900/60 pt-4">
              <div className="text-xs text-emerald-100/45">Exceptions on {rail}</div>
              <div className="text-3xl font-semibold mt-1">{severityHits.length}</div>
              <button onClick={onOpenExceptions} className="mt-3 text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-4">Review and classify exceptions</button>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid md:grid-cols-4 border-y border-emerald-900/70 text-xs">
        {[
          ['Inspection date', dataset.meta.inspectionDate],
          ['Operator / code', dataset.meta.operatorName],
          ['Division / section', `${dataset.meta.division} / ${dataset.meta.section}`],
          ['Line / direction', `${dataset.meta.line} / ${dataset.meta.direction}`],
          ['Machine no.', dataset.meta.machineNo],
          ['Rail section', dataset.meta.railSection],
          ['Location', `${dataset.meta.startKm} - ${dataset.meta.endKm} km`],
          ['Peak amplitude', `${nearest?.amplitude.toFixed(1) ?? '0.0'}% FSH`],
        ].map(([label, value]) => (
          <div key={label} className="px-4 py-3 border-b md:border-b-0 md:border-r border-emerald-900/50">
            <div className="text-[10px] uppercase tracking-wider text-emerald-100/35">{label}</div>
            <div className="mt-1 font-medium">{value}</div>
          </div>
        ))}
      </section>
    </div>
  );
}