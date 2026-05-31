// ============================================
// AuthContext.tsx — Global auth state
// Wrap the whole app in this so every page
// can access the current logged-in user
// ============================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

// ---- Shape of what we expose ----
interface AuthContextType {
  user:        User | null;       // Supabase auth user
  profile:     Profile | null;    // our profiles table row
  session:     Session | null;    // auth session token
  loading:     boolean;           // true while checking auth on first load
  signOut:     () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Create the context with a default empty value
const AuthContext = createContext<AuthContextType>({
  user:    null,
  profile: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

// ---- Provider wraps the whole app ----
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- Fetch profile from DB ----
  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  // ---- Listen for auth changes ----
  // This fires on: login, logout, page refresh, token expiry
  useEffect(() => {
    // Get initial session (user already logged in from a previous visit)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Subscribe to future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---- Hook: use this in any component ----
// Example: const { user, profile } = useAuth();
export const useAuth = () => useContext(AuthContext);
