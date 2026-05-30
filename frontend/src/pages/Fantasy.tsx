// ============================================
// Fantasy.tsx — Fantasy XI Optimizer page
// Budget-based team selection with role constraints
// ============================================

import { useState } from 'react';
import Navbar from '../components/Navbar';
import { getFantasyXI } from '../services/api';
import type { FantasyXI, FantasyPlayer } from '../types/cricket';

const TEAMS = [
  'Mumbai Indians', 'Chennai Super Kings', 'Royal Challengers Bangalore',
  'Kolkata Knight Riders', 'Delhi Capitals', 'Rajasthan Royals',
  'Punjab Kings', 'Sunrisers Hyderabad', 'Gujarat Titans', 'Lucknow Super Giants',
  'India', 'Australia', 'England', 'Pakistan', 'New Zealand', 'South Africa',
];

// Role colors and icons
const ROLE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  WK:   { color: 'text-accent-gold border-accent-gold/40 bg-accent-gold/10',   icon: '🧤', label: 'Wicketkeeper' },
  BAT:  { color: 'text-accent-cyan border-accent-cyan/40 bg-accent-cyan/10',   icon: '🏏', label: 'Batsman' },
  BOWL: { color: 'text-accent-red border-accent-red/40 bg-accent-red/10',      icon: '🎯', label: 'Bowler' },
  AR:   { color: 'text-purple-400 border-purple-400/40 bg-purple-400/10',      icon: '⚡', label: 'All-Rounder' },
};

// Single player card component
function PlayerCard({ player }: { player: FantasyPlayer }) {
  const role = ROLE_CONFIG[player.role] || ROLE_CONFIG.BAT;

  return (
    <div className={`
      relative criciq-card border ${player.is_captain || player.is_vice_captain ? 'border-accent-gold/50' : ''}
      hover:-translate-y-1 transition-transform duration-200
    `}>
      {/* Captain / VC badge */}
      {player.is_captain && (
        <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent-gold text-bg-primary text-xs font-black flex items-center justify-center shadow-lg">
          C
        </span>
      )}
      {player.is_vice_captain && (
        <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gray-400 text-bg-primary text-xs font-black flex items-center justify-center shadow-lg">
          VC
        </span>
      )}

      {/* Player name + team */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-text-primary font-bold text-sm">{player.name}</p>
          <p className="text-text-secondary text-xs">{player.team}</p>
        </div>
        {/* Role badge */}
        <span className={`format-badge border ${role.color} text-xs`}>
          {role.icon} {player.role}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex justify-between text-xs mt-2">
        <div>
          <p className="text-text-secondary">Credits</p>
          <p className="text-accent-gold font-bold">{player.credits}</p>
        </div>
        <div>
          <p className="text-text-secondary">Predicted Pts</p>
          <p className="text-accent-cyan font-bold">{player.predicted_points}</p>
        </div>
      </div>

      {/* Reason tooltip */}
      <p className="text-text-secondary text-xs mt-2 border-t border-card-border pt-2 leading-relaxed">
        💡 {player.reason}
      </p>
    </div>
  );
}

export default function Fantasy() {
  const [team1, setTeam1] = useState('Mumbai Indians');
  const [team2, setTeam2] = useState('Chennai Super Kings');
  const [format, setFormat] = useState('T20');
  const [budget, setBudget] = useState(100);

  const [result, setResult]   = useState<FantasyXI | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFantasyXI(team1, team2, format, budget);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group players by role for organized display
  const grouped = result
    ? {
        WK:   result.xi.filter((p) => p.role === 'WK'),
        BAT:  result.xi.filter((p) => p.role === 'BAT'),
        AR:   result.xi.filter((p) => p.role === 'AR'),
        BOWL: result.xi.filter((p) => p.role === 'BOWL'),
      }
    : null;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-4xl font-display gradient-text mb-2"
            style={{ fontFamily: "'Bebas Neue', cursive" }}>
          Fantasy XI Optimizer
        </h1>
        <p className="text-text-secondary mb-8">
          AI-optimized Dream11 team selection within budget constraints
        </p>

        {/* Input form */}
        <div className="criciq-card mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">Team 1</label>
              <select
                value={team1}
                onChange={(e) => setTeam1(e.target.value)}
                className="w-full bg-bg-primary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/50"
              >
                {TEAMS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">Team 2</label>
              <select
                value={team2}
                onChange={(e) => setTeam2(e.target.value)}
                className="w-full bg-bg-primary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/50"
              >
                {TEAMS.filter((t) => t !== team1).map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-bg-primary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/50"
              >
                {['T20', 'ODI'].map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">
                Budget: <span className="text-accent-cyan">{budget} cr</span>
              </label>
              <input
                type="range" min={90} max={100} step={0.5} value={budget}
                onChange={(e) => setBudget(parseFloat(e.target.value))}
                className="w-full accent-accent-cyan"
              />
            </div>
          </div>

          <button
            onClick={handleOptimize}
            disabled={loading}
            className="mt-4 w-full py-3 rounded-xl font-bold text-bg-primary bg-accent-gold hover:bg-accent-gold/90 disabled:opacity-50 transition-all hover:scale-[1.01] shadow-lg shadow-accent-gold/20"
          >
            {loading ? 'Optimizing...' : '🏏 Build My Fantasy XI'}
          </button>

          {error && <p className="text-accent-red text-sm mt-3">⚠️ {error}</p>}
        </div>

        {/* Result */}
        {result && grouped && (
          <div className="space-y-6 fade-in-up">
            {/* Summary bar */}
            <div className="criciq-card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-widest">Captain</p>
                  <p className="text-accent-gold font-bold">{result.captain} (C)</p>
                </div>
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-widest">Vice Captain</p>
                  <p className="text-text-primary font-bold">{result.vice_captain} (VC)</p>
                </div>
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-widest">Credits Used</p>
                  <p className="text-accent-cyan font-display text-xl"
                     style={{ fontFamily: "'Bebas Neue', cursive" }}>
                    {result.total_credits_used} / {budget}
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-widest">Predicted Points</p>
                  <p className="text-accent-gold font-display text-xl"
                     style={{ fontFamily: "'Bebas Neue', cursive" }}>
                    {result.predicted_total_points}
                  </p>
                </div>
              </div>

              {/* Credits bar */}
              <div className="h-2 bg-gray-800 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-accent-gold rounded-full"
                  style={{ width: `${(result.total_credits_used / budget) * 100}%` }}
                />
              </div>
            </div>

            {/* Players by role */}
            {Object.entries(grouped).map(([role, players]) => (
              players.length > 0 && (
                <div key={role}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{ROLE_CONFIG[role]?.icon}</span>
                    <h3 className="text-text-primary font-semibold">{ROLE_CONFIG[role]?.label}s</h3>
                    <span className="text-text-secondary text-sm">({players.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {players.map((player, i) => (
                      <PlayerCard key={i} player={player} />
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="criciq-card text-center py-16">
            <span className="text-5xl block mb-4">🏏</span>
            <p className="text-text-primary font-semibold mb-2">Build Your Fantasy XI</p>
            <p className="text-text-secondary text-sm">
              Select two teams and click optimize — we'll pick the best 11 within your budget
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
