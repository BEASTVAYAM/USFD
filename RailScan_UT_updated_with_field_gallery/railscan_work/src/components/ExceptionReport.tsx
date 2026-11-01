import { useMemo, useState } from 'react';
import { downloadFile, exceptionCsv } from '../data/inspection';
import type { InspectionDataset, InspectionException, ReviewStatus } from '../data/inspection';
import { PROBES, SEVERITIES, severityOf } from '../sim/engine';

interface Props {
  dataset: InspectionDataset;
  exceptions: InspectionException[];
  onChange: (exceptions: InspectionException[]) => void;
  onOpenReport: () => void;
}

const classifications = [
  'Transverse head crack',
  'Horizontal split head',
  'Vertical split head',
  'Web / bolt-hole crack',
  'Rail foot crack',
  'Weld defect',
  'Corrosion / loss of section',
  'Non-relevant indication',
  'Pending manual verification',
];

export default function ExceptionReport({ dataset, exceptions, onChange, onOpenReport }: Props) {
  const [selectedId, setSelectedId] = useState(exceptions[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const selected = exceptions.find((item) => item.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return exceptions.filter((item) => {
      const matchesText = !query || `${item.id} ${item.rail} ${item.classification} ${item.remark}`.toLowerCase().includes(query);
      const matchesSeverity = severityFilter === 'all' || item.severity === severityFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesText && matchesSeverity && matchesStatus;
    });
  }, [exceptions, search, severityFilter, statusFilter]);

  const update = (patch: Partial<InspectionException>) => {
    if (!selected) return;
    onChange(exceptions.map((item) => (item.id === selected.id ? { ...item, ...patch } : item)));
  };

  const addManual = () => {
    const nextNumber = Math.max(0, ...exceptions.map((item) => Number(item.id.replace(/\D/g, '')) || 0)) + 1;
    const item: InspectionException = {
      id: `EX-${String(nextNumber).padStart(3, '0')}`,
      rail: 'LR',
      fromMm: 0,
      toMm: 0,
      depthMm: 0,
      peakAmp: 20,
      probe: 0,
      defectType: 'Pending manual verification',
      severity: 'minor',
      action: 'Manual verification',
      status: 'Open',
      classification: 'Pending manual verification',
      defectPosition: 'Head',
      joggled: 'No',
      remark: 'Manually added by operator.',
      source: 'Manual entry',
    };
    onChange([...exceptions, item]);
    setSelectedId(item.id);
  };

  const severityCounts = SEVERITIES.slice(1).map((severity) => ({
    ...severity,
    count: exceptions.filter((item) => item.severity === severity.key).length,
  }));

  return (
    <div className="max-w-[1800px] mx-auto px-4 py-5 space-y-4">
      <header className="flex flex-wrap items-end gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-400">Automatic detection + operator verification</div>
          <h1 className="text-2xl font-semibold mt-1">Exception report</h1>
          <p className="text-sm text-emerald-100/45 mt-1">Review every gate crossing before it is included in the standard report.</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={addManual} className="rounded-lg border border-emerald-800 px-3 py-2 text-xs hover:bg-emerald-900/40">Add manual exception</button>
          <button onClick={() => downloadFile(`${dataset.meta.reportNo}_exceptions.csv`, exceptionCsv(exceptions))} className="rounded-lg border border-emerald-800 px-3 py-2 text-xs hover:bg-emerald-900/40">Export CSV</button>
          <button onClick={onOpenReport} className="rounded-lg bg-emerald-500 text-emerald-950 font-semibold px-3 py-2 text-xs hover:bg-emerald-400">Create standard report</button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-emerald-900/70 py-3 text-xs">
        <span className="text-emerald-100/45">{exceptions.length} total exceptions</span>
        {severityCounts.map((severity) => (
          <span key={severity.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: severity.color }} />
            <b>{severity.count}</b> {severity.label}
          </span>
        ))}
        <span className="ml-auto text-emerald-100/45">Verified: <b className="text-emerald-300">{exceptions.filter((item) => item.status === 'Verified' || item.status === 'Closed').length}</b></span>
      </div>

      <section className="grid xl:grid-cols-[1fr_380px] rounded-xl border border-emerald-900/70 bg-[#06161a] overflow-hidden min-h-[650px]">
        <div className="min-w-0 border-b xl:border-b-0 xl:border-r border-emerald-900/60">
          <div className="p-3 bg-[#071c1f] border-b border-emerald-900/60 flex flex-wrap gap-2">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID, classification, rail, remark..." className="min-w-[240px] flex-1 rounded-md bg-[#061612] border border-emerald-900 focus:border-emerald-500 outline-none px-3 py-2 text-xs" />
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="rounded-md bg-[#061612] border border-emerald-900 px-3 py-2 text-xs outline-none">
              <option value="all">All severities</option>
              {SEVERITIES.slice(1).map((severity) => <option key={severity.key} value={severity.key}>{severity.label}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md bg-[#061612] border border-emerald-900 px-3 py-2 text-xs outline-none">
              <option value="all">All statuses</option>
              {(['Open', 'Verified', 'Rejected', 'Closed'] as ReviewStatus[]).map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
          <div className="overflow-auto max-h-[720px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#071c1f] text-[10px] uppercase tracking-wider text-emerald-300/50 text-left">
                <tr>{['ID', 'Rail', 'Position', 'Probe', 'Depth', 'Peak', 'Severity', 'Classification', 'Status'].map((heading) => <th key={heading} className="px-3 py-2.5 font-medium whitespace-nowrap">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const severity = severityOf(item.peakAmp);
                  return (
                    <tr key={item.id} onClick={() => setSelectedId(item.id)} className={`border-t border-emerald-900/35 cursor-pointer hover:bg-emerald-900/20 ${selectedId === item.id ? 'bg-emerald-900/35' : ''}`}>
                      <td className="px-3 py-2.5 font-semibold text-emerald-200">{item.id}</td>
                      <td className="px-3 py-2.5 font-bold">{item.rail}</td>
                      <td className="px-3 py-2.5 font-mono whitespace-nowrap">{(item.fromMm / 1000).toFixed(3)} - {(item.toMm / 1000).toFixed(3)} m</td>
                      <td className="px-3 py-2.5"><span style={{ color: PROBES[item.probe].color }}>{PROBES[item.probe].short}</span></td>
                      <td className="px-3 py-2.5 font-mono">{item.depthMm.toFixed(1)} mm</td>
                      <td className="px-3 py-2.5 font-mono">{item.peakAmp.toFixed(0)}%</td>
                      <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: severity.color, color: item.severity === 'minor' || item.severity === 'moderate' ? '#111' : '#fff' }}>{severity.label}</span></td>
                      <td className="px-3 py-2.5 max-w-[220px] truncate">{item.classification}</td>
                      <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] ${item.status === 'Verified' || item.status === 'Closed' ? 'bg-emerald-400/15 text-emerald-300' : item.status === 'Rejected' ? 'bg-slate-400/15 text-slate-300' : 'bg-amber-400/15 text-amber-300'}`}>{item.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="p-5">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div><div className="text-[10px] uppercase tracking-wider text-emerald-300/50">Exception detail</div><h2 className="text-lg font-semibold mt-1">{selected.id}</h2></div>
                <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: severityOf(selected.peakAmp).color, color: selected.severity === 'minor' || selected.severity === 'moderate' ? '#111' : '#fff' }}>{severityOf(selected.peakAmp).label}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-[10px] uppercase tracking-wider text-emerald-100/40">Rail
                  <select value={selected.rail} onChange={(event) => update({ rail: event.target.value as 'LR' | 'RR' })} className="field"><option>LR</option><option>RR</option></select>
                </label>
                <label className="text-[10px] uppercase tracking-wider text-emerald-100/40">Probe used
                  <select value={selected.probe} onChange={(event) => update({ probe: Number(event.target.value) })} className="field">{PROBES.map((probe) => <option key={probe.id} value={probe.id}>{probe.short} · {probe.angle}°</option>)}</select>
                </label>
                <label className="text-[10px] uppercase tracking-wider text-emerald-100/40">From position (m)
                  <input type="number" step="0.001" value={(selected.fromMm / 1000).toFixed(3)} onChange={(event) => update({ fromMm: Number(event.target.value) * 1000 })} className="field" />
                </label>
                <label className="text-[10px] uppercase tracking-wider text-emerald-100/40">To position (m)
                  <input type="number" step="0.001" value={(selected.toMm / 1000).toFixed(3)} onChange={(event) => update({ toMm: Number(event.target.value) * 1000 })} className="field" />
                </label>
                <label className="text-[10px] uppercase tracking-wider text-emerald-100/40">Depth (mm)
                  <input type="number" value={selected.depthMm.toFixed(1)} onChange={(event) => update({ depthMm: Number(event.target.value) })} className="field" />
                </label>
                <label className="text-[10px] uppercase tracking-wider text-emerald-100/40">Echo amplitude (%)
                  <input type="number" min={0} max={100} value={selected.peakAmp.toFixed(1)} onChange={(event) => {
                    const peakAmp = Number(event.target.value);
                    const severity = severityOf(peakAmp);
                    update({ peakAmp, severity: severity.key, action: severity.action });
                  }} className="field" />
                </label>
              </div>

              <label className="text-[10px] uppercase tracking-wider text-emerald-100/40 block">Classification
                <select value={selected.classification} onChange={(event) => update({ classification: event.target.value, defectType: event.target.value })} className="field">
                  {!classifications.includes(selected.classification) && <option>{selected.classification}</option>}
                  {classifications.map((classification) => <option key={classification}>{classification}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[10px] uppercase tracking-wider text-emerald-100/40">Defect position
                  <select value={selected.defectPosition} onChange={(event) => update({ defectPosition: event.target.value })} className="field"><option>Head</option><option>Web</option><option>Foot</option><option>Weld</option></select>
                </label>
                <label className="text-[10px] uppercase tracking-wider text-emerald-100/40">Joggled rail
                  <select value={selected.joggled} onChange={(event) => update({ joggled: event.target.value as 'Yes' | 'No' })} className="field"><option>No</option><option>Yes</option></select>
                </label>
              </div>
              <label className="text-[10px] uppercase tracking-wider text-emerald-100/40 block">Required action
                <input value={selected.action} onChange={(event) => update({ action: event.target.value })} className="field" />
              </label>
              <label className="text-[10px] uppercase tracking-wider text-emerald-100/40 block">Operator remark
                <textarea value={selected.remark} onChange={(event) => update({ remark: event.target.value })} rows={3} className="field resize-none" />
              </label>
              <label className="text-[10px] uppercase tracking-wider text-emerald-100/40 block">Review status
                <select value={selected.status} onChange={(event) => update({ status: event.target.value as ReviewStatus })} className="field"><option>Open</option><option>Verified</option><option>Rejected</option><option>Closed</option></select>
              </label>
              <p className="text-[10px] text-emerald-100/30">Source: {selected.source}</p>
              <button onClick={() => update({ status: 'Verified' })} className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold py-2.5 text-sm">Verify and include in report</button>
            </div>
          ) : (
            <div className="text-sm text-emerald-100/45">Select an exception to review its parameters.</div>
          )}
        </aside>
      </section>
    </div>
  );
}