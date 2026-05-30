// ============================================
// api.ts — All REST API calls in one place
// Import functions from here in any component
// ============================================

// The backend URL — reads from .env file
// In development: http://localhost:8000
// In production: your Render URL
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ---- Helper: generic fetch with error handling ----
// Every API call goes through this so errors are handled consistently
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },  // always send JSON
    ...options,
  });

  // If server returned an error, throw it so components can show an error state
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;  // parse and return JSON
}

// ---- Matches API ----

// Fetch list of upcoming + live matches across all formats
export const getUpcomingMatches = () =>
  apiFetch<any[]>('/api/matches/upcoming');

// Fetch live state of a specific match (score + win probability)
export const getLiveMatch = (matchId: string) =>
  apiFetch<any>(`/api/matches/live/${matchId}`);

// ---- Win Probability / Prediction API ----

// Send match state to ML model, get win probability back
export const predictWinProbability = (data: object) =>
  apiFetch<any>('/api/predict', {
    method: 'POST',
    body: JSON.stringify(data),     // convert JS object → JSON string
  });

// ---- Commentary API ----

// Get one AI commentary line from Groq
export const getCommentary = (data: object) =>
  apiFetch<{ commentary: string; is_ai: boolean }>('/api/commentary', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ---- Rivalry API ----

// Get head-to-head rivalry stats between two teams
export const getRivalryStats = (team1: string, team2: string, format: string) =>
  apiFetch<any>(`/api/rivalry?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}&format=${format}`);

// ---- Fantasy API ----

// Get optimized Fantasy XI for a match
export const getFantasyXI = (team1: string, team2: string, format: string, budget: number) =>
  apiFetch<any>('/api/fantasy/optimize', {
    method: 'POST',
    body: JSON.stringify({ team1, team2, format, budget }),
  });
