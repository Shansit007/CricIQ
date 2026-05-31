// ============================================
// Admin.tsx — Admin Dashboard
// Password protected: shansit007
// Shows all users, game rooms, predictions stats
// ============================================

import { useState, useEffect } from 'react';
import { supabase, Profile, GameRoom, Prediction } from '../lib/supabase';
import Navbar from '../components/Navbar';

const ADMIN_PASSWORD = 'shansit007';   // admin password

export default function Admin() {
  const [authed,   setAuthed]   = useState(false);
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  // ---- Data ----
  const [profiles,     setProfiles]     = useState<Profile[]>([]);
  const [rooms,        setRooms]        = useState<GameRoom[]>([]);
  const [predictions,  setPredictions]  = useState<Prediction[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [activeTab,    setActiveTab]    = useState<'overview' | 'users' | 'rooms' | 'predictions'>('overview');

  // ---- Check if already authenticated (session storage) ----
  useEffect(() => {
    if (sessionStorage.getItem('criciq_admin') === 'true') {
      setAuthed(true);
      loadData();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      sessionStorage.setItem('criciq_admin', 'true');   // remember for this browser tab
      loadData();
    } else {
      setError('Wrong password!');
    }
  };

  const handleLogout = () => {
    setAuthed(false);
    sessionStorage.removeItem('criciq_admin');
  };

  // ---- Load all data from Supabase ----
  const loadData = async () => {
    setLoading(true);
    const [{ data: p }, { data: r }, { data: pr }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('game_rooms').select('*').order('created_at', { ascending: false }),
      supabase.from('predictions').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    if (p)  setProfiles(p as Profile[]);
    if (r)  setRooms(r as GameRoom[]);
    if (pr) setPredictions(pr as Prediction[]);
    setLoading(false);
  };

  // ============================================
  // PASSWORD GATE
  // ============================================
  if (!authed) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="w-full max-w-sm">
          <div className="criciq-card border border-accent-red/30">
            <div className="text-center mb-6">
              <p className="text-3xl mb-2">🛡️</p>
              <h1 className="text-2xl font-display text-accent-red"
                  style={{ fontFamily: "'Bebas Neue', cursive" }}>
                Admin Access
              </h1>
              <p className="text-text-secondary text-sm mt-1">CricIQ Admin Dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                autoFocus
              />
              {error && <p className="text-accent-red text-xs">⚠️ {error}</p>}
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-semibold bg-accent-red text-white hover:bg-accent-red/90 transition-all"
              >
                🔐 Enter
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // ADMIN DASHBOARD
  // ============================================
  const totalPredictions = predictions.length;
  const correctPreds     = predictions.filter(p => p.is_correct).length;
  const activeRooms      = rooms.filter(r => r.status === 'active').length;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-display text-accent-red"
                style={{ fontFamily: "'Bebas Neue', cursive" }}>
              🛡️ Admin Dashboard
            </h1>
            <p className="text-text-secondary text-sm">CricIQ — Full visibility</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadData}
              className="px-4 py-2 rounded-lg border border-card-border text-text-secondary hover:border-accent-cyan text-sm transition-all">
              🔄 Refresh
            </button>
            <button onClick={handleLogout}
              className="px-4 py-2 rounded-lg border border-accent-red text-accent-red text-sm hover:bg-accent-red/10 transition-all">
              Logout
            </button>
          </div>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Users',       value: profiles.length,    color: '#00D4FF' },
            { label: 'Game Rooms',         value: rooms.length,       color: '#F4A703' },
            { label: 'Active Rooms',       value: activeRooms,        color: '#22C55E' },
            { label: 'Total Predictions',  value: totalPredictions,   color: '#FF4B4B' },
          ].map(({ label, value, color }) => (
            <div key={label} className="criciq-card text-center">
              <p className="text-3xl font-display font-bold" style={{ color, fontFamily: "'Bebas Neue', cursive" }}>
                {value}
              </p>
              <p className="text-text-secondary text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['overview', 'users', 'rooms', 'predictions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? 'bg-accent-cyan text-bg-primary'
                  : 'border border-card-border text-text-secondary hover:border-accent-cyan'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="criciq-card text-center py-10">
            <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* ---- Overview ---- */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="criciq-card">
                  <p className="text-text-secondary text-xs uppercase tracking-widest mb-3">Prediction Accuracy</p>
                  <p className="text-4xl font-display text-accent-cyan" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                    {totalPredictions > 0 ? Math.round((correctPreds / totalPredictions) * 100) : 0}%
                  </p>
                  <p className="text-text-secondary text-sm">{correctPreds} correct out of {totalPredictions}</p>
                </div>
                <div className="criciq-card">
                  <p className="text-text-secondary text-xs uppercase tracking-widest mb-3">Most Active User</p>
                  {profiles.length > 0 ? (
                    <>
                      <p className="text-2xl font-bold text-text-primary">{profiles[0]?.username}</p>
                      <p className="text-text-secondary text-sm">{profiles[0]?.total_predictions} predictions</p>
                    </>
                  ) : <p className="text-text-secondary text-sm">No users yet</p>}
                </div>
              </div>
            )}

            {/* ---- Users ---- */}
            {activeTab === 'users' && (
              <div className="criciq-card">
                <p className="text-text-secondary text-xs uppercase tracking-widest mb-4">All Users ({profiles.length})</p>
                <div className="space-y-2">
                  {profiles.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary">
                      <div>
                        <p className="text-text-primary font-semibold text-sm">{p.username}</p>
                        <p className="text-text-secondary text-xs">{new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right text-xs text-text-secondary">
                        <p>{p.total_predictions} preds • {p.rooms_won} wins</p>
                      </div>
                    </div>
                  ))}
                  {profiles.length === 0 && <p className="text-text-secondary text-sm text-center py-4">No users yet</p>}
                </div>
              </div>
            )}

            {/* ---- Rooms ---- */}
            {activeTab === 'rooms' && (
              <div className="criciq-card">
                <p className="text-text-secondary text-xs uppercase tracking-widest mb-4">All Game Rooms ({rooms.length})</p>
                <div className="space-y-2">
                  {rooms.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary">
                      <div>
                        <p className="text-accent-cyan font-mono font-bold text-sm">{r.code}</p>
                        <p className="text-text-secondary text-xs">{r.match_info}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        r.status === 'active'   ? 'bg-green-500/20 text-green-400' :
                        r.status === 'finished' ? 'bg-gray-500/20 text-gray-400'  :
                        'bg-accent-gold/20 text-accent-gold'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                  {rooms.length === 0 && <p className="text-text-secondary text-sm text-center py-4">No rooms yet</p>}
                </div>
              </div>
            )}

            {/* ---- Predictions ---- */}
            {activeTab === 'predictions' && (
              <div className="criciq-card">
                <p className="text-text-secondary text-xs uppercase tracking-widest mb-4">Recent Predictions (last 100)</p>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {predictions.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded bg-bg-secondary text-xs">
                      <span className="text-text-secondary w-24 truncate">{p.username}</span>
                      <span className="text-text-primary capitalize">{p.prediction_type}: {p.prediction_value}</span>
                      <span className={p.is_correct ? 'text-green-400' : 'text-accent-red'}>
                        {p.is_correct ? `+${p.points}` : '✗'}
                      </span>
                    </div>
                  ))}
                  {predictions.length === 0 && <p className="text-text-secondary text-sm text-center py-4">No predictions yet</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
