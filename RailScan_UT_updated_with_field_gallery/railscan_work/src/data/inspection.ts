import { DEFECT_TYPES, GATE, PROBES, severityOf } from '../sim/engine';
import type { Rail } from '../sim/engine';

export interface InspectionMeta {
  reportNo: string;
  inspectionDate: string;
  division: string;
  section: string;
  line: string;
  startKm: string;
  endKm: string;
  kmTested: string;
  operatorName: string;
  machineNo: string;
  railSection: string;
  direction: string;
  testingStandard: string;
  customer: string;
}

export interface ScanPoint {
  id: string;
  rail: Rail;
  probe: number;
  distanceMm: number;
  depthMm: number;
  soundPathMm: number;
  amplitude: number;
  timestamp: string;
  defectType?: string;
  source: string;
}

export interface SourceFile {
  name: string;
  size: number;
  rows: number;
  kind: 'A-scan' | 'B-scan' | 'Combined';
  status: 'Imported' | 'Skipped';
  message?: string;
}

export interface InspectionDataset {
  id: string;
  name: string;
  loadedAt: string;
  points: ScanPoint[];
  files: SourceFile[];
  meta: InspectionMeta;
}

export type ReviewStatus = 'Open' | 'Verified' | 'Rejected' | 'Closed';

export interface InspectionException {
  id: string;
  rail: Rail;
  fromMm: number;
  toMm: number;
  depthMm: number;
  peakAmp: number;
  probe: number;
  defectType: string;
  severity: ReturnType<typeof severityOf>['key'];
  action: string;
  status: ReviewStatus;
  classification: string;
  defectPosition: string;
  joggled: 'Yes' | 'No';
  remark: string;
  source: string;
}

const today = new Date().toISOString().slice(0, 10);

export function defaultMeta(operatorName = 'Operator'): InspectionMeta {
  return {
    reportNo: `UT-${today.replace(/-/g, '')}-001`,
    inspectionDate: today,
    division: 'Northern Division',
    section: 'Main Line Section',
    line: 'UP',
    startKm: '0.000',
    endKm: '6.000',
    kmTested: '0.006',
    operatorName,
    machineNo: 'RS-UT-09',
    railSection: '60 kg / 90 UTS',
    direction: 'UP',
    testingStandard: 'Applicable Railway Ultrasonic Testing Standard',
    customer: 'Rail Infrastructure Authority',
  };
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDemoDataset(operatorName = 'Operator'): InspectionDataset {
  const random = mulberry32(9407);
  const points: ScanPoint[] = [];
  const defects = [
    { rail: 'LR' as Rail, pos: 940, depth: 18, probe: 1, amp: 88, type: 'Transverse head crack', width: 80 },
    { rail: 'RR' as Rail, pos: 1860, depth: 76, probe: 3, amp: 53, type: 'Web / bolt-hole crack', width: 110 },
    { rail: 'LR' as Rail, pos: 2910, depth: 156, probe: 4, amp: 69, type: 'Foot crack', width: 75 },
    { rail: 'RR' as Rail, pos: 4020, depth: 31, probe: 7, amp: 96, type: 'Vertical split head', width: 150 },
    { rail: 'LR' as Rail, pos: 5180, depth: 91, probe: 5, amp: 43, type: 'Weld defect', width: 125 },
  ];

  for (const rail of ['LR', 'RR'] as Rail[]) {
    for (const probe of PROBES) {
      for (let distanceMm = 0; distanceMm <= 6000; distanceMm += 20) {
        let amplitude = 1.5 + random() * 5;
        let depthMm = 15 + random() * 150;
        let defectType: string | undefined;
        for (const defect of defects) {
          if (defect.rail !== rail || defect.probe !== probe.id) continue;
          const envelope = Math.exp(-Math.pow((distanceMm - defect.pos) / defect.width, 2));
          if (envelope > 0.02) {
            amplitude += defect.amp * envelope;
            depthMm = defect.depth + (random() - 0.5) * 3;
            defectType = defect.type;
          }
        }
        amplitude = Math.min(100, amplitude);
        const cos = Math.max(0.2, Math.cos((probe.angle * Math.PI) / 180));
        points.push({
          id: `demo-${rail}-${probe.id}-${distanceMm}`,
          rail,
          probe: probe.id,
          distanceMm,
          depthMm,
          soundPathMm: Math.min(300, depthMm / cos),
          amplitude,
          timestamp: new Date(Date.now() - (6000 - distanceMm) * 40).toISOString(),
          defectType,
          source: 'Instrument demo dataset',
        });
      }
    }
  }

  return {
    id: `demo-${Date.now()}`,
    name: 'SR09 Demonstration Run',
    loadedAt: new Date().toISOString(),
    points,
    files: [
      { name: 'SR09_ASCII_ASCAN.csv', size: 186240, rows: points.length, kind: 'A-scan', status: 'Imported' },
      { name: 'SR09_BSCAN.csv', size: 241880, rows: points.length, kind: 'B-scan', status: 'Imported' },
    ],
    meta: defaultMeta(operatorName),
  };
}

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if ((c === ',' || c === ';' || c === '\t') && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else value += c;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizedKey(key: string) {
  return key.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function recordsFromText(text: string, fileName: string): { records: Record<string, unknown>[]; meta?: Partial<InspectionMeta> } {
  if (fileName.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) return { records: parsed as Record<string, unknown>[] };
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const list = obj.points ?? obj.samples ?? obj.records ?? obj.data;
      return {
        records: Array.isArray(list) ? (list as Record<string, unknown>[]) : [obj],
        meta: obj.meta && typeof obj.meta === 'object' ? (obj.meta as Partial<InspectionMeta>) : undefined,
      };
    }
    return { records: [] };
  }

  const rows = csvRows(text);
  if (rows.length < 2) return { records: [] };
  const headers = rows[0].map(normalizedKey);
  return {
    records: rows.slice(1).map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))),
  };
}

function normalizedRecord(record: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [normalizedKey(key), value]));
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(/[^0-9+\-.eE]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseRail(value: unknown): Rail {
  const rail = String(value ?? 'LR').trim().toUpperCase();
  return rail === 'RR' || rail === 'RH' || rail.includes('RIGHT') ? 'RR' : 'LR';
}

export function probeIndex(value: unknown) {
  const raw = String(value ?? '0').trim().toUpperCase().replace(/[°\s_-]/g, '');
  const aliases: Record<string, number> = {
    '0': 0,
    '0DEG': 0,
    CF: 1,
    CR: 2,
    '37F': 3,
    '37FORWARD': 3,
    '37R': 4,
    '37B': 4,
    '37REVERSE': 4,
    GFF: 5,
    GFR: 6,
    FF: 7,
    FR: 8,
  };
  if (aliases[raw] !== undefined) return aliases[raw];
  const direct = Number(raw);
  return Number.isFinite(direct) && direct >= 0 && direct < PROBES.length ? Math.floor(direct) : 0;
}

function recordToPoint(record: Record<string, unknown>, source: string, index: number): ScanPoint | null {
  const row = normalizedRecord(record);
  const amplitudeValue = pick(row, ['amplitude', 'amplitude_percent', 'amp', 'echo_amp', 'peak_amp', 'fsh']);
  if (amplitudeValue === undefined) return null;
  const probe = probeIndex(pick(row, ['probe', 'probe_id', 'channel', 'angle', 'probe_angle']));
  const angle = PROBES[probe].angle;

  let distanceMm = numeric(pick(row, ['distance_mm', 'position_mm', 'meter_mm', 'location_mm']), NaN);
  if (!Number.isFinite(distanceMm)) {
    const metres = pick(row, ['distance_m', 'position_m', 'meter', 'metre']);
    distanceMm = metres !== undefined ? numeric(metres) * 1000 : NaN;
  }
  if (!Number.isFinite(distanceMm)) {
    const km = pick(row, ['km', 'kilometer', 'kilometre']);
    distanceMm = km !== undefined ? numeric(km) * 1_000_000 : index * 10;
  }

  const depthMm = numeric(pick(row, ['depth_mm', 'depth', 'defect_depth', 'vertical_depth']), 0);
  const soundPath = numeric(
    pick(row, ['sound_path_mm', 'soundpath_mm', 'sound_path', 'beam_path', 'range_mm']),
    depthMm / Math.max(0.2, Math.cos((angle * Math.PI) / 180)),
  );
  return {
    id: `${source}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    rail: parseRail(pick(row, ['rail', 'rail_side', 'side', 'lh_rh', 'lr_rr'])),
    probe,
    distanceMm: Math.max(0, distanceMm),
    depthMm: Math.max(0, depthMm),
    soundPathMm: Math.max(0, soundPath),
    amplitude: Math.max(0, Math.min(100, numeric(amplitudeValue))),
    timestamp: String(pick(row, ['timestamp', 'date_time', 'datetime', 'time', 'date']) ?? new Date().toISOString()),
    defectType: String(pick(row, ['defect_type', 'classification', 'defect', 'type']) ?? '').trim() || undefined,
    source,
  };
}

export async function importInspectionFiles(files: File[], operatorName = 'Operator'): Promise<InspectionDataset> {
  const points: ScanPoint[] = [];
  const sources: SourceFile[] = [];
  let importedMeta: Partial<InspectionMeta> = {};

  for (const file of files) {
    const lower = file.name.toLowerCase();
    const accepted = lower.endsWith('.csv') || lower.endsWith('.json') || lower.endsWith('.txt') || lower.endsWith('.dat');
    if (!accepted) {
      sources.push({ name: file.name, size: file.size, rows: 0, kind: 'Combined', status: 'Skipped', message: 'Unsupported file type' });
      continue;
    }
    try {
      const { records, meta } = recordsFromText(await file.text(), file.name);
      if (meta) importedMeta = { ...importedMeta, ...meta };
      const parsed = records.map((record, index) => recordToPoint(record, file.name, index)).filter((point): point is ScanPoint => point !== null);
      points.push(...parsed);
      const kind = lower.includes('ascan') ? 'A-scan' : lower.includes('bscan') ? 'B-scan' : 'Combined';
      sources.push({
        name: file.name,
        size: file.size,
        rows: parsed.length,
        kind,
        status: parsed.length ? 'Imported' : 'Skipped',
        message: parsed.length ? undefined : 'No rows with an amplitude column were found',
      });
    } catch (error) {
      sources.push({
        name: file.name,
        size: file.size,
        rows: 0,
        kind: 'Combined',
        status: 'Skipped',
        message: error instanceof Error ? error.message : 'Could not read file',
      });
    }
  }

  if (!points.length) throw new Error('No valid scan rows found. Check the supported column names and file format.');
  points.sort((a, b) => a.distanceMm - b.distanceMm);
  const meta = { ...defaultMeta(operatorName), ...importedMeta };
  const min = points[0].distanceMm / 1_000_000;
  const max = points[points.length - 1].distanceMm / 1_000_000;
  meta.startKm = min.toFixed(3);
  meta.endKm = max.toFixed(3);
  meta.kmTested = Math.max(0, max - min).toFixed(3);

  return {
    id: `import-${Date.now()}`,
    name: files.length === 1 ? files[0].name : `${files.length} instrument files`,
    loadedAt: new Date().toISOString(),
    points,
    files: sources,
    meta,
  };
}

function defaultDefectType(point: ScanPoint) {
  if (point.defectType) return point.defectType;
  if (point.depthMm <= 40 && point.probe !== 0) return 'Transverse / vertical head indication';
  if (point.depthMm >= 135) return 'Rail foot indication';
  if (point.depthMm >= 50 && point.depthMm < 130) return 'Web / bolt-hole indication';
  return DEFECT_TYPES[point.probe % DEFECT_TYPES.length].name;
}

export function buildExceptions(points: ScanPoint[], gate = GATE): InspectionException[] {
  const hits = points.filter((point) => point.amplitude >= gate).sort((a, b) => a.distanceMm - b.distanceMm);
  const groups: ScanPoint[][] = [];
  for (const point of hits) {
    const group = groups.find((candidate) => {
      const last = candidate[candidate.length - 1];
      return last.rail === point.rail && last.probe === point.probe && Math.abs(last.distanceMm - point.distanceMm) <= 140;
    });
    if (group) group.push(point);
    else groups.push([point]);
  }

  return groups.map((group, index) => {
    const peak = group.reduce((best, point) => (point.amplitude > best.amplitude ? point : best), group[0]);
    const severity = severityOf(peak.amplitude);
    const depth = group.reduce((sum, point) => sum + point.depthMm, 0) / group.length;
    const defectType = defaultDefectType(peak);
    return {
      id: `EX-${String(index + 1).padStart(3, '0')}`,
      rail: peak.rail,
      fromMm: group[0].distanceMm,
      toMm: group[group.length - 1].distanceMm,
      depthMm: depth,
      peakAmp: peak.amplitude,
      probe: peak.probe,
      defectType,
      severity: severity.key,
      action: severity.action,
      status: 'Open',
      classification: defectType,
      defectPosition: depth < 45 ? 'Head' : depth < 135 ? 'Web' : 'Foot',
      joggled: 'No',
      remark: '',
      source: peak.source,
    };
  });
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exceptionCsv(exceptions: InspectionException[]) {
  const headers = [
    'Exception ID',
    'Rail',
    'From (m)',
    'To (m)',
    'Probe',
    'Depth (mm)',
    'Peak Amp (%)',
    'Severity',
    'Classification',
    'Position',
    'Joggled',
    'Status',
    'Action',
    'Remark',
    'Source',
  ];
  const rows = exceptions.map((item) => [
    item.id,
    item.rail,
    (item.fromMm / 1000).toFixed(3),
    (item.toMm / 1000).toFixed(3),
    PROBES[item.probe].short,
    item.depthMm.toFixed(1),
    item.peakAmp.toFixed(1),
    item.severity,
    item.classification,
    item.defectPosition,
    item.joggled,
    item.status,
    item.action,
    item.remark,
    item.source,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadFile(name: string, content: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}