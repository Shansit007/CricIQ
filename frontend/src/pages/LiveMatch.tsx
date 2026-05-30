// ============================================
// LiveMatch.tsx — Real-time live match view
// Connects to WebSocket, shows gauge + timeline + commentary
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import WinGauge from '../components/WinGauge';
import BallTimeline from '../components/BallTimeline';
import CommentaryFeed from '../components/CommentaryFeed';
import MomentumChart from '../components/MomentumChart';
import { SkeletonGauge, SkeletonChart } from '../components/SkeletonLoader';
import { connectToMatch, disconnectFromMatch } from '../services/socket';
import type { BallEvent } from '../types/cricket';

export default function LiveMatch() {
  // Get match_id from URL: /live/:matchId
  const { matchId } = useParams<{ matchId: string }>();
  const navigate    = useNavigate();

  // All ball events received so far
  const [balls, setBalls] = useState<BallEvent[]>([]);

  // Current match state (latest ball's data)
  const [matchState, setMatchState] = useState<BallEvent | null>(null);

  // Whether we're syncing with real live score right now
  const [syncing, setSyncing] = useState(false);

  // Loading state — show skeletons until first event arrives
  const [loading, setLoading] = useState(true);

  // Connection status
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!matchId) return;

    // Connect to the match WebSocket
    const socket = connectToMatch(matchId);

    // ---- Listen for socket events ----

    // Server confirmed our connection
    socket.on('connect', () => {
      setConnected(true);
      setLoading(false);
    });

    // New ball event — the most important event
    socket.on('ball_event', (data: BallEvent) => {
      setBalls((prev) => [...prev, data]);   // add ball to our list
      setMatchState(data);                    // update current state
      setLoading(false);                      // hide skeletons
    });

    // Server is syncing with real CricAPI score
    socket.on('syncing', () => setSyncing(true));

    // Sync complete
    socket.on('sync_complete', () => setSyncing(false));

    // Server error
    socket.on('error', (err: { message: string }) => {
      console.error('[LiveMatch] Socket error:', err.message);
    });

    // Disconnect cleanup — runs when component unmounts (user leaves page)
    return () => {
      disconnectFromMatch(matchId!);
    };
  }, [matchId]);   // re-run if matchId changes

  // ---- Derived values from latest ball ----
  const winProb     = matchState?.win_probability ?? 0.5;
  const momentum    = matchState?.momentum ?? 0;
  const totalRuns   = matchState?.total_runs ?? 0;
  const wickets     = matchState?.wickets ?? 0;
  const currentOver = matchState ? `${matchState.over + 1}.${matchState.ball}` : '0.0';

  // Team names — ideally passed via route state, fallback to generic
  const battingTeam  = 'Team A';   // TODO: get from match data
  const bowlingTeam  = 'Team B';

  return (
    <div className="min-h-screen">
      <Navbar isLive={true} />

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ---- Top: Live Scoreboard ---- */}
        <div className="criciq-card mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Score */}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-text-secondary text-xs uppercase tracking-widest">Score</p>
                <p
                  className="font-display text-4xl text-accent-cyan"
                  style={{ fontFamily: "'Bebas Neue', cursive" }}
                >
                  {totalRuns}/{wickets}
                </p>
              </div>
              <div className="w-px h-10 bg-card-border" />
              <div>
                <p className="text-text-secondary text-xs">Overs</p>
                <p className="font-display text-2xl text-text-primary"
                   style={{ fontFamily: "'Bebas Neue', cursive" }}>
                  {currentOver}
                </p>
              </div>
            </div>

            {/* Teams */}
            <div className="text-right">
              <p className="text-text-primary font-bold">{battingTeam} <span className="text-text-secondary">vs</span> {bowlingTeam}</p>
              <p className="text-text-secondary text-xs">{matchId}</p>
            </div>

            {/* Syncing indicator */}
            {syncing && (
              <div className="flex items-center gap-2 bg-accent-gold/10 border border-accent-gold/30 rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-accent-gold pulse-cyan" />
                <span className="text-accent-gold text-xs font-medium">SYNCING WITH LIVE SCORE</span>
              </div>
            )}

            {/* Connection status */}
            <div className={`flex items-center gap-1.5 text-xs ${connected ? 'text-green-400' : 'text-accent-red'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 pulse-cyan' : 'bg-accent-red'}`} />
              {connected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
        </div>

        {/* ---- Middle: 3-column layout ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Left: Win Probability Gauge */}
          <div>
            {loading
              ? <SkeletonGauge />
              : <WinGauge
                  probability={winProb}
                  battingTeam={battingTeam}
                  bowlingTeam={bowlingTeam}
                  momentum={momentum}
                />
            }
          </div>

          {/* Center: Commentary Feed */}
          <div>
            <CommentaryFeed balls={balls} />
          </div>

          {/* Right: Quick stats */}
          <div className="space-y-4">
            {/* Last 3 balls */}
            <div className="criciq-card">
              <p className="text-text-secondary text-xs uppercase tracking-widest mb-3">Last 3 Balls</p>
              <div className="flex gap-2">
                {balls.slice(-3).map((ball, i) => (
                  <div
                    key={i}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                      ${ball.is_wicket ? 'bg-accent-red text-white' :
                        ball.runs_this_ball === 6 ? 'bg-accent-gold text-gray-900' :
                        ball.runs_this_ball === 4 ? 'bg-blue-500 text-white' :
                        ball.runs_this_ball > 0   ? 'bg-green-600 text-white' :
                        'bg-gray-700 text-gray-300'}
                    `}
                  >
                    {ball.is_wicket ? 'W' : ball.runs_this_ball === 0 ? '•' : ball.runs_this_ball}
                  </div>
                ))}
                {balls.length === 0 && <p className="text-text-secondary text-sm">Waiting...</p>}
              </div>
            </div>

            {/* Win probability percentage quick view */}
            <div className="criciq-card">
              <p className="text-text-secondary text-xs uppercase tracking-widest mb-2">Win Chance</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-primary">{battingTeam}</span>
                <span className="text-2xl font-display text-accent-cyan"
                      style={{ fontFamily: "'Bebas Neue', cursive" }}>
                  {Math.round(winProb * 100)}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-accent-cyan rounded-full transition-all duration-700"
                  style={{ width: `${Math.round(winProb * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---- Bottom: Ball Timeline + Momentum Chart ---- */}
        <div className="space-y-6">
          <BallTimeline balls={balls} />
          {loading ? <SkeletonChart /> : <MomentumChart balls={balls} battingTeam={battingTeam} />}
        </div>
      </div>
    </div>
  );
}
