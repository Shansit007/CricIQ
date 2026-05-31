// ============================================
// Dashboard.tsx — Personal user dashboard
// Shows stats, prediction history, profile
// ============================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, Prediction } from '../lib/supabase';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loadingPreds, setLoadingPreds] = useState(true);

  // Redirect to login if not logged in
  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading]);

  // Fetch this user's predictions
  useEffect(() => {
    if (!user) return;
    supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setPredictions(data as Prediction[]);
        setLoadingPreds(false);
      });
  }, [user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return null;

  // Calculate win rate
  const winRate = profile.total_predictions > 0
    ? Math.round((profile.correct_predictions / profile.total_predictions) * 100)
    : 0;

  // Avatar initials fallback
  const initials = profile.username?.slice(0, 2).toUpperCase() || 'CQ';

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* ---- Profile Header ---- */}
        <div className="criciq-card mb-6 flex items-center gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-accent-cyan/20 border-2 border-accent-cyan flex items-center justify-center text-xl font-bold text-accent-cyan flex-shrink-0">
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" />
              : initials}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-display text-text-primary font-bold"
                style={{ fontFamily: "'Bebas Neue', cursive" }}>
              {profile.username}
            </h1>
            <p className="text-text-secondary text-sm">{user?.email}</p>
            <p className="text-text-secondary text-xs mt-1">
              Joined {new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Sign out */}
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            className="px-4 py-2 rounded-lg border border-card-border text-text-secondary hover:border-accent-red hover:text-accent-red transition-all text-sm"
          >
            Sign Out
          </button>
        </div>

        {/* ---- Stats Grid ---- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Predictions',  value: profile.total_predictions,   color: '#00D4FF' },
            { label: 'Correct',      value: profile.correct_predictions,  color: '#22C55E' },
            { label: 'Win Rate',     value: `${winRate}%`,                color: '#F4A703' },
            { label: 'Rooms Won',    value: profile.rooms_won,            color: '#FF4B4B' },
          ].map(({ label, value, color }) => (
            <div key={label} className="criciq-card text-center">
              <p className="text-2xl font-display font-bold" style={{ color, fontFamily: "'Bebas Neue', cursive" }}>
                {value}
              </p>
              <p className="text-text-secondary text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ---- Quick Actions ---- */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => navigate('/game')}
            className="criciq-card text-left hover:border-accent-cyan/50 transition-all cursor-pointer"
          >
            <p className="text-2xl mb-2">🎮</p>
            <p className="text-text-primary font-semibold text-sm">Play with Friends</p>
            <p className="text-text-secondary text-xs mt-1">Create or join a game room</p>
          </button>
          <button
            onClick={() => navigate('/predict')}
            className="criciq-card text-left hover:border-accent-gold/50 transition-all cursor-pointer"
          >
            <p className="text-2xl mb-2">📊</p>
            <p className="text-text-primary font-semibold text-sm">Predict a Match</p>
            <p className="text-text-secondary text-xs mt-1">Test the AI win predictor</p>
          </button>
        </div>

        {/* ---- Recent Predictions ---- */}
        <div className="criciq-card">
          <p className="text-text-secondary text-xs uppercase tracking-widest mb-4">Recent Predictions</p>

          {loadingPreds ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 rounded-lg bg-bg-secondary animate-pulse" />
              ))}
            </div>
          ) : predictions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">🏏</p>
              <p className="text-text-secondary text-sm">No predictions yet</p>
              <button
                onClick={() => navigate('/game')}
                className="mt-3 px-4 py-2 rounded-lg bg-accent-cyan text-bg-primary text-sm font-semibold"
              >
                Join a Game Room
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {predictions.map(pred => (
                <div key={pred.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary">
                  <div>
                    <p className="text-text-primary text-sm font-medium capitalize">
                      {pred.prediction_type}: <span className="text-accent-cyan">{pred.prediction_value}</span>
                    </p>
                    <p className="text-text-secondary text-xs">
                      {new Date(pred.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${pred.is_correct ? 'text-green-400' : 'text-accent-red'}`}>
                      {pred.is_correct ? `+${pred.points} pts` : '0 pts'}
                    </p>
                    <p className="text-xs">{pred.is_correct ? '✅ Correct' : '❌ Wrong'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
