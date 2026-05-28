// ============================================
// PostMatchDebrief.jsx — Feature 7: Post-Match 60-Second Debrief
//
// "Match ended while you were studying?
//  Open app, get a 60-second read."
//
// 2 screens:
//   1. Match picker — select which match to debrief
//   2. Debrief card — 6 sections loaded from Groq AI
//
// Design: dark card UI, section-by-section reveal
// ============================================

// useState tracks which screen we're on + data
// useEffect runs code when component loads
import { useState } from 'react'

// axios makes HTTP requests to our FastAPI backend
import axios from 'axios'

// ============================================
// CONFIG: Backend API base URL
// Reads from .env file (VITE_API_URL)
// ============================================
const API_URL = import.meta.env.VITE_API_URL || 'https://criciq-backend-8aoj.onrender.com'

// ============================================
// CONFIG: Visual styles for each debrief section
// Maps section key → icon + label + color theme
// ============================================
const SECTION_CONFIG = {
  headline: {
    icon: '🏆',
    label: 'Match Result',
    bg: 'bg-yellow-900/30',
    border: 'border-yellow-500/40',
    textColor: 'text-yellow-300',
    labelColor: 'text-yellow-400'
  },
  result_summary: {
    icon: '📊',
    label: 'How It Went',
    bg: 'bg-blue-900/30',
    border: 'border-blue-500/40',
    textColor: 'text-blue-100',
    labelColor: 'text-blue-400'
  },
  key_performer_story: {
    icon: '⭐',
    label: 'Player of the Match',
    bg: 'bg-purple-900/30',
    border: 'border-purple-500/40',
    textColor: 'text-purple-100',
    labelColor: 'text-purple-400'
  },
  turning_point_story: {
    icon: '♟️',
    label: 'The Turning Point',
    bg: 'bg-red-900/30',
    border: 'border-red-500/40',
    textColor: 'text-red-100',
    labelColor: 'text-red-400'
  },
  pressure_score_accuracy: {
    icon: '🔥',
    label: 'CricIQ Called It',
    bg: 'bg-orange-900/30',
    border: 'border-orange-500/40',
    textColor: 'text-orange-100',
    labelColor: 'text-orange-400'
  },
  final_word: {
    icon: '💬',
    label: 'Remember This',
    bg: 'bg-green-900/30',
    border: 'border-green-500/40',
    textColor: 'text-green-100',
    labelColor: 'text-green-400'
  }
}

// The 6 sections in display order
const SECTION_ORDER = [
  'headline',
  'result_summary',
  'key_performer_story',
  'turning_point_story',
  'pressure_score_accuracy',
  'final_word'
]

// ============================================
// MAIN COMPONENT
// ============================================
function PostMatchDebrief() {
  // Current screen: 'picker' or 'debrief'
  const [screen, setScreen] = useState('picker')

  // List of available matches from backend
  const [matches, setMatches] = useState([])

  // Which match the user selected
  const [selectedMatch, setSelectedMatch] = useState(null)

  // The full debrief data returned by Groq AI
  const [debriefData, setDebriefData] = useState(null)

  // Loading state — true while waiting for AI to respond
  const [loading, setLoading] = useState(false)

  // Error message if something goes wrong
  const [error, setError] = useState('')

  // Have we loaded the matches list yet?
  const [matchesLoaded, setMatchesLoaded] = useState(false)

  // ============================================
  // LOAD MATCHES on first render
  // We use a flag instead of useEffect so we
  // load only once when the picker screen shows
  // ============================================
  const loadMatches = async () => {
    if (matchesLoaded) return  // already loaded, skip
    try {
      // GET /api/debrief/matches — returns list of completed matches
      const res = await axios.get(`${API_URL}/api/debrief/matches`)
      setMatches(res.data.matches)
      setMatchesLoaded(true)
    } catch (err) {
      setError('Could not load matches. Make sure backend is running!')
      setMatchesLoaded(true)
    }
  }

  // Call loadMatches the first time component renders
  // We do it inline so it triggers on first screen mount
  if (!matchesLoaded && screen === 'picker') {
    loadMatches()
  }

  // ============================================
  // GENERATE DEBRIEF — calls Groq AI via backend
  // ============================================
  const generateDebrief = async (matchId, matchTitle) => {
    setSelectedMatch({ id: matchId, title: matchTitle })
    setLoading(true)
    setError('')
    setScreen('debrief')

    try {
      // GET /api/debrief/generate/{match_id}
      // Backend sends match facts to Groq, returns 6 sections as JSON
      const res = await axios.get(`${API_URL}/api/debrief/generate/${matchId}`)
      setDebriefData(res.data)
    } catch (err) {
      setError('Debrief generation failed. Try again!')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // RESET — go back to match picker
  // ============================================
  const resetToHome = () => {
    setScreen('picker')
    setDebriefData(null)
    setSelectedMatch(null)
    setError('')
  }

  // ============================================
  // RENDER: Match Picker Screen
  // ============================================
  if (screen === 'picker') {
    return (
      <div className="min-h-screen bg-gray-950 p-6">

        {/* Header */}
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => window.history.back()}
            className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition-colors"
          >
            ← Back
          </button>

          <div className="text-center mb-8">
            {/* Big emoji */}
            <div className="text-6xl mb-4">📋</div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white mb-2">
              60-Second Debrief
            </h1>

            {/* Subtitle */}
            <p className="text-gray-400 text-lg">
              Missed the match? Get the full story in 60 seconds.
            </p>
          </div>

          {/* How it works */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-8">
            <p className="text-gray-400 text-sm text-center leading-relaxed">
              Pick a completed match below. CricIQ's AI reads every stat and
              gives you a crisp 60-second summary — result, key performer,
              turning point, and whether our Pressure Score called it right.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-4 mb-6 text-red-300 text-center">
              {error}
            </div>
          )}

          {/* Match list */}
          <div className="space-y-4">
            <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-3">
              Completed Matches
            </h2>

            {/* Loading skeleton */}
            {!matchesLoaded && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="bg-gray-800 rounded-xl p-5 animate-pulse h-20"
                  />
                ))}
              </div>
            )}

            {/* Match cards */}
            {matchesLoaded && matches.map((match) => (
              <button
                key={match.id}
                onClick={() => generateDebrief(match.id, match.title)}
                className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-orange-500/50 rounded-xl p-5 text-left transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    {/* Match title */}
                    <p className="text-white font-semibold text-lg group-hover:text-orange-300 transition-colors">
                      {match.title}
                    </p>
                    {/* Result */}
                    <p className="text-gray-400 text-sm mt-1">
                      {match.result}
                    </p>
                  </div>
                  {/* Arrow */}
                  <div className="text-orange-400 text-xl group-hover:translate-x-1 transition-transform">
                    →
                  </div>
                </div>
              </button>
            ))}

            {/* Empty state */}
            {matchesLoaded && matches.length === 0 && !error && (
              <div className="text-center text-gray-500 py-10">
                No completed matches found.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER: Debrief Screen
  // Shows loading → then 6 AI-generated sections
  // ============================================
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto">

        {/* Back button */}
        <button
          onClick={resetToHome}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition-colors"
        >
          ← Choose Another Match
        </button>

        {/* Match title banner */}
        <div className="text-center mb-6">
          <p className="text-orange-400 text-sm font-medium uppercase tracking-wider mb-1">
            Post-Match Debrief
          </p>
          <h1 className="text-2xl font-bold text-white">
            {selectedMatch?.title}
          </h1>
        </div>

        {/* ============================================
            LOADING STATE — while Groq generates the debrief
        ============================================ */}
        {loading && (
          <div className="space-y-4">
            {/* Animated loading card */}
            <div className="bg-gray-900 border border-orange-500/30 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4 animate-bounce">🤖</div>
              <p className="text-orange-300 font-semibold text-lg mb-2">
                CricIQ is reading the match...
              </p>
              <p className="text-gray-400 text-sm">
                Our AI is crafting your 60-second debrief
              </p>

              {/* Animated dots */}
              <div className="flex justify-center gap-2 mt-6">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>

            {/* Skeleton sections */}
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-3" />
                <div className="h-3 bg-gray-800 rounded w-full mb-2" />
                <div className="h-3 bg-gray-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* ============================================
            ERROR STATE
        ============================================ */}
        {!loading && error && (
          <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">😬</div>
            <p className="text-red-300 font-semibold mb-2">{error}</p>
            <button
              onClick={() => generateDebrief(selectedMatch.id, selectedMatch.title)}
              className="mt-4 bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ============================================
            DEBRIEF SECTIONS — shown when Groq responds
        ============================================ */}
        {!loading && debriefData && (
          <div className="space-y-4">

            {/* Meta strip — scores */}
            {debriefData.meta && (
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex justify-between items-center">
                <div className="text-gray-300 text-sm">
                  {debriefData.meta.scores}
                </div>
                <div className="text-green-400 text-sm font-medium">
                  ✓ {debriefData.meta.winning_team} won
                </div>
              </div>
            )}

            {/* 6 AI-generated sections */}
            {SECTION_ORDER.map((sectionKey) => {
              // Get the AI text for this section
              const text = debriefData[sectionKey]

              // Get the visual config for this section
              const config = SECTION_CONFIG[sectionKey]

              // Don't render if no data for this key
              if (!text) return null

              return (
                <div
                  key={sectionKey}
                  className={`${config.bg} border ${config.border} rounded-xl p-5`}
                >
                  {/* Section label */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{config.icon}</span>
                    <span className={`text-xs font-bold uppercase tracking-widest ${config.labelColor}`}>
                      {config.label}
                    </span>
                  </div>

                  {/* AI text */}
                  <p className={`${config.textColor} leading-relaxed text-base`}>
                    {text}
                  </p>
                </div>
              )
            })}

            {/* Read time note */}
            <div className="text-center pt-2 pb-4">
              <p className="text-gray-600 text-xs">
                ⏱️ This debrief is designed to be read in under 60 seconds
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              {/* Debrief another match */}
              <button
                onClick={resetToHome}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-medium transition-colors"
              >
                ← Another Match
              </button>

              {/* Go home */}
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-medium transition-colors"
              >
                🏠 Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Export so App.jsx can use it
export default PostMatchDebrief
