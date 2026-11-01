import { useState } from 'react';
import CanvasView from './CanvasView';
import { drawLoginWave } from '../sim/draw';
import { PROBES } from '../sim/engine';

interface Props {
  onLogin: (user: string) => void;
}

export const DEMO_USER = 'operator';
export const DEMO_PASS = 'rail@123';

export default function Login({ onLogin }: Props) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user.trim() || !pass) {
      setError('Please enter both Operator ID and password.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      if (user.trim().toLowerCase() === DEMO_USER && pass === DEMO_PASS) {
        onLogin(user.trim());
      } else {
        setLoading(false);
        setError('Invalid Operator ID or password.');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#03100d] text-emerald-50 flex flex-col lg:flex-row">
      {/* Left hero */}
      <div className="relative lg:flex-1 min-h-[260px] lg:min-h-screen overflow-hidden border-b lg:border-b-0 lg:border-r border-emerald-900/60">
        <CanvasView draw={drawLoginWave} className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#03100d] via-transparent to-[#03100d]/70 pointer-events-none" />
        <div className="relative z-10 p-8 lg:p-12 flex flex-col h-full justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-400/40 grid place-items-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h4l2-7 4 14 2-7h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="font-semibold tracking-wide">RailScan UT</div>
              <div className="text-[11px] text-emerald-300/60 tracking-[0.25em]">ULTRASONIC RAIL TESTING</div>
            </div>
          </div>
          <div className="mt-24 lg:mt-0 max-w-xl">
            <h1 className="text-3xl lg:text-5xl font-bold leading-tight">
              See inside the rail.
              <span className="block text-emerald-400">Before it fails.</span>
            </h1>
            <p className="mt-4 text-emerald-100/60 max-w-md">
              Live A-scan and B-scan from 9 probes on both the Left Rail and Right Rail, with instant defect severity grading.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {PROBES.map((p) => (
                <span
                  key={p.id}
                  className="px-2.5 py-1 rounded-full text-xs font-mono border"
                  style={{ color: p.color, borderColor: p.color + '66', background: p.color + '14' }}
                >
                  {p.short}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="lg:w-[480px] grid place-items-center p-6 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold">Operator login</h2>
          <p className="text-sm text-emerald-100/50 mt-1">Sign in to start the inspection run.</p>

          <label className="block mt-8 text-xs uppercase tracking-wider text-emerald-300/70">Operator ID</label>
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            placeholder="e.g. operator"
            className="mt-1.5 w-full rounded-lg bg-[#071d17] border border-emerald-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none px-4 py-3 text-sm placeholder:text-emerald-100/25"
          />

          <label className="block mt-5 text-xs uppercase tracking-wider text-emerald-300/70">Password</label>
          <div className="relative mt-1.5">
            <input
              type={show ? 'text' : 'password'}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg bg-[#071d17] border border-emerald-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none px-4 py-3 pr-16 text-sm placeholder:text-emerald-100/25"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-300/70 hover:text-emerald-200"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-emerald-950 font-semibold py-3 transition"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="mt-6 text-xs text-emerald-100/50 rounded-lg border border-emerald-900/70 bg-emerald-950/40 p-3">
            <div className="text-emerald-300/80 font-medium mb-1">Demo credentials</div>
            <div className="font-mono">
              ID: {DEMO_USER} &nbsp;|&nbsp; Password: {DEMO_PASS}
            </div>
            <button
              type="button"
              onClick={() => {
                setUser(DEMO_USER);
                setPass(DEMO_PASS);
              }}
              className="mt-2 text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
            >
              Fill automatically
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
