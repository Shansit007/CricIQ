// ============================================
// DeltaBriefing.tsx — "Explain Like I Was Studying" mode
// User sets a timer. When they return, they see ONLY
// what changed — 4 lines. Saves study time.
// ============================================

import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';

// ---- Types ----
interface DeltaResult {
  minutes_away: number;
  events: { type: string; summary: string; impact: string }[];
  four_line_brief: string[];
  current_state: {
    score: string;
    overs: string;
    vs: string;
    format: string;
  };
}

export default function DeltaBriefing() {
  // ---- State ----
  const [timerMinutes, setTimerMinutes]   = useState(30);   // how long to study
  const [isRunning, setIsRunning]         = useState(false); // timer counting down
  const [secondsLeft, setSecondsLeft]     = useState(0);     // countdown display
  const [checkInTime, setCheckInTime]     = useState('');    // ISO when timer started
  const [result, setResult]               = useState<DeltaResult | null>(null);
  const [loading, setLoading]             = useState(false);
  const [battingTeam, setBattingTeam]     = useState('CSK');
  const [bowlingTeam, setBowlingTeam]     = useState('MI');

  // ref keeps interval ID so we can clear it on stop/unmount
  const intervalRef = useRef<number | null>(null);

  // ---- Countdown logic ----
  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      // tick every second
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            // Timer done — automatically fetch delta
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            fetchDelta(checkInTime, battingTeam, bowlingTeam);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    // Cleanup: clear interval when component unmounts or isRunning changes
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);   // re-run effect only when isRunning changes

  // ---- Start timer ----
  const startTimer = () => {
    const now = new Date().toISOString();  // record exactly when user started studying
    setCheckInTime(now);
    setSecondsLeft(timerMinutes * 60);    // convert minutes to seconds
    setResult(null);                       // clear previous result
    setIsRunning(true);
  };

  // ---- Stop timer manually ----
  const stopAndBrief = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    fetchDelta(checkInTime, battingTeam, bowlingTeam);  // get brief immediately
  };

  // ---- Fetch delta from backend ----
  const fetchDelta = async (lastChecked: string, bat: string, bowl: string) => {
    setLoading(true);
    try {
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE}/api/delta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id:     'mock_match_1',
          last_checked: lastChecked,
          batting_team: bat,
          bowling_team: bowl,
          format:       'T20',
        }),
      });
      const data: DeltaResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Delta fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Format seconds as MM:SS ----
  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ---- Impact color ----
  const impactColor = (impact: string) => {
    if (impact === 'high')   return 'border-accent-red text-accent-red';
    if (impact === 'medium') return 'border-accent-gold text-accent-gold';
    return 'border-accent-cyan text-accent-cyan';
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ---- Header ---- */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-display gradient-text mb-2"
              style={{ fontFamily: "'Bebas Neue', cursive" }}>
            Study Mode
          </h1>
          <p className="text-text-secondary text-base">
            Set a timer. Study. Come back. Get <span className="text-accent-cyan font-semibold">only what changed</span> in 4 lines.
          </p>
        </div>

        {/* ---- Team selector ---- */}
        <div className="criciq-card mb-6">
          <p className="text-text-secondary text-xs uppercase tracking-widest mb-3">Match</p>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="text-xs text-text-secondary mb-1 block">Batting Team</label>
              <input
                value={battingTeam}
                onChange={e => setBattingTeam(e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan"
                placeholder="CSK"
              />
            </div>
            <span className="text-text-secondary mt-4">vs</span>
            <div className="flex-1">
              <label className="text-xs text-text-secondary mb-1 block">Bowling Team</label>
              <input
                value={bowlingTeam}
                onChange={e => setBowlingTeam(e.target.value)}
                className="w-full bg-bg-secondary border border-card-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-cyan"
                placeholder="MI"
              />
            </div>
          </div>
        </div>

        {/* ---- Timer card ---- */}
        <div className="criciq-card mb-6">
          <p className="text-text-secondary text-xs uppercase tracking-widest mb-4">Study Timer</p>

          {/* Slider to pick minutes */}
          {!isRunning && !result && (
            <div className="mb-6">
              <div className="flex justify-between text-xs text-text-secondary mb-2">
                <span>Study for</span>
                <span className="text-accent-cyan font-bold text-lg">{timerMinutes} min</span>
              </div>
              <input
                type="range"
                min={5}
                max={90}
                step={5}
                value={timerMinutes}
                onChange={e => setTimerMinutes(Number(e.target.value))}
                className="w-full accent-cyan-400"
                style={{ accentColor: '#00D4FF' }}
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>5 min</span>
                <span>90 min</span>
              </div>
            </div>
          )}

          {/* Countdown display */}
          {isRunning && (
            <div className="text-center py-6">
              <p className="text-8xl font-display text-accent-cyan"
                 style={{ fontFamily: "'Bebas Neue', cursive" }}>
                {formatTime(secondsLeft)}
              </p>
              <p className="text-text-secondary text-sm mt-2">Study hard 📚 CricIQ is watching the match for you</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {!isRunning ? (
              <button
                onClick={startTimer}
                className="flex-1 py-3 rounded-xl font-semibold bg-accent-cyan text-bg-primary hover:bg-accent-cyan/90 transition-all"
              >
                🚀 Start Study Timer
              </button>
            ) : (
              <button
                onClick={stopAndBrief}
                className="flex-1 py-3 rounded-xl font-semibold border border-accent-gold text-accent-gold hover:bg-accent-gold/10 transition-all"
              >
                📋 I'm Back — Brief Me Now
              </button>
            )}
          </div>
        </div>

        {/* ---- Loading spinner ---- */}
        {loading && (
          <div className="criciq-card text-center py-10">
            <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Generating your delta brief...</p>
          </div>
        )}

        {/* ---- Results ---- */}
        {result && !loading && (
          <div className="space-y-4">

            {/* Current state pill */}
            <div className="criciq-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-widest mb-1">Current Score</p>
                  <p className="text-2xl font-display text-accent-cyan"
                     style={{ fontFamily: "'Bebas Neue', cursive" }}>
                    {result.current_state.score}
                  </p>
                  <p className="text-text-secondary text-sm">{result.current_state.overs} • vs {result.current_state.vs}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary mb-1">You were away</p>
                  <p className="text-3xl font-display text-accent-gold"
                     style={{ fontFamily: "'Bebas Neue', cursive" }}>
                    {result.minutes_away}m
                  </p>
                </div>
              </div>
            </div>

            {/* 4-line brief — the main feature */}
            <div className="criciq-card">
              <p className="text-text-secondary text-xs uppercase tracking-widest mb-4">Your 4-Line Brief</p>
              <div className="space-y-3">
                {result.four_line_brief.map((line, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary border border-card-border"
                  >
                    {/* Line number */}
                    <span className="text-accent-cyan font-bold text-sm w-5 shrink-0">{i + 1}</span>
                    <p className="text-text-primary text-sm leading-relaxed">{line}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Event details (expandable) */}
            <div className="criciq-card">
              <p className="text-text-secondary text-xs uppercase tracking-widest mb-4">What Happened</p>
              <div className="space-y-2">
                {result.events.map((event, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${impactColor(event.impact)} bg-bg-secondary`}
                  >
                    <span className="text-xs uppercase font-bold opacity-70 w-16 shrink-0">{event.type}</span>
                    <p className="text-text-primary text-sm">{event.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Study again button */}
            <button
              onClick={() => { setResult(null); setCheckInTime(''); }}
              className="w-full py-3 rounded-xl border border-card-border text-text-secondary hover:border-accent-cyan hover:text-accent-cyan transition-all"
            >
              ↩ Study Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
