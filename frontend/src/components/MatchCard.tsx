// ============================================
// MatchCard.tsx — Card shown on the Matches page
// Click to go to Live Match or Prediction Simulator
// ============================================

import { useNavigate } from 'react-router-dom';
import type { Match } from '../types/cricket';

interface MatchCardProps {
  match: Match;
}

export default function MatchCard({ match }: MatchCardProps) {
  const navigate = useNavigate();  // lets us navigate to other pages

  // Format the date string nicely
  // e.g. "2025-06-15T14:30:00" → "Jun 15, 2025 • 2:30 PM IST"
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',  // IST
      }) + ' IST';
    } catch {
      return dateStr;  // fallback: show raw string
    }
  };

  // Handle card click — live match goes to /live, upcoming goes to /predict
  const handleClick = () => {
    if (match.status === 'live') {
      navigate(`/live/${match.match_id}`);
    } else {
      navigate(`/predict?team1=${encodeURIComponent(match.team1)}&team2=${encodeURIComponent(match.team2)}&format=${match.format}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="
        criciq-card cursor-pointer group
        hover:border-accent-cyan/40 hover:-translate-y-1
        transition-all duration-200
      "
    >
      {/* Top row: Format badge + Status */}
      <div className="flex items-center justify-between mb-3">
        {/* Format badge */}
        <span className={`format-badge format-${match.format.toLowerCase()}`}>
          {match.format}
        </span>

        {/* Live indicator OR date */}
        {match.status === 'live' ? (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 pulse-red inline-block" />
            <span className="text-xs font-bold text-red-400 tracking-wider">LIVE</span>
          </div>
        ) : (
          <span className="text-xs text-text-secondary">{formatDate(match.date)}</span>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-3">
        {/* Team 1 */}
        <div className="text-center flex-1">
          <div className="text-2xl mb-1">🏏</div>
          <p className="text-text-primary font-bold text-sm leading-tight">{match.team1}</p>
          {/* Show live score for team 1 if available */}
          {match.status === 'live' && match.live_score?.batting_team === match.team1 && (
            <p className="text-accent-cyan font-display text-lg mt-1"
               style={{ fontFamily: "'Bebas Neue', cursive" }}>
              {match.live_score.current_score}/{match.live_score.wickets}
            </p>
          )}
        </div>

        {/* VS divider */}
        <div className="flex flex-col items-center px-3">
          <span className="text-text-secondary font-bold text-sm">VS</span>
          {match.status === 'live' && match.live_score && (
            <span className="text-xs text-text-secondary mt-1">
              {match.live_score.overs} ov
            </span>
          )}
        </div>

        {/* Team 2 */}
        <div className="text-center flex-1">
          <div className="text-2xl mb-1">🎯</div>
          <p className="text-text-primary font-bold text-sm leading-tight">{match.team2}</p>
          {match.status === 'live' && match.live_score?.batting_team === match.team2 && (
            <p className="text-accent-cyan font-display text-lg mt-1"
               style={{ fontFamily: "'Bebas Neue', cursive" }}>
              {match.live_score.current_score}/{match.live_score.wickets}
            </p>
          )}
        </div>
      </div>

      {/* Venue */}
      <p className="text-text-secondary text-xs text-center truncate">
        📍 {match.venue}
      </p>

      {/* CTA hint at bottom */}
      <div className="mt-3 pt-3 border-t border-card-border text-center">
        <span className="text-xs text-accent-cyan group-hover:text-accent-gold transition-colors">
          {match.status === 'live' ? 'Watch Live →' : 'Predict Outcome →'}
        </span>
      </div>
    </div>
  );
}
