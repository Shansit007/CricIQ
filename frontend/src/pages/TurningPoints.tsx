// ============================================
// TurningPoints.tsx — Chess-Style Turning Points Map
// Shows the 3 moments that changed the match
// With counterfactual analysis + win probability chart
// ============================================

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import Navbar from '../components/Navbar';

interface TurningPoint {
  rank:           number;
  over:           number;
  label:          string;
  event_type:     string;
  description:    string;
  prob_before:    number;
  prob_after:     number;
  swing:          number;
  direction:      string;
  favors:         string;
  counterfactual: string;
}

interface TurningResult {
  batting_team:   string;
  bowling_team:   string;
  result:         string;
  turning_points: TurningPoint[];
  wp_curve:       number[];
  final_wp:       number;
}

const DEFAULT = {
  batting_team: 'CSK',
  bowling_team: 'MI',
  target:       180,
  final_score:  165,
  result:       'MI won by 15 runs',
};

// Event type → emoji
const EVENT_EMOJI: Record<string, string> = {
  wicket:           '🎯',
  boundary_cluster: '💥',
  maiden:           '🔒',
  drop_catch:       '😱',
};

export default function TurningPoints() {
  const [form, setForm]       = useState(DEFAULT);
  const [result, setResult]   = useState<TurningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);   // which turning point is highlighted

  const update = (key: string, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const fetchTurningPoints = async () => {
    setLoading(true);
    setSelected(null);
    try {
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE}/api/turning-points`, {
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

  // ---- Build Recharts data from wp_curve ----
  const chartData = result?.wp_curve.map((wp, i) => ({
    over: i,
    probability: Math.round(wp * 100),
  })) ?? [];

  // ---- Custom Recharts tooltip ----
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const tp = result?.turning_points.find(t => t.over === label);
    return (
      <div className="criciq-card text-xs p-2 border border-accent-cyan/30">
        <p className="text-accent-cyan font-bold">Over {label}</p>
        <p className="text-text-primary">Win prob: {payload[0].value}%</p>
        {tp && <p className="text-accent-gold mt-1">⚡ Turning point #{tp.rank}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* ---- Header ---- */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-display gradient-text mb-2"
              style={{ fontFamily: "'Bebas Neue', cursive" }}>
            Turning Points Map
          </h1>
          <p className="text-text-secondary text-base">
            The <span className="text-accent-cyan font-semibold">3 moments</span> that decided the match —
            chess-style analysis with counterfactuals
          </p>
        </div>

        {/* ---- Form ---- */}
        <div className="criciq-card mb-6 space-y-4">
          <p className="text-text-secondary text-xs uppercase tracking-widest">Match Details</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Batting Team</label>
              <input value={form.batting_team} onChange={e => update('batting_team', e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Bowling/Fielding Team</label>
              <input value={form.bowling_team} onChange={e => update('bowling_team', e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Target</label>
              <input type="number" value={form.target} onChange={e => update('target', +e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Final Score</label>
              <input type="number" value={form.final_score} onChange={e => update('final_score', +e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Result</label>
              <input value={form.result} onChange={e => update('result', e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
          </div>

          <button
            onClick={fetchTurningPoints}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-accent-cyan text-bg-primary hover:bg-accent-cyan/90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Analyzing...' : '♟ Find Turning Points'}
          </button>
        </div>

        {/* ---- Results ---- */}
        {result && (
          <div className="space-y-6">

            {/* Result banner */}
            <div className="criciq-card text-center border border-accent-gold/30">
              <p className="text-accent-gold text-2xl font-display" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                {result.result}
              </p>
              <p className="text-text-secondary text-sm mt-1">
                {result.batting_team} vs {result.bowling_team}
              </p>
            </div>

            {/* Win probability chart */}
            <div className="criciq-card">
              <p className="text-text-secondary text-xs uppercase tracking-widest mb-4">Win Probability Timeline</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="wpGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00D4FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="over" tick={{ fill: '#4B5563', fontSize: 11 }} label={{ value: 'Over', position: 'insideBottom', fill: '#4B5563', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#4B5563', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  {/* Reference lines at each turning point */}
                  {result.turning_points.map(tp => (
                    <ReferenceLine key={tp.over} x={tp.over} stroke="#F4A703" strokeDasharray="4 2"
                      label={{ value: `#${tp.rank}`, fill: '#F4A703', fontSize: 10 }} />
                  ))}
                  {/* 50% line */}
                  <ReferenceLine y={50} stroke="#1F2937" strokeDasharray="2 2" />
                  <Area type="monotone" dataKey="probability" stroke="#00D4FF" strokeWidth={2}
                    fill="url(#wpGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Turning point cards */}
            <div className="space-y-3">
              <p className="text-text-secondary text-xs uppercase tracking-widest">The 3 Turning Points</p>

              {result.turning_points.map(tp => (
                <div
                  key={tp.rank}
                  onClick={() => setSelected(selected === tp.rank ? null : tp.rank)}
                  className={`criciq-card cursor-pointer transition-all duration-200 ${
                    selected === tp.rank
                      ? 'border border-accent-gold/50'
                      : 'hover:border-card-border/70'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{EVENT_EMOJI[tp.event_type] ?? '⚡'}</span>
                      <div>
                        <p className="text-text-primary font-bold text-sm">
                          Turning Point #{tp.rank} — {tp.label}
                        </p>
                        <p className="text-text-secondary text-xs capitalize">{tp.event_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    {/* Probability swing badge */}
                    <div className="text-right">
                      <p className="font-bold text-sm" style={{ color: tp.direction === '↑' ? '#00D4FF' : '#FF4B4B' }}>
                        {tp.direction} {tp.swing}%
                      </p>
                      <p className="text-text-secondary text-xs">swing</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-text-primary text-sm mb-2">{tp.description}</p>

                  {/* Probability bar */}
                  <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
                    <span>{tp.prob_before}%</span>
                    <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${tp.prob_after}%`,
                          background: tp.prob_after > tp.prob_before ? '#00D4FF' : '#FF4B4B',
                        }}
                      />
                    </div>
                    <span>{tp.prob_after}%</span>
                  </div>

                  {/* Counterfactual — shows on click */}
                  {selected === tp.rank && (
                    <div className="mt-3 p-3 rounded-lg bg-bg-secondary border border-accent-gold/20">
                      <p className="text-xs text-accent-gold font-semibold mb-1">♟ Counterfactual Analysis</p>
                      <p className="text-text-secondary text-xs leading-relaxed">{tp.counterfactual}</p>
                    </div>
                  )}

                  <p className="text-text-secondary text-xs mt-2">
                    {selected === tp.rank ? '▲ Click to collapse' : '▼ Click to see counterfactual'}
                  </p>
                </div>
              ))}
            </div>

            {/* Retry */}
            <button
              onClick={() => { setResult(null); setSelected(null); }}
              className="w-full py-3 rounded-xl border border-card-border text-text-secondary hover:border-accent-cyan hover:text-accent-cyan transition-all"
            >
              ↩ Analyze Different Match
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
