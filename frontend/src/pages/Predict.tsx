// ============================================
// Predict.tsx — Match prediction form
// User enters match state → ML model returns win probability + SHAP
// ============================================

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import WinGauge from '../components/WinGauge';
import ShapPanel from '../components/ShapPanel';
import { predictWinProbability } from '../services/api';
import type { PredictionResult } from '../types/cricket';

// All teams supported by the model
const ALL_TEAMS = [
  // International
  'India', 'Australia', 'England', 'Pakistan', 'New Zealand',
  'South Africa', 'West Indies', 'Sri Lanka', 'Bangladesh', 'Afghanistan',
  // IPL Teams
  'Mumbai Indians', 'Chennai Super Kings', 'Royal Challengers Bangalore',
  'Kolkata Knight Riders', 'Delhi Capitals', 'Rajasthan Royals',
  'Punjab Kings', 'Sunrisers Hyderabad', 'Gujarat Titans', 'Lucknow Super Giants',
];

const VENUES = [
  'Wankhede Stadium, Mumbai',
  'M.A. Chidambaram Stadium, Chennai',
  'Eden Gardens, Kolkata',
  'Narendra Modi Stadium, Ahmedabad',
  'Arun Jaitley Stadium, Delhi',
  'M. Chinnaswamy Stadium, Bangalore',
  'Sawai Mansingh Stadium, Jaipur',
  'Rajiv Gandhi International Cricket Stadium, Hyderabad',
  'Lord\'s Cricket Ground, London',
  'Melbourne Cricket Ground',
  'Sydney Cricket Ground',
  'Dubai International Cricket Stadium',
];

export default function Predict() {
  // Read pre-filled teams from URL params (when coming from MatchCard)
  const [searchParams] = useSearchParams();

  // Form state — all the inputs
  const [form, setForm] = useState({
    batting_team:  searchParams.get('team1') || 'India',
    bowling_team:  searchParams.get('team2') || 'Australia',
    format:        searchParams.get('format') || 'T20',
    venue:         VENUES[0],
    target:        180,
    current_score: 80,
    wickets:       2,
    overs:         10.0,
    pitch_type:    'flat',
  });

  // Result from API
  const [result, setResult]   = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Update a single form field
  const updateForm = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Submit form → call ML model
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();    // prevent default form submission (page reload)
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await predictWinProbability(form);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Prediction failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display gradient-text"
              style={{ fontFamily: "'Bebas Neue', cursive" }}>
            Match Predictor
          </h1>
          <p className="text-text-secondary mt-1">
            Enter the current match state to get win probability + AI explanation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ---- Left: Form ---- */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Teams row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Batting team */}
              <div>
                <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">
                  🏏 Batting Team
                </label>
                <select
                  value={form.batting_team}
                  onChange={(e) => updateForm('batting_team', e.target.value)}
                  className="w-full bg-bg-card border border-card-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/50"
                >
                  {ALL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Bowling team */}
              <div>
                <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">
                  🎯 Bowling Team
                </label>
                <select
                  value={form.bowling_team}
                  onChange={(e) => updateForm('bowling_team', e.target.value)}
                  className="w-full bg-bg-card border border-card-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/50"
                >
                  {ALL_TEAMS.filter((t) => t !== form.batting_team).map((t) =>
                    <option key={t} value={t}>{t}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Format + Venue */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">Format</label>
                <select
                  value={form.format}
                  onChange={(e) => updateForm('format', e.target.value)}
                  className="w-full bg-bg-card border border-card-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/50"
                >
                  {['T20', 'ODI', 'Test', 'T20I'].map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">Pitch Type</label>
                <select
                  value={form.pitch_type}
                  onChange={(e) => updateForm('pitch_type', e.target.value)}
                  className="w-full bg-bg-card border border-card-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/50"
                >
                  {['flat', 'green', 'dusty', 'fast'].map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Venue */}
            <div>
              <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">📍 Venue</label>
              <select
                value={form.venue}
                onChange={(e) => updateForm('venue', e.target.value)}
                className="w-full bg-bg-card border border-card-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/50"
              >
                {VENUES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>

            {/* Numeric inputs */}
            {[
              { key: 'target',        label: 'Target Score',      min: 50,  max: 500, step: 1  },
              { key: 'current_score', label: 'Current Score',     min: 0,   max: 499, step: 1  },
              { key: 'wickets',       label: 'Wickets Fallen',    min: 0,   max: 9,   step: 1  },
              { key: 'overs',         label: 'Overs Completed',   min: 0,   max: 50,  step: 0.1 },
            ].map(({ key, label, min, max, step }) => (
              <div key={key}>
                <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">
                  {label}: <span className="text-accent-cyan">{(form as any)[key]}</span>
                </label>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={(form as any)[key]}
                  onChange={(e) => updateForm(key, parseFloat(e.target.value))}
                  className="w-full accent-accent-cyan"
                />
              </div>
            ))}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-3 rounded-xl font-bold text-bg-primary
                bg-accent-cyan hover:bg-accent-cyan/90
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200 hover:scale-[1.02]
                shadow-lg shadow-accent-cyan/20
              "
            >
              {loading ? 'Predicting...' : '📊 Predict Win Probability'}
            </button>

            {/* Error */}
            {error && (
              <p className="text-accent-red text-sm bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2">
                ⚠️ {error}
              </p>
            )}
          </form>

          {/* ---- Right: Results ---- */}
          <div className="space-y-6">
            {/* Empty state — before prediction */}
            {!result && !loading && (
              <div className="criciq-card flex flex-col items-center justify-center py-16 text-center">
                <span className="text-5xl mb-4">📊</span>
                <p className="text-text-primary font-semibold mb-2">Ready to predict</p>
                <p className="text-text-secondary text-sm">Fill in the match details and click Predict</p>
              </div>
            )}

            {/* Loading animation */}
            {loading && (
              <div className="criciq-card flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 border-4 border-card-border border-t-accent-cyan rounded-full animate-spin mb-4" />
                <p className="text-text-secondary text-sm">Running ML model...</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <>
                {/* Win gauge */}
                <WinGauge
                  probability={result.win_probability}
                  battingTeam={form.batting_team}
                  bowlingTeam={form.bowling_team}
                />

                {/* H2H stat */}
                {result.h2h_win_rate !== undefined && (
                  <div className="criciq-card">
                    <p className="text-text-secondary text-xs uppercase tracking-widest mb-2">Historical H2H at Venue</p>
                    <p className="text-text-primary text-sm">
                      <span className="text-accent-gold font-bold">{form.batting_team}</span> wins{' '}
                      <span className="text-accent-cyan font-bold">{Math.round(result.h2h_win_rate * 100)}%</span>{' '}
                      of matches at this venue
                    </p>
                  </div>
                )}

                {/* SHAP panel */}
                <ShapPanel
                  features={result.shap_features || []}
                  battingTeam={form.batting_team}
                />

                {/* Model accuracy badge */}
                <p className="text-text-secondary text-xs text-center">
                  Model accuracy:{' '}
                  <span className="text-accent-cyan font-semibold">
                    {result.model_accuracy ? `${Math.round(result.model_accuracy * 100)}%` : '84%'}
                  </span>{' '}
                  on test set • XGBoost + SHAP
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
