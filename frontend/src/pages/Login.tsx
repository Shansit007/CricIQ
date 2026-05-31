// ============================================
// Login.tsx — Login + Signup page
// Email/password + Google OAuth via Supabase
// ============================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';

export default function Login() {
  const navigate = useNavigate();

  // Toggle between login and signup mode
  const [mode,     setMode]     = useState<'login' | 'signup'>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');   // only for signup
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  // ---- Email + Password Login ----
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();   // prevent page reload on form submit
    setLoading(true);
    setError('');
    setSuccess('');

    if (mode === 'login') {
      // Sign in existing user
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        navigate('/dashboard');   // go to their personal dashboard
      }
    } else {
      // Sign up new user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: username },   // stored in raw_user_meta_data → triggers profile creation
        },
      });
      if (error) {
        setError(error.message);
      } else if (data.user) {
        setSuccess('Account created! Check your email to confirm, then log in.');
        setMode('login');
      }
    }
    setLoading(false);
  };

  // ---- Google OAuth ----
  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,  // after Google login, go here
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <div className="w-full max-w-md">

          {/* ---- Header ---- */}
          <div className="text-center mb-8">
            <p className="text-4xl mb-3">🏏</p>
            <h1 className="text-4xl font-display gradient-text mb-2"
                style={{ fontFamily: "'Bebas Neue', cursive" }}>
              {mode === 'login' ? 'Welcome Back' : 'Join CricIQ'}
            </h1>
            <p className="text-text-secondary text-sm">
              {mode === 'login'
                ? 'Log in to track your predictions and play with friends'
                : 'Create an account to save your stats and join game rooms'}
            </p>
          </div>

          {/* ---- Card ---- */}
          <div className="criciq-card">

            {/* Google button */}
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-card-border text-text-primary hover:border-accent-cyan hover:bg-accent-cyan/5 transition-all mb-4"
            >
              {/* Google SVG icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-card-border" />
              <span className="text-text-secondary text-xs">or</span>
              <div className="flex-1 h-px bg-card-border" />
            </div>

            {/* Email + Password form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">

              {/* Username — only on signup */}
              {mode === 'signup' && (
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="CricketFan007"
                    required
                    className="w-full rounded-lg px-3 py-2.5 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-text-secondary block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-text-secondary block mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                />
              </div>

              {/* Error message */}
              {error && (
                <p className="text-accent-red text-sm bg-accent-red/10 rounded-lg px-3 py-2">
                  ⚠️ {error}
                </p>
              )}

              {/* Success message */}
              {success && (
                <p className="text-green-400 text-sm bg-green-400/10 rounded-lg px-3 py-2">
                  ✅ {success}
                </p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold bg-accent-cyan text-bg-primary hover:bg-accent-cyan/90 disabled:opacity-50 transition-all"
              >
                {loading ? 'Loading...' : mode === 'login' ? '🔑 Log In' : '🚀 Create Account'}
              </button>
            </form>

            {/* Toggle mode */}
            <p className="text-center text-text-secondary text-sm mt-4">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                className="text-accent-cyan hover:underline font-semibold"
              >
                {mode === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
