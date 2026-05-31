// ============================================
// supabase.ts — Supabase client singleton
// Import this wherever you need DB or Auth
// ============================================

import { createClient } from '@supabase/supabase-js';

// Supabase project credentials
// Reads from env var (VITE_SUPABASE_ANON_KEY in Vercel, hardcoded fallback for local)
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL      || 'https://nbtcsdczvaxnfedxkiji.supabase.co';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idGNzZGN6dmF4bmZlZHhraWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDA5MzIsImV4cCI6MjA5NTM3NjkzMn0.SQKMrkjBjR6k7fNQuaYEmfrGvtJTRvMg_uLa1chJJBw';

// Create one shared client — never create multiple clients
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ---- Types matching our DB tables ----
export interface Profile {
  id:                   string;
  username:             string;
  avatar_url:           string | null;
  total_predictions:    number;
  correct_predictions:  number;
  rooms_won:            number;
  created_at:           string;
}

export interface GameRoom {
  id:          string;
  code:        string;
  host_id:     string;
  match_info:  string;
  status:      'waiting' | 'active' | 'finished';
  winner_id:   string | null;
  created_at:  string;
}

export interface Prediction {
  id:               string;
  room_id:          string;
  user_id:          string;
  username:         string;
  prediction_type:  string;
  prediction_value: string;
  is_correct:       boolean;
  points:           number;
  created_at:       string;
}
