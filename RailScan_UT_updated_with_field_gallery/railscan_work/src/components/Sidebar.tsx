import { useEffect, useState } from 'react';
import { FLAG_KINDS, GATE, PROBES, SEVERITIES } from '../sim/engine';
import type { Engine, Rail } from '../sim/engine';

interface Props {
  engine: Engine;
  onPlaceFlag: (target: Rail | 'BOTH', kind: string, color: string, note: string) => void;
  onRemoveFlag: (id: number) => void;
  onSelect: (sel: { kind: string; color: string; note: string }) => void;
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative h-2 w-14 bg-emerald-950 rounded overflow-hidden border border-emerald-900/60">
        <div className="absolute inset-y-0 left-0" style={{ width: `${value}%`, background: color }} />
        <div className="absolute inset-y-0 w-px bg-amber-300/60" style={{ left: `${GATE}%` }} />
      </div>
      <span className="w-7 text-right text-[10px] font-mono text-emerald-100/70">{Math.round(value)}</span>
    </div>
  );
}

export default function Sidebar({ engine, onPlaceFlag, onRemoveFlag, onSelect }: Props) {
  const [kindIdx, setKindIdx] = useState(0);
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#f43f5e');
  const [note, setNote] = useState('');
  const [target, setTarget] = useState<Rail | 'BOTH'>('BOTH');
  const stopped = !engine.running;

  const kind = custom ? customName.trim() || 'Custom flag' : FLAG_KINDS[kindIdx].kind;
  const color = custom ? customColor : FLAG_KINDS[kindIdx].color;

  useEffect(() => {
    onSelect({ kind, color, note: note.trim() });
  }, [kind, color, note, onSelect]);

  return (
    <aside className="flex flex-col gap-4">
      {/* Colour code legend */}
      <div className="rounded-xl border border-emerald-900/70 bg-[#06161a] overflow-hidden">
        <div className="px-4 py-3 border-b border-emerald-900/60 bg-[#071c1f]">
          <h3 className="font-semibold text-sm">Probe colour code</h3>
          <p className="text-[11px] text-emerald-200/50">Live echo amplitude (% FSH)</p>
        </div>
        <div className="px-3 py-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] uppercase tracking-wider text-emerald-300/50 pb-1 px-1">
            <span>Probe angle</span>
            <span className="w-[84px]">LR</span>
            <span className="w-[84px]">RR</span>
          </div>
          {PROBES.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center py-1.5 px-1 border-t border-emerald-900/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-4 h-4 rounded shrink-0"
                  style={{ background: p.color, boxShadow: `0 0 8px ${p.color}99` }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight" style={{ color: p.color }}>
                    {p.label}
                  </div>
                  <div className="text-[10px] text-emerald-100/40 truncate">{p.zone}</div>
                </div>
              </div>
              <Bar value={engine.live.LR[p.id]} color={p.color} />
              <Bar value={engine.live.RR[p.id]} color={p.color} />
            </div>
          ))}
        </div>
      </div>

      {/* Severity key */}
      <div className="rounded-xl border border-emerald-900/70 bg-[#06161a] p-4">
        <h3 className="font-semibold text-sm mb-2">Severity scale</h3>
        <div className="space-y-1.5">
          {[...SEVERITIES].reverse().map((s, i) => {
            const ranges = ['≥ 80%', '60 – 80%', '40 – 60%', `${GATE} – 40%`, `< ${GATE}%`];
            return (
              <div key={s.key} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
                <span className="w-20 font-medium">{s.label}</span>
                <span className="w-16 font-mono text-emerald-100/50">{ranges[i]}</span>
                <span className="text-emerald-100/50 truncate">{s.action}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flags */}
      <div className="rounded-xl border border-emerald-900/70 bg-[#06161a] overflow-hidden">
        <div className="px-4 py-3 border-b border-emerald-900/60 bg-[#071c1f] flex items-center justify-between">
          <h3 className="font-semibold text-sm">Flags</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${stopped ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-400/10 text-emerald-300/70'}`}>
            {stopped ? 'Scan stopped' : 'Stop scan to place'}
          </span>
        </div>
        <div className={`p-4 space-y-3 ${stopped ? '' : 'opacity-50 pointer-events-none'}`}>
          <div className="flex flex-wrap gap-1.5">
            {FLAG_KINDS.map((f, i) => (
              <button
                key={f.kind}
                onClick={() => {
                  setKindIdx(i);
                  setCustom(false);
                }}
                className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border transition ${
                  !custom && kindIdx === i ? 'border-white/70 bg-white/10' : 'border-emerald-900 hover:border-emerald-700'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: f.color }} />
                {f.kind}
              </button>
            ))}
            <button
              onClick={() => setCustom(true)}
              className={`text-[11px] px-2 py-1 rounded-md border transition ${
                custom ? 'border-white/70 bg-white/10' : 'border-emerald-900 hover:border-emerald-700'
              }`}
            >
              + Custom
            </button>
          </div>

          {custom && (
            <div className="flex gap-2">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Flag name"
                className="flex-1 min-w-0 rounded-md bg-[#071d17] border border-emerald-900 focus:border-emerald-400 outline-none px-2.5 py-1.5 text-xs"
              />
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-9 h-8 rounded bg-transparent border border-emerald-900 cursor-pointer"
              />
            </div>
          )}

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full rounded-md bg-[#071d17] border border-emerald-900 focus:border-emerald-400 outline-none px-2.5 py-1.5 text-xs"
          />

          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-200/50">Rail:</span>
            {(['LR', 'RR', 'BOTH'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={`px-2.5 py-1 rounded-md border text-[11px] ${
                  target === t ? 'bg-emerald-400 text-emerald-950 border-emerald-400 font-semibold' : 'border-emerald-900 text-emerald-100/70'
                }`}
              >
                {t === 'BOTH' ? 'Both' : t}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              onPlaceFlag(target, kind, color, note.trim());
              setNote('');
            }}
            className="w-full rounded-lg py-2 text-sm font-semibold text-white flex items-center justify-center gap-2 hover:brightness-110 transition"
            style={{ background: color }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M5 3h2v18H5zM8 4h11l-3 4 3 4H8z" />
            </svg>
            Place flag at current position
          </button>
          <p className="text-[11px] text-emerald-100/40">
            You can also click anywhere on a B-scan (while stopped) to flag that exact spot.
          </p>
        </div>

        <div className="border-t border-emerald-900/50 max-h-56 overflow-auto">
          {engine.flags.length === 0 ? (
            <div className="p-4 text-xs text-emerald-100/40">No flags placed yet.</div>
          ) : (
            [...engine.flags].reverse().map((f) => (
              <div key={f.id} className="flex items-start gap-2 px-4 py-2 border-b border-emerald-900/30 text-xs">
                <svg viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 shrink-0" fill={f.color}>
                  <path d="M5 3h2v18H5zM8 4h11l-3 4 3 4H8z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    #{f.id} {f.kind}
                  </div>
                  <div className="text-emerald-100/50 font-mono">
                    {f.rail} · {(f.pos / 1000).toFixed(3)} m · {f.time}
                  </div>
                  {f.note && <div className="text-emerald-100/70">{f.note}</div>}
                </div>
                <button onClick={() => onRemoveFlag(f.id)} className="text-emerald-100/40 hover:text-red-300" title="Remove">
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
