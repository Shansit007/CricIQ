// ============================================
// PressureScore.tsx — CricIQ Pressure Score Alerts
// Novel ML metric invented for CricIQ:
// Pressure Score = f(runs_needed, balls_left, wickets,
//                    batter SR, bowler economy, match phase)
// ============================================

import { useState } from 'react';
import Navbar from '../components/Navbar';

interface PressureResult {
  score: number;
  level: string;
  emoji: string;
  message: string;
  color: string;
  formula_breakdown: {
    required_run_rate:  number;
    base_pressure:      number;
    wicket_multiplier:  number;
    batter_efficiency:  number;
    phase_multiplier:   number;
    bowler_factor:      number;
  };
  input_used: Record<string, number | string>;
}

const DEFAULT = {
  runs_needed:        45,
  balls_remaining:    30,
  wickets_in_hand:    4,
  batter_strike_rate: 130,
  bowler_economy:     8.5,
  match_phase:        'death',
  batting_team:       'CSK',
  bowling_team:       'MI',
};

export default function PressureScore() {
  const [form, setForm]       = useState(DEFAULT);
  const [result, setResult]   = useState<PressureResult | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const fetchPressure = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/pressure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setResult(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Gauge visual: arc from 0 to score/15 ----
  const gaugePercent = result ? result.score / 15 : 0;
  const r = 70;
  const circumference = Math.PI * r;   // semicircle circumference
  const filled = gaugePercent * circumference;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ---- Header ---- */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-display gradient-text mb-2"
              style={{ fontFamily: "'Bebas Neue', cursive" }}>
            Pressure Score
          </h1>
          <p className="text-text-secondary text-base">
            CricIQ's <span className="text-accent-gold font-semibold">novel pressure metric</span> —
            score from 0 to 15 measuring match tension
          </p>
        </div>

        {/* ---- Formula explainer ---- */}
        <div className="criciq-card mb-6 border border-accent-gold/20">
          <p className="text-text-secondary text-xs uppercase tracking-widest mb-2">Formula (your invention 🎓)</p>
          <code className="text-accent-gold text-xs leading-relaxed block">
            Pressure = RRR × wicket_multiplier × batter_efficiency × phase_factor × bowler_factor
          </code>
        </div>

        {/* ---- Input form ---- */}
        <div className="criciq-card mb-6 space-y-4">
          <p className="text-text-secondary text-xs uppercase tracking-widest">Match Inputs</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Batting Team</label>
              <input value={form.batting_team} onChange={e => update('batting_team', e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Bowling Team</label>
              <input value={form.bowling_team} onChange={e => update('bowling_team', e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Runs Needed', key: 'runs_needed', max: 200 },
              { label: 'Balls Left',  key: 'balls_remaining', max: 120 },
              { label: 'Wickets in Hand', key: 'wickets_in_hand', max: 10 },
            ].map(({ label, key, max }) => (
              <div key={key}>
                <label className="text-xs text-text-secondary block mb-1">{label}</label>
                <input type="number" min={0} max={max}
                  value={form[key as keyof typeof form] as number}
                  onChange={e => update(key, +e.target.value)}
                  className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">Batter Strike Rate</span>
                <span className="text-accent-cyan">{form.batter_strike_rate}</span>
              </div>
              <input type="range" min={50} max={250} step={5}
                value={form.batter_strike_rate}
                onChange={e => update('batter_strike_rate', +e.target.value)}
                style={{ accentColor: '#00D4FF' }} className="w-full" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">Bowler Economy</span>
                <span className="text-accent-red">{form.bowler_economy}</span>
              </div>
              <input type="range" min={4} max={16} step={0.5}
                value={form.bowler_economy}
                onChange={e => update('bowler_economy', +e.target.value)}
                style={{ accentColor: '#FF4B4B' }} className="w-full" />
            </div>
          </div>

          {/* Match phase */}
          <div>
            <label className="text-xs text-text-secondary block mb-2">Match Phase</label>
            <div className="flex gap-2">
              {(['powerplay', 'middle', 'death'] as const).map(phase => (
                <button
                  key={phase}
                  onClick={() => update('match_phase', phase)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                    form.match_phase === phase
                      ? 'bg-accent-cyan text-bg-primary'
                      : 'border border-card-border text-text-secondary hover:border-accent-cyan'
                  }`}
                >
                  {phase}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={fetchPressure}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-accent-cyan text-bg-primary hover:bg-accent-cyan/90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Computing...' : '⚡ Calculate Pressure Score'}
          </button>
        </div>

        {/* ---- Result ---- */}
        {result && (
          <div className="space-y-4">

            {/* Main pressure gauge */}
            <div className="criciq-card flex flex-col items-center"
                 style={{ borderColor: result.color + '44', borderWidth: 1 }}>

              {/* SVG semicircle gauge */}
              <svg width="220" height="130" viewBox="0 0 220 130">
                {/* Background arc */}
                <path d="M 40 110 A 70 70 0 1 1 180 110"
                  fill="none" stroke="#1F2937" strokeWidth="16" strokeLinecap="round" />
                {/* Filled arc */}
                <path d="M 40 110 A 70 70 0 1 1 180 110"
                  fill="none" stroke={result.color} strokeWidth="16" strokeLinecap="round"
                  strokeDasharray={`${filled} ${circumference}`}
                  style={{ filter: `drop-shadow(0 0 8px ${result.color}88)`, transition: 'stroke-dasharray 1s ease' }} />
                {/* Score text */}
                <text x="110" y="90" textAnchor="middle" fill={result.color}
                  fontSize="38" fontFamily="'Bebas Neue', cursive" fontWeight="bold">
                  {result.score}
                </text>
                <text x="110" y="108" textAnchor="middle" fill="#4B5563" fontSize="11" fontFamily="Inter">
                  out of 15
                </text>
              </svg>

              {/* Alert message */}
              <div className="text-center mt-2">
                <p className="text-3xl mb-1">{result.emoji}</p>
                <p className="font-bold text-base" style={{ color: result.color }}>
                  {result.level} PRESSURE
                </p>
                <p className="text-text-secondary text-sm mt-1 max-w-sm">{result.message}</p>
              </div>
            </div>

            {/* Formula breakdown — great for interviews! */}
            <div className="criciq-card">
              <p className="text-text-secondary text-xs uppercase tracking-widest mb-4">Formula Breakdown</p>
              <div className="space-y-2">
                {Object.entries(result.formula_breakdown).map(([key, val]) => {
                  // Convert snake_case to readable label
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  const isMain = key === 'required_run_rate';
                  return (
                    <div key={key} className="flex justify-between items-center py-2 border-b border-card-border last:border-0">
                      <span className="text-text-secondary text-sm">{label}</span>
                      <span className={`font-bold text-sm font-mono ${isMain ? 'text-accent-gold' : 'text-text-primary'}`}>
                        {typeof val === 'number' ? val.toFixed(2) : val}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recalculate */}
            <button
              onClick={() => setResult(null)}
              className="w-full py-3 rounded-xl border border-card-border text-text-secondary hover:border-accent-cyan hover:text-accent-cyan transition-all"
            >
              ↩ Try Different Scenario
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
