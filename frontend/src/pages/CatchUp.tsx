// ============================================
// CatchUp.tsx — AI Catch-Up Narrator
// User opens app after 45 mins away.
// Groq AI generates a 30-second natural English catch-up.
// ============================================

import { useState } from 'react';
import Navbar from '../components/Navbar';

interface CatchupResult {
  narration:       string;
  minutes_away:    number;
  runs_needed:     number;
  balls_remaining: number;
  current_state:   { score: string; overs: string; target: number };
  groq_used:       boolean;
}

// ---- Match input form defaults ----
const DEFAULT_STATE = {
  batting_team:    'CSK',
  bowling_team:    'MI',
  current_score:   120,
  current_wickets: 4,
  current_overs:   14.2,
  target:          180,
  top_scorer:      'Rohit Sharma (52)',
  top_wicket:      'Bumrah (2/18)',
  minutes_away:    45,
};

export default function CatchUp() {
  const [form, setForm]       = useState(DEFAULT_STATE);
  const [result, setResult]   = useState<CatchupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping]   = useState('');   // typewriter effect text

  // ---- Update form field ----
  const update = (key: string, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ---- Typewriter animation ----
  // Shows narration letter by letter for dramatic effect
  const typewriterEffect = (text: string) => {
    setTyping('');
    let i = 0;
    const interval = setInterval(() => {
      setTyping(text.slice(0, i + 1));   // reveal one more character
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 25);   // 25ms per character = feels natural
  };

  // ---- Fetch catch-up from backend ----
  const fetchCatchup = async () => {
    setLoading(true);
    setResult(null);
    setTyping('');

    // Build last_checked: subtract minutes_away from now
    const lastChecked = new Date(Date.now() - form.minutes_away * 60 * 1000).toISOString();

    try {
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE}/api/catchup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, last_checked: lastChecked }),
      });
      const data: CatchupResult = await res.json();
      setResult(data);
      typewriterEffect(data.narration);   // animate the narration
    } catch (err) {
      console.error('Catchup failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ---- Header ---- */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-display gradient-text mb-2"
              style={{ fontFamily: "'Bebas Neue', cursive" }}>
            AI Catch-Up
          </h1>
          <p className="text-text-secondary text-base">
            Been away? Get a{' '}
            <span className="text-accent-cyan font-semibold">30-second friend-style catch-up</span>
            {' '}— powered by Llama 3.3
          </p>
        </div>

        {/* ---- Match state form ---- */}
        <div className="criciq-card mb-6 space-y-4">
          <p className="text-text-secondary text-xs uppercase tracking-widest">Current Match State</p>

          {/* Teams */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Batting Team</label>
              <input value={form.batting_team}
                onChange={e => update('batting_team', e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Bowling Team</label>
              <input value={form.bowling_team}
                onChange={e => update('bowling_team', e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
          </div>

          {/* Score + Target */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Current Score</label>
              <input type="number" value={form.current_score}
                onChange={e => update('current_score', +e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Wickets</label>
              <input type="number" min={0} max={10} value={form.current_wickets}
                onChange={e => update('current_wickets', +e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Target</label>
              <input type="number" value={form.target}
                onChange={e => update('target', +e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
          </div>

          {/* Players */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Top Scorer</label>
              <input value={form.top_scorer}
                onChange={e => update('top_scorer', e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Best Bowler</label>
              <input value={form.top_wicket}
                onChange={e => update('top_wicket', e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan" />
            </div>
          </div>

          {/* Minutes away slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-secondary">I was away for</span>
              <span className="text-accent-gold font-bold">{form.minutes_away} minutes</span>
            </div>
            <input type="range" min={5} max={120} step={5}
              value={form.minutes_away}
              onChange={e => update('minutes_away', +e.target.value)}
              className="w-full" style={{ accentColor: '#F4A703' }} />
          </div>

          {/* Submit button */}
          <button
            onClick={fetchCatchup}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-accent-cyan text-bg-primary hover:bg-accent-cyan/90 disabled:opacity-50 transition-all"
          >
            {loading ? '🤖 Generating...' : '🎙 Catch Me Up!'}
          </button>
        </div>

        {/* ---- Loading ---- */}
        {loading && (
          <div className="criciq-card text-center py-8">
            <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-text-secondary text-sm">Llama 3.3 is briefing you...</p>
          </div>
        )}

        {/* ---- Result: AI narration with typewriter ---- */}
        {(typing || result) && !loading && (
          <div className="space-y-4">

            {/* Narration card */}
            <div className="criciq-card border border-accent-cyan/30"
                 style={{ background: 'rgba(0,212,255,0.04)' }}>
              {/* AI badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-accent-cyan pulse-cyan" />
                <span className="text-xs text-accent-cyan uppercase tracking-widest font-semibold">
                  {result?.groq_used ? 'Llama 3.3 70B' : 'AI Narrator'}
                </span>
              </div>

              {/* Typewriter narration */}
              <p className="text-text-primary text-base leading-relaxed font-medium">
                "{typing}"
                {/* Blinking cursor while typing */}
                {typing.length < (result?.narration?.length ?? 0) && (
                  <span className="animate-pulse text-accent-cyan">|</span>
                )}
              </p>
            </div>

            {/* Quick stats row */}
            {result && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Runs Needed', value: result.runs_needed, color: '#FF4B4B' },
                  { label: 'Balls Left',  value: result.balls_remaining, color: '#F4A703' },
                  { label: 'Score',       value: result.current_state.score, color: '#00D4FF' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="criciq-card text-center">
                    <p className="text-text-secondary text-xs mb-1">{label}</p>
                    <p className="text-xl font-display font-bold" style={{ color, fontFamily: "'Bebas Neue', cursive" }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Try again */}
            <button
              onClick={() => { setResult(null); setTyping(''); }}
              className="w-full py-3 rounded-xl border border-card-border text-text-secondary hover:border-accent-cyan hover:text-accent-cyan transition-all"
            >
              ↩ Different Match
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
