// ============================================
// Matches.tsx — All upcoming + live matches
// Fetches from /api/matches/upcoming every 60s
// ============================================

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import MatchCard from '../components/MatchCard';
import { SkeletonMatchGrid } from '../components/SkeletonLoader';
import { getUpcomingMatches } from '../services/api';
import type { Match } from '../types/cricket';

export default function Matches() {
  // State to hold the fetched matches
  const [matches, setMatches] = useState<Match[]>([]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Which format filter is selected (null = show all)
  const [filter, setFilter] = useState<string | null>(null);

  // Fetch matches from backend
  const fetchMatches = async () => {
    try {
      const data = await getUpcomingMatches();
      setMatches(data);
      setError(null);       // clear any previous error
    } catch (err: any) {
      setError(err.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount + poll every 60 seconds (respects CricAPI free tier)
  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 60_000);  // 60 seconds
    return () => clearInterval(interval);                 // cleanup on unmount
  }, []);

  // Check if any match is currently live (for Navbar LIVE dot)
  const hasLiveMatch = matches.some((m) => m.status === 'live');

  // Apply format filter
  const filteredMatches = filter
    ? matches.filter((m) => m.format.toUpperCase() === filter)
    : matches;

  // Separate live vs upcoming
  const liveMatches     = filteredMatches.filter((m) => m.status === 'live');
  const upcomingMatches = filteredMatches.filter((m) => m.status !== 'live');

  // Format filter options
  const formatOptions = ['T20', 'ODI', 'Test', 'IPL'];

  return (
    <div className="min-h-screen">
      <Navbar isLive={hasLiveMatch} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display gradient-text"
                style={{ fontFamily: "'Bebas Neue', cursive" }}>
              Matches
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Live scores update every 60s • {matches.length} matches loaded
            </p>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => { setLoading(true); fetchMatches(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-card-border text-text-secondary hover:text-text-primary hover:border-accent-cyan/40 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Format filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              !filter
                ? 'bg-accent-cyan text-bg-primary'
                : 'border border-card-border text-text-secondary hover:border-accent-cyan/40 hover:text-text-primary'
            }`}
          >
            All
          </button>
          {formatOptions.map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFilter(filter === fmt ? null : fmt)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === fmt
                  ? 'bg-accent-cyan text-bg-primary'
                  : 'border border-card-border text-text-secondary hover:border-accent-cyan/40 hover:text-text-primary'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="criciq-card border border-accent-red/30 bg-accent-red/10 mb-6">
            <p className="text-accent-red text-sm">
              ⚠️ {error}
            </p>
            <p className="text-text-secondary text-xs mt-1">
              Make sure the backend is running and CRICAPI_KEY is set in backend/.env
            </p>
          </div>
        )}

        {/* Loading state — skeleton cards */}
        {loading && <SkeletonMatchGrid />}

        {/* Loaded state */}
        {!loading && (
          <>
            {/* Live matches section */}
            {liveMatches.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 pulse-red inline-block" />
                  <h2 className="text-text-primary font-bold text-lg">Live Now</h2>
                  <span className="text-text-secondary text-sm">({liveMatches.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveMatches.map((match) => (
                    <MatchCard key={match.match_id} match={match} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming matches section */}
            {upcomingMatches.length > 0 && (
              <div>
                <h2 className="text-text-primary font-bold text-lg mb-4">
                  Upcoming ({upcomingMatches.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingMatches.map((match) => (
                    <MatchCard key={match.match_id} match={match} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state — no matches */}
            {filteredMatches.length === 0 && !error && (
              <div className="criciq-card text-center py-12">
                <span className="text-5xl block mb-4">🏏</span>
                <p className="text-text-primary font-semibold mb-2">No matches found</p>
                <p className="text-text-secondary text-sm">
                  {filter ? `No ${filter} matches scheduled right now.` : 'No matches scheduled at the moment.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
