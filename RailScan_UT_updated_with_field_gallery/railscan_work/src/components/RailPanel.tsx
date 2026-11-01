import { useRef } from 'react';
import CanvasView from './CanvasView';
import { drawAScan, drawBScan, bScanPosFromX } from '../sim/draw';
import { DEFECT_TYPES, PROBES, severityOf } from '../sim/engine';
import type { Engine, Rail } from '../sim/engine';

interface Props {
  engine: Engine;
  rail: Rail;
  title: string;
  onBScanClick: (rail: Rail, pos: number) => void;
}

export default function RailPanel({ engine, rail, title, onBScanClick }: Props) {
  const hover = useRef<number | null>(null);
  const sev = severityOf(engine.hold[rail]);
  const active = engine.active[rail];
  const probe = active ? PROBES[active.probe] : null;

  return (
    <section className="rounded-xl border border-emerald-900/70 bg-[#06161a] overflow-hidden flex flex-col">
      <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-emerald-900/60 bg-[#071c1f]">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-400 text-emerald-950 font-bold text-sm">{rail}</span>
          <h2 className="font-semibold text-emerald-50">{title}</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-emerald-200/50">Severity</span>
          <span
            className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide transition-colors"
            style={{
              color: sev.key === 'moderate' || sev.key === 'minor' ? '#111' : '#fff',
              background: sev.color,
              boxShadow: sev.key === 'none' ? 'none' : `0 0 14px ${sev.color}88`,
            }}
          >
            {sev.label} · {Math.round(engine.hold[rail])}%
          </span>
        </div>
      </header>

      <div className="px-4 py-2 text-xs font-mono text-emerald-100/70 border-b border-emerald-900/40 min-h-[34px] flex items-center gap-2 flex-wrap">
        {active && probe ? (
          <>
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: probe.color }} />
            <span style={{ color: probe.color }}>{probe.label}</span>
            <span className="text-emerald-100/40">|</span>
            <span>{DEFECT_TYPES[active.defect.type].name}</span>
            <span className="text-emerald-100/40">|</span>
            <span>Depth ≈ {active.defect.depth.toFixed(0)} mm</span>
            <span className="text-emerald-100/40">|</span>
            <span>Length ≈ {active.defect.len.toFixed(0)} mm</span>
            <span className="text-emerald-100/40">|</span>
            <span style={{ color: sev.color }}>Action: {severityOf(active.amp).action}</span>
          </>
        ) : (
          <span className="text-emerald-100/40">Scanning… no indication above gate</span>
        )}
      </div>

      <div className="p-3 pb-1">
        <div className="text-[11px] uppercase tracking-wider text-emerald-300/60 mb-1 px-1">A-Scan · all 9 probes</div>
        <CanvasView
          className="w-full h-[250px] block"
          draw={(ctx, w, h) => drawAScan(ctx, w, h, engine, rail)}
        />
      </div>
      <div className="p-3 pt-1">
        <div className="text-[11px] uppercase tracking-wider text-emerald-300/60 mb-1 px-1 flex justify-between">
          <span>B-Scan · colour = probe</span>
          {!engine.running && <span className="text-amber-300 normal-case tracking-normal">Click on the scan to place a flag</span>}
        </div>
        <div onMouseLeave={() => (hover.current = null)}>
          <CanvasView
            className={`w-full h-[290px] block ${!engine.running ? 'cursor-crosshair' : ''}`}
            draw={(ctx, w, h) => drawBScan(ctx, w, h, engine, rail, hover.current)}
            onMove={(x) => (hover.current = x)}
            onClick={(x, _y, w) => {
              if (!engine.running) onBScanClick(rail, bScanPosFromX(w, engine, x));
            }}
          />
        </div>
      </div>
    </section>
  );
}
