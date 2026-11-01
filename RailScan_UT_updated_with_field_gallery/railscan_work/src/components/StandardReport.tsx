import CanvasView from './CanvasView';
import type { InspectionDataset, InspectionException, InspectionMeta } from '../data/inspection';
import { downloadFile, exceptionCsv } from '../data/inspection';
import { drawImportedAScan, drawImportedBScan } from '../data/drawImported';
import { PROBES, severityOf } from '../sim/engine';

interface Props {
  dataset: InspectionDataset;
  exceptions: InspectionException[];
  onMetaChange: (meta: InspectionMeta) => void;
}

export default function StandardReport({ dataset, exceptions, onMetaChange }: Props) {
  const meta = dataset.meta;
  const included = exceptions.filter((item) => item.status !== 'Rejected');
  const critical = included.filter((item) => item.severity === 'critical').length;
  const severe = included.filter((item) => item.severity === 'severe').length;
  const pending = included.filter((item) => item.status === 'Open').length;
  const representative = [...included].sort((a, b) => b.peakAmp - a.peakAmp)[0];
  const allChannels = new Set(PROBES.map((probe) => probe.id));
  const change = (key: keyof InspectionMeta, value: string) => onMetaChange({ ...meta, [key]: value });

  const exportJson = () => {
    downloadFile(
      `${meta.reportNo}_complete.json`,
      JSON.stringify({ schema: 'RailScan-UT-1.0', generatedAt: new Date().toISOString(), meta, exceptions: included, sourceFiles: dataset.files }, null, 2),
      'application/json;charset=utf-8',
    );
  };

  return (
    <div className="report-workspace min-h-[calc(100vh-60px)] bg-[#071410] px-4 py-5">
      <div className="report-toolbar max-w-[1200px] mx-auto mb-4 flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Final output</div>
          <h1 className="text-xl font-semibold">Standard ultrasonic rail inspection report</h1>
        </div>
        <button onClick={() => downloadFile(`${meta.reportNo}_exceptions.csv`, exceptionCsv(included))} className="rounded-lg border border-emerald-800 px-3 py-2 text-xs hover:bg-emerald-900/40">Export CSV</button>
        <button onClick={exportJson} className="rounded-lg border border-emerald-800 px-3 py-2 text-xs hover:bg-emerald-900/40">Export full JSON</button>
        <button onClick={() => window.print()} className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold px-4 py-2 text-xs">Print / Save PDF</button>
      </div>

      <article className="standard-report max-w-[1200px] mx-auto bg-white text-slate-950 shadow-2xl print:shadow-none">
        <header className="report-head px-9 py-7 border-b-4 border-emerald-700 flex items-start gap-6">
          <div className="w-14 h-14 bg-emerald-800 text-white grid place-items-center rounded-sm shrink-0">
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-[0.25em] text-emerald-800">RAILSCAN UT</div>
            <h2 className="text-2xl font-bold mt-1">Ultrasonic Rail Inspection Report</h2>
            <p className="text-sm text-slate-500 mt-1">A-scan / B-scan exception and classification record</p>
          </div>
          <div className="ml-auto text-right text-xs">
            <div className="text-slate-500">Report number</div>
            <div className="font-mono font-bold text-sm">{meta.reportNo}</div>
            <div className="mt-2 text-slate-500">Generated</div>
            <div>{new Date().toLocaleString()}</div>
          </div>
        </header>

        <section className="px-9 py-6 border-b border-slate-200">
          <h3 className="report-section-title">1. Inspection identification</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3 mt-4">
            {([
              ['reportNo', 'Report no.'], ['inspectionDate', 'Inspection date'], ['customer', 'Customer'], ['operatorName', 'Operator / code'],
              ['division', 'Division'], ['section', 'Section'], ['line', 'Line'], ['direction', 'Direction'],
              ['startKm', 'Start km'], ['endKm', 'End km'], ['kmTested', 'Km tested'], ['machineNo', 'Machine no.'],
              ['railSection', 'Rail section'], ['testingStandard', 'Testing standard'],
            ] as [keyof InspectionMeta, string][]).map(([key, label]) => (
              <label key={key} className={key === 'testingStandard' ? 'md:col-span-3' : ''}>
                <span className="report-label">{label}</span>
                <input value={meta[key]} onChange={(event) => change(key, event.target.value)} className="report-input" />
              </label>
            ))}
          </div>
        </section>

        <section className="px-9 py-6 border-b border-slate-200">
          <h3 className="report-section-title">2. Inspection summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 text-sm">
            <div><div className="report-label">Source records</div><div className="report-value">{dataset.points.length.toLocaleString()}</div></div>
            <div><div className="report-label">Files processed</div><div className="report-value">{dataset.files.filter((file) => file.status === 'Imported').length}</div></div>
            <div><div className="report-label">Reportable exceptions</div><div className="report-value">{included.length}</div></div>
            <div><div className="report-label">Severe / Critical</div><div className="report-value text-red-700">{severe} / {critical}</div></div>
            <div><div className="report-label">Awaiting review</div><div className="report-value text-amber-700">{pending}</div></div>
          </div>
          <div className={`mt-5 border-l-4 px-4 py-3 text-sm ${critical ? 'border-red-600 bg-red-50' : severe ? 'border-orange-500 bg-orange-50' : 'border-emerald-600 bg-emerald-50'}`}>
            <b>Overall result: </b>
            {critical ? 'CRITICAL INDICATION PRESENT. Stop traffic and initiate emergency verification in accordance with the applicable railway procedure.' : severe ? 'SEVERE INDICATION PRESENT. Apply the prescribed restriction and complete manual verification.' : included.length ? 'INDICATIONS RECORDED. Complete the actions listed in the exception register.' : 'NO REPORTABLE INDICATION ABOVE THE CONFIGURED GATE.'}
          </div>
        </section>

        <section className="px-9 py-6 border-b border-slate-200">
          <div className="flex items-end justify-between gap-4">
            <h3 className="report-section-title">3. Exception register</h3>
            <span className="text-[10px] text-slate-500">Rejected indications are excluded</span>
          </div>
          <div className="mt-4 overflow-hidden border border-slate-300">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-100 text-left">
                <tr>{['ID', 'Rail / position', 'Probe', 'Depth', 'Peak', 'Severity', 'Classification', 'Status', 'Required action / remark'].map((heading) => <th key={heading} className="px-2 py-2 border-b border-slate-300 font-bold">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {included.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No reportable exceptions.</td></tr>}
                {included.map((item) => {
                  const severity = severityOf(item.peakAmp);
                  return (
                    <tr key={item.id} className="border-t border-slate-200 align-top">
                      <td className="px-2 py-2 font-bold">{item.id}</td>
                      <td className="px-2 py-2 whitespace-nowrap"><b>{item.rail}</b><br />{(item.fromMm / 1000).toFixed(3)} - {(item.toMm / 1000).toFixed(3)} m</td>
                      <td className="px-2 py-2 whitespace-nowrap">{PROBES[item.probe].short}<br />{PROBES[item.probe].angle}°</td>
                      <td className="px-2 py-2">{item.depthMm.toFixed(1)} mm<br />{item.defectPosition}</td>
                      <td className="px-2 py-2 font-bold">{item.peakAmp.toFixed(0)}%</td>
                      <td className="px-2 py-2"><span className="inline-block px-1.5 py-0.5 text-white font-bold" style={{ background: severity.color }}>{severity.label}</span></td>
                      <td className="px-2 py-2">{item.classification}{item.joggled === 'Yes' ? <><br />Joggled rail</> : null}</td>
                      <td className="px-2 py-2">{item.status}</td>
                      <td className="px-2 py-2 max-w-[180px]"><b>{item.action}</b>{item.remark ? <><br />{item.remark}</> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {representative && (
          <section className="px-9 py-6 border-b border-slate-200">
            <div className="flex items-end justify-between gap-4">
              <h3 className="report-section-title">4. Representative scan evidence</h3>
              <span className="text-[10px] text-slate-500">Highest-amplitude exception: {representative.id} · {representative.rail} · {(representative.fromMm / 1000).toFixed(3)} m</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 bg-[#04100d] border border-slate-300 p-2">
              <div>
                <div className="text-[9px] text-emerald-300 uppercase tracking-wider mb-1">A-scan snapshot</div>
                <CanvasView
                  className="block w-full h-[190px]"
                  animate={false}
                  draw={(ctx, width, height) => drawImportedAScan(ctx, width, height, dataset.points, representative.rail, (representative.fromMm + representative.toMm) / 2, allChannels)}
                />
              </div>
              <div>
                <div className="text-[9px] text-emerald-300 uppercase tracking-wider mb-1">B-scan context</div>
                <CanvasView
                  className="block w-full h-[190px]"
                  animate={false}
                  draw={(ctx, width, height) => drawImportedBScan(ctx, width, height, dataset.points, { rail: representative.rail, active: allChannels, gate: 20, cursorMm: (representative.fromMm + representative.toMm) / 2, exceptions: included, selectedException: representative.id })}
                />
              </div>
            </div>
          </section>
        )}

        <section className="px-9 py-6 border-b border-slate-200">
          <h3 className="report-section-title">5. Source and traceability</h3>
          <table className="w-full mt-4 text-[10px] border border-slate-300">
            <thead className="bg-slate-100"><tr><th className="text-left px-2 py-1.5">Source file</th><th className="text-left px-2 py-1.5">Type</th><th className="text-left px-2 py-1.5">Records</th><th className="text-left px-2 py-1.5">Import result</th></tr></thead>
            <tbody>{dataset.files.map((file, index) => <tr key={`${file.name}-${index}`} className="border-t border-slate-200"><td className="px-2 py-1.5 font-mono">{file.name}</td><td className="px-2 py-1.5">{file.kind}</td><td className="px-2 py-1.5">{file.rows.toLocaleString()}</td><td className="px-2 py-1.5">{file.status}</td></tr>)}</tbody>
          </table>
        </section>

        <section className="px-9 py-7">
          <p className="text-[10px] leading-relaxed text-slate-600">
            Automated severity and probable-defect classification are decision-support outputs. Every reportable indication must be reviewed and dispositioned by an appropriately qualified ultrasonic testing professional under the applicable railway standard and local safety procedure.
          </p>
          <div className="grid grid-cols-3 gap-10 mt-14 text-xs">
            <div className="border-t border-slate-700 pt-2"><b>Inspected by</b><br /><span className="text-slate-500">Name, signature, date</span></div>
            <div className="border-t border-slate-700 pt-2"><b>Reviewed by</b><br /><span className="text-slate-500">UT Level II / III, signature, date</span></div>
            <div className="border-t border-slate-700 pt-2"><b>Approved by</b><br /><span className="text-slate-500">Railway authority, signature, date</span></div>
          </div>
        </section>

        <footer className="px-9 py-3 bg-slate-100 text-[9px] text-slate-500 flex justify-between">
          <span>{meta.reportNo} · RailScan UT inspection record</span>
          <span>Controlled electronic copy</span>
        </footer>
      </article>
    </div>
  );
}