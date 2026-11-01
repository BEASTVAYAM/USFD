import { useState } from 'react';
import ImportCenter from './ImportCenter';
import AScanReview from './AScanReview';
import BScanReview from './BScanReview';
import ExceptionReport from './ExceptionReport';
import StandardReport from './StandardReport';
import LiveMonitor from './LiveMonitor';
import FieldGallery from './FieldGallery';
import { buildExceptions, createDemoDataset } from '../data/inspection';
import type { InspectionDataset, InspectionException, InspectionMeta } from '../data/inspection';

interface Props {
  user: string;
  onLogout: () => void;
}

type View = 'import' | 'ascan' | 'bscan' | 'exceptions' | 'report' | 'live' | 'gallery';

const nav: { id: View; label: string; short: string }[] = [
  { id: 'import', label: 'Data Import', short: '01' },
  { id: 'ascan', label: 'A-Scan', short: '02' },
  { id: 'bscan', label: 'B-Scan / ROR', short: '03' },
  { id: 'exceptions', label: 'Exceptions', short: '04' },
  { id: 'report', label: 'Standard Report', short: '05' },
  { id: 'live', label: 'Live Input', short: 'LIVE' },
  { id: 'gallery', label: 'Field Gallery', short: '07' },
];

export default function Dashboard({ user, onLogout }: Props) {
  const [view, setView] = useState<View>('import');
  const [dataset, setDataset] = useState<InspectionDataset | null>(null);
  const [exceptions, setExceptions] = useState<InspectionException[]>([]);

  const loadDataset = (next: InspectionDataset) => {
    setDataset(next);
    setExceptions(buildExceptions(next.points));
  };
  const useDemo = () => {
    const demo = createDemoDataset(user);
    loadDataset(demo);
  };
  const go = (next: View) => {
    if (!dataset && next !== 'import' && next !== 'live' && next !== 'gallery') return;
    setView(next);
  };

  return (
    <div className="min-h-screen bg-[#03100d] text-emerald-50">
      <header className="app-header sticky top-0 z-40 bg-[#04120f]/95 backdrop-blur border-b border-emerald-900/70">
        <div className="max-w-[1900px] mx-auto px-4 h-[62px] flex items-center gap-5">
          <button onClick={() => go('import')} className="flex items-center gap-2.5 shrink-0 text-left">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/40 grid place-items-center"><svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h4l2-7 4 14 2-7h6" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <div className="leading-tight hidden sm:block"><div className="font-semibold">RailScan UT</div><div className="text-[9px] tracking-[0.2em] text-emerald-300/55">INSPECTION & REPORTING</div></div>
          </button>

          <nav className="flex items-stretch self-stretch overflow-x-auto min-w-0">
            {nav.map((item) => {
              const disabled = !dataset && item.id !== 'import' && item.id !== 'live';
              return (
                <button key={item.id} onClick={() => go(item.id)} disabled={disabled} className={`relative px-3 lg:px-4 flex items-center gap-2 text-xs whitespace-nowrap transition disabled:opacity-25 disabled:cursor-not-allowed ${view === item.id ? 'text-emerald-200' : 'text-emerald-100/45 hover:text-emerald-100'}`}>
                  <span className="text-[9px] font-mono text-emerald-400/65">{item.short}</span>{item.label}
                  {view === item.id && <span className="absolute bottom-0 inset-x-3 h-0.5 bg-emerald-400" />}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3 shrink-0">
            <div className="hidden xl:block text-right leading-tight">
              <div className="text-[10px] text-emerald-100/35">Active record</div>
              <div className="text-xs max-w-[180px] truncate text-emerald-200/80">{dataset?.name ?? 'No dataset loaded'}</div>
            </div>
            <span className={`w-2 h-2 rounded-full ${dataset ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <span className="hidden md:inline px-2.5 py-1 rounded-md border border-emerald-900 text-xs text-emerald-200">{user}</span>
            <button onClick={onLogout} className="text-xs text-emerald-100/45 hover:text-red-300">Log out</button>
          </div>
        </div>
      </header>

      {view === 'import' && <ImportCenter dataset={dataset} operatorName={user} onDataset={loadDataset} onUseDemo={useDemo} onContinue={() => go('ascan')} />}
      {view === 'ascan' && dataset && <AScanReview dataset={dataset} onOpenBScan={() => go('bscan')} onOpenExceptions={() => go('exceptions')} />}
      {view === 'bscan' && dataset && <BScanReview dataset={dataset} onOpenExceptions={() => go('exceptions')} />}
      {view === 'exceptions' && dataset && <ExceptionReport dataset={dataset} exceptions={exceptions} onChange={setExceptions} onOpenReport={() => go('report')} />}
      {view === 'report' && dataset && (
        <StandardReport
          dataset={dataset}
          exceptions={exceptions}
          onMetaChange={(meta: InspectionMeta) => setDataset({ ...dataset, meta })}
        />
      )}
      {view === 'live' && <LiveMonitor />}
      {view === 'gallery' && <FieldGallery />}
    </div>
  );
}