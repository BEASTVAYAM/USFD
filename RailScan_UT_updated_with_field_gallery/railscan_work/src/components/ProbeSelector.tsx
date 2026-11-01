import { PROBES } from '../sim/engine';

interface Props {
  active: Set<number>;
  onChange: (next: Set<number>) => void;
  compact?: boolean;
}

export default function ProbeSelector({ active, onChange, compact = false }: Props) {
  const toggle = (id: number) => {
    const next = new Set(active);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (next.size) onChange(next);
  };

  return (
    <div className={compact ? 'flex flex-wrap gap-1.5' : 'space-y-1'}>
      {PROBES.map((probe) => (
        <label
          key={probe.id}
          className={`cursor-pointer select-none border transition ${
            compact ? 'flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px]' : 'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs'
          } ${active.has(probe.id) ? 'border-emerald-700 bg-emerald-900/25' : 'border-transparent opacity-45 hover:opacity-75'}`}
        >
          <input type="checkbox" className="sr-only" checked={active.has(probe.id)} onChange={() => toggle(probe.id)} />
          <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: probe.color }} />
          <span className="font-mono font-medium" style={{ color: active.has(probe.id) ? probe.color : undefined }}>
            {probe.short}
          </span>
          {!compact && <span className="ml-auto text-[10px] text-emerald-100/35">{probe.angle}°</span>}
        </label>
      ))}
      <button
        onClick={() => onChange(new Set(PROBES.map((probe) => probe.id)))}
        className={`${compact ? 'px-2 py-1' : 'w-full px-2 py-1.5'} text-[10px] text-emerald-300/70 hover:text-emerald-200 text-left`}
      >
        Select all channels
      </button>
    </div>
  );
}