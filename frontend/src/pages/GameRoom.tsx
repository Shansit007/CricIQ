// ============================================
// GameRoom.tsx — Friend Prediction Game Room
// Create a room → share 6-digit code → friends join
// Everyone predicts → live leaderboard → Cricket Brain crowned
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, GameRoom as GameRoomType, Prediction } from '../lib/supabase';
import Navbar from '../components/Navbar';

// ---- Leaderboard entry ----
interface LeaderboardEntry {
  username:  string;
  points:    number;
  correct:   number;
  total:     number;
}

export default function GameRoom() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // ---- Lobby state ----
  const [view,       setView]       = useState<'lobby' | 'room'>('lobby');
  const [joinCode,   setJoinCode]   = useState('');
  const [matchInfo,  setMatchInfo]  = useState('CSK vs MI — IPL 2025');
  const [room,       setRoom]       = useState<GameRoomType | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  // ---- In-room state ----
  const [predictions,  setPredictions]  = useState<Prediction[]>([]);
  const [leaderboard,  setLeaderboard]  = useState<LeaderboardEntry[]>([]);
  const [predType,     setPredType]     = useState('wicket');
  const [predValue,    setPredValue]    = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);  // prevent double submit

  // Redirect to login if not logged in
  useEffect(() => {
    if (!user) navigate('/login');
  }, [user]);

  // ---- Subscribe to realtime predictions when in a room ----
  useEffect(() => {
    if (!room) return;

    // Load existing predictions
    loadPredictions(room.id);

    // Subscribe to new predictions in realtime
    const channel = supabase
      .channel(`room-${room.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'predictions',
        filter: `room_id=eq.${room.id}`,
      }, () => {
        loadPredictions(room.id);   // refresh whenever anything changes
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room]);

  // ---- Load all predictions for a room ----
  const loadPredictions = async (roomId: string) => {
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (data) {
      setPredictions(data as Prediction[]);
      buildLeaderboard(data as Prediction[]);
    }
  };

  // ---- Build leaderboard from predictions ----
  const buildLeaderboard = (preds: Prediction[]) => {
    const map: Record<string, LeaderboardEntry> = {};
    for (const p of preds) {
      if (!map[p.username]) map[p.username] = { username: p.username, points: 0, correct: 0, total: 0 };
      map[p.username].total++;
      map[p.username].points += p.points;
      if (p.is_correct) map[p.username].correct++;
    }
    setLeaderboard(Object.values(map).sort((a, b) => b.points - a.points));
  };

  // ---- Generate a random 6-digit room code ----
  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  // ---- Create a new room ----
  const createRoom = async () => {
    if (!user || !profile) return;
    setLoading(true);
    setError('');

    const code = generateCode();
    const { data, error } = await supabase
      .from('game_rooms')
      .insert({ code, host_id: profile.id, match_info: matchInfo, status: 'active' })
      .select()
      .single();

    if (error) { setError(error.message); setLoading(false); return; }
    setRoom(data as GameRoomType);
    setView('room');
    setLoading(false);
  };

  // ---- Join existing room by code ----
  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('code', joinCode.toUpperCase())
      .single();

    if (error || !data) {
      setError('Room not found! Check the code and try again.');
      setLoading(false);
      return;
    }
    setRoom(data as GameRoomType);
    setView('room');
    setLoading(false);
  };

  // ---- Submit a prediction ----
  const submitPrediction = async () => {
    if (!user || !profile || !room || !predValue.trim()) return;
    setSubmitting(true);

    // Simulate scoring: 30% chance of being correct (in real app, check against live score)
    const is_correct = Math.random() < 0.30;
    const points = is_correct ? (predType === 'wicket' ? 10 : predType === 'boundary' ? 5 : 15) : 0;

    const { error } = await supabase.from('predictions').insert({
      room_id:          room.id,
      user_id:          user.id,
      username:         profile.username,
      prediction_type:  predType,
      prediction_value: predValue,
      is_correct,
      points,
    });

    if (!error) {
      setSubmitted(true);
      setPredValue('');
      setTimeout(() => setSubmitted(false), 3000);  // reset after 3s
    }
    setSubmitting(false);
  };

  // ---- Crown the Cricket Brain (highest points) ----
  const cricketBrain = leaderboard[0] || null;

  // ============================================
  // RENDER: Lobby (create / join)
  // ============================================
  if (view === 'lobby') return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-10">

        <div className="text-center mb-10">
          <h1 className="text-5xl font-display gradient-text mb-2"
              style={{ fontFamily: "'Bebas Neue', cursive" }}>
            Friend Game Room
          </h1>
          <p className="text-text-secondary">Play cricket predictions with your WhatsApp group 🏏</p>
        </div>

        {/* Create room */}
        <div className="criciq-card mb-4">
          <p className="text-text-secondary text-xs uppercase tracking-widest mb-3">Create a Room</p>
          <div className="mb-3">
            <label className="text-xs text-text-secondary block mb-1">Match</label>
            <input
              value={matchInfo}
              onChange={e => setMatchInfo(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm"
              placeholder="CSK vs MI — IPL 2025"
            />
          </div>
          <button
            onClick={createRoom}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-accent-cyan text-bg-primary hover:bg-accent-cyan/90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Creating...' : '🚀 Create Room'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-card-border" />
          <span className="text-text-secondary text-xs">or join existing</span>
          <div className="flex-1 h-px bg-card-border" />
        </div>

        {/* Join room */}
        <div className="criciq-card">
          <p className="text-text-secondary text-xs uppercase tracking-widest mb-3">Join a Room</p>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1 rounded-lg px-3 py-2.5 text-sm tracking-widest font-mono"
              placeholder="ENTER CODE"
              maxLength={6}
            />
            <button
              onClick={joinRoom}
              disabled={loading || !joinCode}
              className="px-6 py-2.5 rounded-xl font-semibold border border-accent-gold text-accent-gold hover:bg-accent-gold/10 disabled:opacity-50 transition-all"
            >
              Join
            </button>
          </div>
          {error && <p className="text-accent-red text-xs mt-2">⚠️ {error}</p>}
        </div>

      </div>
    </div>
  );

  // ============================================
  // RENDER: Inside a room
  // ============================================
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Room header */}
        <div className="criciq-card mb-4 flex items-center justify-between">
          <div>
            <p className="text-text-secondary text-xs uppercase tracking-widest">Room Code</p>
            <p className="text-3xl font-mono font-bold text-accent-cyan tracking-widest">{room?.code}</p>
            <p className="text-text-secondary text-sm mt-1">📍 {room?.match_info}</p>
          </div>
          <div className="text-right">
            {/* Share button copies code to clipboard */}
            <button
              onClick={() => navigator.clipboard.writeText(room?.code || '')}
              className="px-4 py-2 rounded-lg border border-card-border text-text-secondary hover:border-accent-cyan hover:text-accent-cyan transition-all text-sm"
            >
              📋 Copy Code
            </button>
            <p className="text-text-secondary text-xs mt-1">Share with friends</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ---- Left: Make Prediction ---- */}
          <div className="criciq-card">
            <p className="text-text-secondary text-xs uppercase tracking-widest mb-4">Your Prediction</p>

            {/* Prediction type tabs */}
            <div className="flex gap-2 mb-3">
              {[
                { type: 'wicket',   label: '🎯 Wicket',   pts: '10 pts' },
                { type: 'boundary', label: '💥 Boundary',  pts: '5 pts'  },
                { type: 'score',    label: '📊 Score',     pts: '15 pts' },
              ].map(({ type, label, pts }) => (
                <button
                  key={type}
                  onClick={() => setPredType(type)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    predType === type
                      ? 'bg-accent-cyan text-bg-primary'
                      : 'border border-card-border text-text-secondary hover:border-accent-cyan'
                  }`}
                >
                  {label}<br /><span className="opacity-70">{pts}</span>
                </button>
              ))}
            </div>

            {/* Prediction input */}
            <input
              value={predValue}
              onChange={e => setPredValue(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm mb-3"
              placeholder={
                predType === 'wicket'   ? 'Who gets out? (e.g. Rohit)' :
                predType === 'boundary' ? 'Next boundary by? (e.g. Dhoni)' :
                'Final score? (e.g. 185)'
              }
            />

            <button
              onClick={submitPrediction}
              disabled={submitting || !predValue.trim() || submitted}
              className="w-full py-2.5 rounded-xl font-semibold bg-accent-cyan text-bg-primary hover:bg-accent-cyan/90 disabled:opacity-50 transition-all text-sm"
            >
              {submitted ? '✅ Submitted!' : submitting ? 'Submitting...' : '⚡ Submit Prediction'}
            </button>

            {/* My predictions */}
            <div className="mt-4 space-y-1">
              <p className="text-text-secondary text-xs mb-2">My Predictions</p>
              {predictions.filter(p => p.user_id === user?.id).slice(-5).map(p => (
                <div key={p.id} className="flex justify-between text-xs p-2 rounded bg-bg-secondary">
                  <span className="text-text-secondary capitalize">{p.prediction_type}: <span className="text-text-primary">{p.prediction_value}</span></span>
                  <span className={p.is_correct ? 'text-green-400' : 'text-accent-red'}>
                    {p.is_correct ? `+${p.points}` : '0'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ---- Right: Live Leaderboard ---- */}
          <div className="criciq-card">
            <p className="text-text-secondary text-xs uppercase tracking-widest mb-4">
              🏆 Live Leaderboard
            </p>

            {leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">⏳</p>
                <p className="text-text-secondary text-sm">Waiting for predictions...</p>
                <p className="text-text-secondary text-xs mt-1">Share the code with friends!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.username}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      i === 0 ? 'bg-accent-gold/10 border border-accent-gold/30' : 'bg-bg-secondary'
                    }`}
                  >
                    {/* Rank */}
                    <span className="text-lg w-6 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>

                    {/* Name + stats */}
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${i === 0 ? 'text-accent-gold' : 'text-text-primary'}`}>
                        {entry.username}
                        {entry.username === profile?.username && ' (you)'}
                      </p>
                      <p className="text-xs text-text-secondary">{entry.correct}/{entry.total} correct</p>
                    </div>

                    {/* Points */}
                    <p className={`text-lg font-display font-bold ${i === 0 ? 'text-accent-gold' : 'text-accent-cyan'}`}
                       style={{ fontFamily: "'Bebas Neue', cursive" }}>
                      {entry.points}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Cricket Brain badge */}
            {cricketBrain && cricketBrain.points > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-accent-gold/10 border border-accent-gold/30 text-center">
                <p className="text-xs text-text-secondary mb-1">🧠 Cricket Brain</p>
                <p className="text-accent-gold font-bold">{cricketBrain.username}</p>
                <p className="text-text-secondary text-xs">{cricketBrain.points} points</p>
              </div>
            )}
          </div>
        </div>

        {/* Leave room */}
        <button
          onClick={() => { setRoom(null); setView('lobby'); }}
          className="w-full mt-4 py-3 rounded-xl border border-card-border text-text-secondary hover:border-accent-red hover:text-accent-red transition-all"
        >
          ← Leave Room
        </button>

      </div>
    </div>
  );
}
