import { useRef, useState } from 'react';
import {
  downloadFile,
  importInspectionFiles,
  type InspectionDataset,
} from '../data/inspection';

interface Props {
  dataset: InspectionDataset | null;
  operatorName: string;
  onDataset: (dataset: InspectionDataset) => void;
  onUseDemo: () => void;
  onContinue: () => void;
}

const template = `rail,probe,distance_mm,depth_mm,sound_path_mm,amplitude,timestamp,defect_type
LR,CF,1000,18,52.6,84,2026-03-01T10:30:00Z,Transverse head crack
RR,37F,1250,76,95.2,56,2026-03-01T10:30:01Z,Web / bolt-hole crack
LR,0,1500,158,158,68,2026-03-01T10:30:02Z,Foot crack`;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ImportCenter({ dataset, operatorName, onDataset, onUseDemo, onContinue }: Props) {
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState('');
  const [endpoint, setEndpoint] = useState('');

  const handleFiles = async (incoming: File[]) => {
    if (!incoming.length) return;
    setBusy(true);
    setMessage('Reading and validating instrument data...');
    try {
      const next = await importInspectionFiles(incoming, operatorName);
      onDataset(next);
      setMessage(`${next.points.length.toLocaleString()} scan records imported successfully.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const connectApi = async () => {
    if (!endpoint.trim()) {
      setMessage('Enter the instrument or local data-agent endpoint first.');
      return;
    }
    setBusy(true);
    setMessage('Connecting to the data endpoint...');
    try {
      const response = await fetch(endpoint.trim(), { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Endpoint returned HTTP ${response.status}.`);
      const text = await response.text();
      const file = new File([text], 'instrument-api.json', { type: 'application/json' });
      await handleFiles([file]);
    } catch (error) {
      setMessage(
        `${error instanceof Error ? error.message : 'Connection failed.'} The endpoint must allow browser CORS access and return scan JSON.`,
      );
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-5 py-8 space-y-8">
      <div className="max-w-3xl">
        <div className="text-xs uppercase tracking-[0.24em] text-emerald-400 mb-2">Inspection data intake</div>
        <h1 className="text-3xl font-semibold tracking-tight">Bring instrument data into one inspection record</h1>
        <p className="mt-3 text-emerald-100/55 leading-relaxed">
          Select the A-scan and B-scan backup from this computer, a pen drive, or an instrument export folder. RailScan validates the rows, combines the channels, and creates the exception register automatically.
        </p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFiles(Array.from(event.dataTransfer.files));
        }}
        className={`relative border border-dashed rounded-xl px-6 py-10 text-center transition ${
          dragging ? 'border-emerald-300 bg-emerald-400/10' : 'border-emerald-700/70 bg-[#061916]'
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 13v6h14v-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="mt-4 text-lg font-medium">Drop instrument files here</h2>
        <p className="mt-1 text-sm text-emerald-100/45">CSV, JSON, TXT, or DAT. Multiple A-scan and B-scan files can be selected together.</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => filesRef.current?.click()}
            disabled={busy}
            className="rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-emerald-950 font-semibold px-4 py-2.5 text-sm"
          >
            Select files
          </button>
          <button
            onClick={() => folderRef.current?.click()}
            disabled={busy}
            className="rounded-lg border border-emerald-700 hover:bg-emerald-900/40 disabled:opacity-50 px-4 py-2.5 text-sm"
          >
            Select instrument folder
          </button>
          <button onClick={onUseDemo} disabled={busy} className="rounded-lg px-4 py-2.5 text-sm text-emerald-300 hover:bg-emerald-900/30">
            Load demonstration run
          </button>
        </div>
        <input
          ref={filesRef}
          type="file"
          multiple
          accept=".csv,.json,.txt,.dat"
          className="hidden"
          onChange={(event) => void handleFiles(Array.from(event.target.files ?? []))}
        />
        <input
          ref={(node) => {
            folderRef.current = node;
            node?.setAttribute('webkitdirectory', '');
            node?.setAttribute('directory', '');
          }}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => void handleFiles(Array.from(event.target.files ?? []))}
        />
        {message && <div className={`mt-5 text-sm ${message.includes('successfully') ? 'text-emerald-300' : 'text-amber-200'}`}>{message}</div>}
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <section className="border-t border-emerald-900 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Direct system connection</h2>
              <p className="text-sm text-emerald-100/45 mt-1">Connect to your instrument software or local data agent using a JSON endpoint.</p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-cyan-300 border border-cyan-700/60 px-2 py-1 rounded">REST / LAN</span>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder="http://127.0.0.1:8080/api/inspection/latest"
              className="min-w-0 flex-1 rounded-lg bg-[#071d17] border border-emerald-900 focus:border-emerald-500 outline-none px-3 py-2.5 text-sm font-mono placeholder:text-emerald-100/20"
            />
            <button onClick={() => void connectApi()} disabled={busy} className="rounded-lg border border-emerald-700 px-4 py-2.5 text-sm hover:bg-emerald-900/40 disabled:opacity-50">
              Connect
            </button>
          </div>
          <p className="mt-2 text-xs text-emerald-100/35">For production hardware, a small local connector service can expose the proprietary instrument format through this endpoint.</p>
        </section>

        <section className="border-t border-emerald-900 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Expected data columns</h2>
              <p className="text-sm text-emerald-100/45 mt-1">Header matching is case-insensitive and accepts common aliases.</p>
            </div>
            <button
              onClick={() => downloadFile('railscan_import_template.csv', template)}
              className="text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-4 whitespace-nowrap"
            >
              Download template
            </button>
          </div>
          <div className="mt-4 font-mono text-xs text-emerald-100/65 leading-6">
            rail · probe/channel · distance_mm · depth_mm · sound_path_mm · amplitude · timestamp · defect_type
          </div>
          <div className="mt-2 text-xs text-emerald-100/35">Probe codes: 0, CF, CR, 37F, 37R, GFF, GFR, FF, FR</div>
        </section>
      </div>

      {dataset && (
        <section className="border border-emerald-800/70 rounded-xl overflow-hidden bg-[#06161a]">
          <header className="px-5 py-4 border-b border-emerald-900/70 flex flex-wrap gap-4 items-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400">Active dataset</div>
              <h2 className="font-semibold mt-0.5">{dataset.name}</h2>
            </div>
            <div className="ml-auto flex items-center gap-5 text-xs text-emerald-100/55">
              <span><b className="text-emerald-100">{dataset.points.length.toLocaleString()}</b> records</span>
              <span><b className="text-emerald-100">{dataset.files.length}</b> files</span>
              <button onClick={onContinue} className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold px-4 py-2.5 text-sm">
                Review A-scan
              </button>
            </div>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-emerald-300/50 text-left">
                <tr>{['File', 'Type', 'Size', 'Valid rows', 'Result'].map((title) => <th key={title} className="px-5 py-2 font-medium">{title}</th>)}</tr>
              </thead>
              <tbody>
                {dataset.files.map((file, index) => (
                  <tr key={`${file.name}-${index}`} className="border-t border-emerald-900/40">
                    <td className="px-5 py-2.5 font-mono">{file.name}</td>
                    <td className="px-5 py-2.5">{file.kind}</td>
                    <td className="px-5 py-2.5 font-mono text-emerald-100/60">{formatBytes(file.size)}</td>
                    <td className="px-5 py-2.5 font-mono">{file.rows.toLocaleString()}</td>
                    <td className={`px-5 py-2.5 ${file.status === 'Imported' ? 'text-emerald-300' : 'text-amber-300'}`}>{file.status}{file.message ? ` · ${file.message}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}