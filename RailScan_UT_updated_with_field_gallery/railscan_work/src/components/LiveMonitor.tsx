import { useCallback, useEffect, useRef, useState } from 'react';
import RailPanel from './RailPanel';
import Sidebar from './Sidebar';
import { Engine, PROBES, severityOf } from '../sim/engine';
import type { Rail } from '../sim/engine';

export default function LiveMonitor() {
  const engineRef = useRef<Engine>(null as unknown as Engine);
  if (!engineRef.current) engineRef.current = new Engine();
  const engine = engineRef.current;
  const [, setTick] = useState(0);
  const [toast, setToast] = useState('');
  const selection = useRef({ kind: 'Defect – verify manually', color: '#ef4444', note: '' });
  const onSelect = useCallback((value: { kind: string; color: string; note: string }) => {
    selection.current = value;
  }, []);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const loop = (now: number) => {
      engine.update((now - previous) / 1000);
      previous = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const interval = window.setInterval(() => setTick((value) => value + 1), 100);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
    };
  }, [engine]);

  const refresh = () => setTick((value) => value + 1);
  const say = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };
  const logs = [...engine.log.values()].sort((a, b) => b.pos - a.pos).slice(0, 10);

  return (
    <div className="max-w-[1900px] mx-auto p-4 space-y-4">
      <section className="border-y border-emerald-900/70 py-3 flex flex-wrap items-center gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Direct acquisition</div>
          <h1 className="text-xl font-semibold">Live dual-rail monitor</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`w-2.5 h-2.5 rounded-full ${engine.running ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className={engine.running ? 'text-emerald-300' : 'text-amber-300'}>{engine.running ? 'SCANNING' : 'STOPPED'}</span>
          <span className="text-emerald-100/40">|</span>
          <span>Position {(engine.pos / 1000).toFixed(3)} m</span>
        </div>
        <button
          onClick={() => {
            engine.running = !engine.running;
            refresh();
          }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${engine.running ? 'bg-red-500 hover:bg-red-400' : 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950'}`}
        >
          {engine.running ? 'Stop animation' : 'Resume scan'}
        </button>
        <label className="flex items-center gap-2 text-xs text-emerald-100/60">Speed
          <input type="range" min={100} max={1800} step={50} value={engine.speed} onChange={(event) => { engine.speed = Number(event.target.value); refresh(); }} className="accent-emerald-400 w-32" />
          <span className="font-mono">{(engine.speed / 1000).toFixed(2)} m/s</span>
        </label>
        <div className="ml-auto text-xs text-emerald-100/40">Simulation input · use Data Import for instrument records</div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px] items-start">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 2xl:grid-cols-2">
            {(['LR', 'RR'] as Rail[]).map((rail) => (
              <RailPanel
                key={rail}
                engine={engine}
                rail={rail}
                title={rail === 'LR' ? 'Left Rail' : 'Right Rail'}
                onBScanClick={(side, pos) => {
                  const flag = selection.current;
                  engine.addFlag(side, pos, flag.kind, flag.color, flag.note);
                  say(`Flag placed on ${side} at ${(pos / 1000).toFixed(3)} m`);
                  refresh();
                }}
              />
            ))}
          </div>

          <section className="rounded-xl border border-emerald-900/70 bg-[#06161a] overflow-hidden">
            <header className="px-4 py-3 border-b border-emerald-900/60 bg-[#071c1f] flex items-center justify-between">
              <h2 className="font-semibold text-sm">Live defect log</h2>
              <span className="text-[11px] text-emerald-200/50">Latest 10 detections</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-emerald-300/60 uppercase tracking-wider text-[10px] text-left"><tr>{['Rail', 'Position', 'Probable type', 'Depth', 'Length', 'Best probe', 'Peak', 'Severity', 'Action'].map((heading) => <th key={heading} className="px-4 py-2 font-medium whitespace-nowrap">{heading}</th>)}</tr></thead>
                <tbody>
                  {!logs.length && <tr><td colSpan={9} className="px-4 py-6 text-emerald-100/40">No indications above gate yet...</td></tr>}
                  {logs.map((item) => {
                    const severity = severityOf(item.maxAmp);
                    const probe = PROBES[item.probe];
                    return (
                      <tr key={item.id} className="border-t border-emerald-900/30">
                        <td className="px-4 py-2 font-bold">{item.rail}</td><td className="px-4 py-2 font-mono">{(item.pos / 1000).toFixed(3)} m</td><td className="px-4 py-2">{item.type}</td><td className="px-4 py-2 font-mono">{item.depth.toFixed(0)} mm</td><td className="px-4 py-2 font-mono">{item.len.toFixed(0)} mm</td>
                        <td className="px-4 py-2"><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: probe.color }} />{probe.short}</span></td>
                        <td className="px-4 py-2 font-mono">{item.maxAmp.toFixed(0)}%</td><td className="px-4 py-2" style={{ color: severity.color }}>{severity.label}</td><td className="px-4 py-2 whitespace-nowrap">{severity.action}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <div className="xl:sticky xl:top-[74px] xl:max-h-[calc(100vh-90px)] xl:overflow-auto">
          <Sidebar
            engine={engine}
            onSelect={onSelect}
            onPlaceFlag={(target, kind, color, note) => {
              const rails: Rail[] = target === 'BOTH' ? ['LR', 'RR'] : [target];
              rails.forEach((rail) => engine.addFlag(rail, engine.pos, kind, color, note));
              say(`Flag placed at ${(engine.pos / 1000).toFixed(3)} m`);
              refresh();
            }}
            onRemoveFlag={(id) => { engine.removeFlag(id); refresh(); }}
          />
        </div>
      </div>
      {toast && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-emerald-500 text-emerald-950 font-medium text-sm px-4 py-2 shadow-xl">{toast}</div>}
    </div>
  );
}