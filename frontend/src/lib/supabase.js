// ============================================
// supabase.js — Supabase client setup
// Used for Realtime broadcasts in the Prediction Game
//
// Supabase Realtime lets all players in the same
// room see score updates INSTANTLY — no page refresh.
//
// We use "Broadcast" mode — like a group chat channel.
// No database table needed!
// ============================================

// createClient builds our Supabase connection
import { createClient } from '@supabase/supabase-js'

// Read keys from .env file
// IMPORTANT: Vite requires env vars to start with VITE_
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create and export the Supabase client
// This is shared across the whole app
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// REALTIME CHANNEL HELPER
// Creates a Supabase Broadcast channel for a room.
// All players in room "MI7X4K" connect to channel "room-MI7X4K"
// When anyone sends a message, all others receive it instantly.
// ============================================
export const createGameChannel = (roomCode) => {
    return supabase.channel(`criciq-room-${roomCode}`, {
        config: {
            broadcast: {
                self: false   // don't receive your own broadcasts (avoid echo)
            }
        }
    })
}
