// ============================================
// Rivalry.tsx — Head-to-head rivalry intelligence
// Shows H2H stats, year trends, top performers
// ============================================

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import Navbar from '../components/Navbar';
import { getRivalryStats } from '../services/api';
import type { RivalryStats } from '../types/cricket';

const TEAMS = [
  'India', 'Australia', 'England', 'Pakistan', 'New Zealand',
  'South Africa', 'West Indies', 'Sri Lanka', 'Bangladesh', 'Afghanistan',
  'Mumbai Indians', 'Chennai Super Kings', 'Royal Challengers Bangalore',
  'Kolkata Knight Riders', 'Delhi Capitals', 'Rajasthan Royals',
];

export default function Rivalry() {
  const [team1, setTeam1] = useState('India');
  const [team2, setTeam2] = useState('Australia');
  const [format, setFormat] = useState('T20I');

  const [stats, setStats]   = useState<RivalryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSearch = async () => {
    if (team1 === team2) {
      setError('Please select two different teams.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getRivalryStats(team1, team2, format);
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-4xl font-display gradient-text mb-2"
            style={{ fontFamily: "'Bebas Neue', cursive" }}>
          Rivalry Intelligence
        </h1>
        <p className="text-text-secondary mb-8">Deep head-to-head analytics between any two teams</p>

        {/* Selector */}
        <div className="criciq-card mb-8">
          <div className="flex flex-col sm:flex-row items-end gap-4">
            {/* Team 1 */}
            <div className="flex-1">
              <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">Team 1</label>
              <select
                value={team1}
                onChange={(e) => setTeam1(e.target.value)}
                className="w-full bg-bg-primary border border-card-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/50"
              >
                {TEAMS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* VS */}
            <div className="text-2xl font-display text-accent-gold pb-2"
                 style={{ fontFamily: "'Bebas Neue', cursive" }}>
              VS
            </div>

            {/* Team 2 */}
            <div className="flex-1">
              <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">Team 2</label>
              <select
                value={team2}
                onChange={(e) => setTeam2(e.target.value)}
                className="w-full bg-bg-primary border border-card-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/50"
              >
                {TEAMS.filter((t) => t !== team1).map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Format */}
            <div className="flex-1">
              <label className="text-text-secondary text-xs uppercase tracking-wide block mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-bg-primary border border-card-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/50"
              >
                {['T20I', 'ODI', 'Test', 'IPL'].map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>

            {/* Search button */}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-accent-cyan text-bg-primary font-bold text-sm hover:bg-accent-cyan/90 disabled:opacity-50 transition-all hover:scale-105"
            >
              {loading ? '...' : 'Analyze ⚔️'}
            </button>
          </div>

          {error && <p className="text-accent-red text-sm mt-3">⚠️ {error}</p>}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-card-border border-t-accent-cyan rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Analyzing rivalry data...</p>
          </div>
        )}

        {/* Results */}
        {stats && !loading && (
          <div className="space-y-6 fade-in-up">

            {/* ---- Win split header ---- */}
            <div className="criciq-card">
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Team 1 side */}
                <div className="text-center">
                  <p className="text-text-primary font-bold text-lg">{team1}</p>
                  <p className="text-5xl font-display text-accent-cyan mt-1"
                     style={{ fontFamily: "'Bebas Neue', cursive" }}>
                    {stats.win_percentage.team1}%
                  </p>
                  <p className="text-text-secondary text-sm">{stats.team1_wins} wins</p>
                </div>

                {/* Center stats */}
                <div className="text-center">
                  <p className="text-text-secondary text-xs uppercase tracking-widest">Total Matches</p>
                  <p className="text-4xl font-display text-accent-gold"
                     style={{ fontFamily: "'Bebas Neue', cursive" }}>
                    {stats.total_matches}
                  </p>
                  <p className="text-text-secondary text-xs">{format}</p>
                </div>

                {/* Team 2 side */}
                <div className="text-center">
                  <p className="text-text-primary font-bold text-lg">{team2}</p>
                  <p className="text-5xl font-display text-accent-red mt-1"
                     style={{ fontFamily: "'Bebas Neue', cursive" }}>
                    {stats.win_percentage.team2}%
                  </p>
                  <p className="text-text-secondary text-sm">{stats.team2_wins} wins</p>
                </div>
              </div>

              {/* Win percentage bar */}
              <div className="mt-4 h-3 bg-accent-red rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-cyan rounded-full transition-all duration-1000"
                  style={{ width: `${stats.win_percentage.team1}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-accent-cyan">{team1}</span>
                <span className="text-xs text-accent-red">{team2}</span>
              </div>
            </div>

            {/* ---- Quick stats row ---- */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Avg 1st Inn Score', value: stats.avg_first_innings_score },
                { label: 'Highest Chase',     value: stats.highest_chase },
                { label: 'Format',            value: format },
              ].map(({ label, value }) => (
                <div key={label} className="criciq-card text-center">
                  <p className="text-text-secondary text-xs uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-2xl font-display text-accent-gold"
                     style={{ fontFamily: "'Bebas Neue', cursive" }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* ---- Year-by-year chart ---- */}
            {stats.year_by_year && stats.year_by_year.length > 0 && (
              <div className="criciq-card">
                <p className="text-text-primary font-semibold mb-4">Year-by-Year Win Trend</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.year_by_year}>
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
                      labelStyle={{ color: '#E8EAF0' }}
                    />
                    <Bar dataKey="team1_wins" name={team1} fill="#00D4FF" radius={[3,3,0,0]} />
                    <Bar dataKey="team2_wins" name={team2} fill="#FF4B4B" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ---- Top performers ---- */}
            {stats.top_performers && stats.top_performers.length > 0 && (
              <div className="criciq-card">
                <p className="text-text-primary font-semibold mb-4">🏆 Top Performers in this Rivalry</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.top_performers.map((player, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/3 rounded-lg px-3 py-2.5">
                      <span className="text-2xl font-display text-accent-gold"
                            style={{ fontFamily: "'Bebas Neue', cursive" }}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-text-primary font-medium text-sm">{player.name}</p>
                        <p className="text-text-secondary text-xs">
                          {player.team} • Avg {player.avg} in {player.matches} matches
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---- Greatest match ---- */}
            {stats.most_dramatic_match && (
              <div className="criciq-card border-accent-gold/30">
                <p className="text-accent-gold font-semibold mb-2">🎭 Greatest Match in this Rivalry</p>
                <p className="text-text-primary font-bold">{stats.most_dramatic_match.result}</p>
                <p className="text-text-secondary text-sm mt-1">{stats.most_dramatic_match.date}</p>
                <p className="text-text-secondary text-sm mt-2 leading-relaxed">{stats.most_dramatic_match.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!stats && !loading && (
          <div className="criciq-card text-center py-16">
            <span className="text-5xl block mb-4">⚔️</span>
            <p className="text-text-primary font-semibold mb-2">Select two teams to analyze their rivalry</p>
            <p className="text-text-secondary text-sm">Historical stats, year-by-year trends, top performers</p>
          </div>
        )}
      </div>
    </div>
  );
}
