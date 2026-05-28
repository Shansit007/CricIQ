// ============================================
// DeltaBriefing.jsx — Feature 1: Delta Brief™
// "Study peacefully. CricIQ watches for you."
//
// 3 SCREENS:
// SCREEN 1 — SETUP:    Pick match + study timer
// SCREEN 2 — STUDYING: Countdown + "CricIQ is watching"
// SCREEN 3 — RESULT:   The full Delta Brief™ output
// ============================================

// useState = store data that changes on screen
// useEffect = run code when something changes (like a timer)
// useRef = store data WITHOUT re-rendering (for timers)
import { useState, useEffect, useRef } from 'react'

// axios = HTTP library to call our FastAPI backend
import axios from 'axios'

// useNavigate = go back to home page
import { useNavigate } from 'react-router-dom'

// ============================================
// TIMER OPTIONS
// User picks how long they'll be studying
// ============================================
const TIMER_OPTIONS = [
  { label: "30m",  value: 30,  seconds: 30 * 60  },
  { label: "45m",  value: 45,  seconds: 45 * 60  },
  { label: "1hr",  value: 60,  seconds: 60 * 60  },
  { label: "90m",  value: 90,  seconds: 90 * 60  },
  { label: "2hr",  value: 120, seconds: 120 * 60 },
  { label: "3hr",  value: 180, seconds: 180 * 60 },
]

// ============================================
// FOMO LEVEL CONFIG
// Controls color and feel for each FOMO level
// ============================================
const FOMO_CONFIG = {
  LOW:     { color: "text-green-400",  bg: "bg-green-950 border-green-800",  bar: "bg-green-500",  width: "w-1/4"  },
  MEDIUM:  { color: "text-yellow-400", bg: "bg-yellow-950 border-yellow-800", bar: "bg-yellow-500", width: "w-2/4"  },
  HIGH:    { color: "text-orange-400", bg: "bg-orange-950 border-orange-800", bar: "bg-orange-500", width: "w-3/4"  },
  EXTREME: { color: "text-red-400",    bg: "bg-red-950 border-red-800",       bar: "bg-red-500",    width: "w-full" },
}

// ============================================
// STUDY SAFE CONFIG
// Controls indicator color and message
// ============================================
const STUDY_SAFE_CONFIG = {
  green:  { dot: "bg-green-500",  text: "text-green-400",  label: "SAFE TO KEEP STUDYING"    },
  orange: { dot: "bg-orange-500", text: "text-orange-400", label: "CHECK OCCASIONALLY"        },
  red:    { dot: "bg-red-500",    text: "text-red-400",    label: "MATCH ENTERING DANGER ZONE" },
}

// ============================================
// MAIN COMPONENT
// ============================================
function DeltaBriefing() {

  const navigate = useNavigate()   // for back button

  // ---- WHICH SCREEN TO SHOW ----
  // 'setup' → user picks match + timer
  // 'studying' → countdown is running
  // 'result' → showing the Delta Brief™
  const [screen, setScreen] = useState('setup')

  // ---- SETUP SCREEN STATE ----
  const [matches, setMatches] = useState([])          // list from API
  const [selectedMatch, setSelectedMatch] = useState(null)   // picked match
  const [selectedTimer, setSelectedTimer] = useState(TIMER_OPTIONS[0])  // default 30m
  const [loadingMatches, setLoadingMatches] = useState(true)  // spinner for match list

  // ---- SESSION STATE ----
  const [sessionId, setSessionId] = useState(null)    // session ID from backend
  const [startingSession, setStartingSession] = useState(false)  // spinner for start btn

  // ---- COUNTDOWN TIMER STATE ----
  const [timeLeft, setTimeLeft] = useState(0)          // seconds remaining
  const timerRef = useRef(null)                        // reference to interval (so we can clear it)
  const [timerDone, setTimerDone] = useState(false)    // true when countdown hits 0

  // ---- RESULT STATE ----
  const [brief, setBrief] = useState(null)             // the Delta Brief™ data
  const [loadingBrief, setLoadingBrief] = useState(false)   // spinner while AI thinks
  const [briefError, setBriefError] = useState(null)  // error message

  // ============================================
  // FETCH LIVE MATCHES on page load
  // ============================================
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        // Call our backend to get live matches
        const res = await axios.get('https://criciq-backend-8aoj.onrender.com/api/delta/matches')
        setMatches(res.data.matches)

        // Auto-select first live match
        const firstLive = res.data.matches.find(m => m.status === 'live')
        if (firstLive) setSelectedMatch(firstLive)

      } catch (err) {
        // If backend is down, use mock matches so UI still works
        setMatches([
          { id: "mi-vs-csk",   team1: "Mumbai Indians",              team2: "Chennai Super Kings",       status: "live",     emoji: "🔵", venue: "Wankhede Stadium" },
          { id: "rcb-vs-kkr",  team1: "Royal Challengers Bangalore", team2: "Kolkata Knight Riders",     status: "live",     emoji: "🔴", venue: "Chinnaswamy Stadium" },
          { id: "gt-vs-rr",    team1: "Gujarat Titans",              team2: "Rajasthan Royals",          status: "upcoming", emoji: "🔵", venue: "Narendra Modi Stadium" },
        ])
        setSelectedMatch({ id: "mi-vs-csk", team1: "Mumbai Indians", team2: "Chennai Super Kings", status: "live", emoji: "🔵", venue: "Wankhede Stadium" })
      }
      setLoadingMatches(false)
    }

    fetchMatches()
  }, [])  // [] means run only once when page loads

  // ============================================
  // COUNTDOWN TIMER
  // Runs when screen switches to 'studying'
  // ============================================
  useEffect(() => {
    // Only start timer on studying screen
    if (screen !== 'studying') return

    // Clear any existing timer
    if (timerRef.current) clearInterval(timerRef.current)

    // Start a new countdown
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Timer reached 0!
          clearInterval(timerRef.current)   // stop the interval
          setTimerDone(true)                // show "ready" UI
          return 0
        }
        return prev - 1   // decrease by 1 second
      })
    }, 1000)   // runs every 1000ms = 1 second

    // Cleanup: clear interval when component unmounts
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [screen])  // re-run when screen changes

  // ============================================
  // START STUDY SESSION
  // Called when user clicks "🎯 Start Study Session"
  // ============================================
  const startSession = async () => {
    if (!selectedMatch) return

    setStartingSession(true)

    try {
      // Tell backend to save current match snapshot
      const res = await axios.post('https://criciq-backend-8aoj.onrender.com/api/delta/start-session', {
        match_id: selectedMatch.id,
        study_minutes: selectedTimer.value
      })

      // Save session ID for later
      setSessionId(res.data.session_id)

      // Set the countdown timer
      setTimeLeft(selectedTimer.seconds)
      setTimerDone(false)

      // Switch to studying screen
      setScreen('studying')

    } catch (err) {
      // Even if backend fails, allow demo to continue
      // Generate a fake session ID for demo
      setSessionId('demo-' + Date.now().toString().slice(-6))
      setTimeLeft(selectedTimer.seconds)
      setTimerDone(false)
      setScreen('studying')
    }

    setStartingSession(false)
  }

  // ============================================
  // GET DELTA BRIEF™
  // Called when user clicks "Show What I Missed" or timer ends
  // ============================================
  const getDeltaBrief = async () => {
    if (!sessionId) return

    setLoadingBrief(true)
    setBriefError(null)

    // Stop the countdown timer
    if (timerRef.current) clearInterval(timerRef.current)

    try {
      // Ask backend for the AI-generated Delta Brief™
      const res = await axios.get(`https://criciq-backend-8aoj.onrender.com/api/delta/brief/${sessionId}`)
      setBrief(res.data)
      setScreen('result')

    } catch (err) {
      setBriefError('Could not get brief. Is the backend running? Try "uvicorn main:app --reload" in terminal.')
    }

    setLoadingBrief(false)
  }

  // ============================================
  // FORMAT time for countdown display
  // Converts seconds to MM:SS format
  // e.g. 1800 → "30:00"
  // ============================================
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')  // minutes, 2 digits
    const s = (seconds % 60).toString().padStart(2, '0')             // seconds, 2 digits
    return `${m}:${s}`
  }

  // ============================================
  // RESET — go back to setup screen
  // ============================================
  const resetAll = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSessionId(null)
    setBrief(null)
    setBriefError(null)
    setTimerDone(false)
    setScreen('setup')
  }

  // ============================================
  // RENDER — pick which screen to show
  // ============================================

  // ---- SCREEN 1: SETUP ----
  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-5">

        {/* Top bar: back + title */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-white text-xl">←</button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">⏱️ Delta Brief™</h1>
            <p className="text-gray-500 text-sm">Study peacefully. CricIQ watches for you.</p>
          </div>
        </div>

        {/* Match selector */}
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
          Select Match
        </p>

        {loadingMatches ? (
          <p className="text-gray-600 text-sm mb-6">Loading matches...</p>
        ) : (
          <div className="flex flex-col gap-3 mb-8">
            {matches.map(match => (
              <button
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className={`
                  rounded-2xl p-4 border text-left transition-all duration-200
                  ${selectedMatch?.id === match.id
                    ? 'bg-violet-950 border-violet-500 shadow-lg shadow-violet-900/30'   // selected
                    : 'bg-gray-900 border-gray-800 hover:border-gray-600'                  // not selected
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  {/* Team names */}
                  <div>
                    <p className="text-white font-bold text-base">
                      {match.emoji} {match.team1} <span className="text-gray-500">vs</span> {match.team2}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{match.venue}</p>
                  </div>

                  {/* Live / Upcoming badge */}
                  <span className={`
                    text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide
                    ${match.status === 'live'
                      ? 'bg-green-900 text-green-400 border border-green-700'
                      : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }
                  `}>
                    {match.status === 'live' ? '● LIVE' : 'UPCOMING'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Study duration picker */}
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
          How long are you studying?
        </p>

        <div className="flex flex-wrap gap-2 mb-10">
          {TIMER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedTimer(opt)}
              className={`
                px-5 py-2 rounded-xl font-bold text-sm border transition-all
                ${selectedTimer.value === opt.value
                  ? 'bg-violet-600 border-violet-400 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-violet-600'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={startSession}
          disabled={!selectedMatch || startingSession}
          className={`
            w-full py-5 rounded-2xl font-bold text-lg transition-all duration-200
            ${selectedMatch
              ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }
          `}
        >
          {startingSession ? '⏳ Starting session...' : '🎯 Start Study Session'}
        </button>

        {/* Subtext */}
        {selectedMatch && (
          <p className="text-center text-gray-600 text-xs mt-3">
            CricIQ will silently track {selectedMatch.team1} vs {selectedMatch.team2} for {selectedTimer.label}
          </p>
        )}
      </div>
    )
  }

  // ---- SCREEN 2: STUDYING (countdown) ----
  if (screen === 'studying') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">

        {/* Pulsing eye icon */}
        <div className={`text-6xl mb-6 ${timerDone ? '' : 'animate-pulse'}`}>
          {timerDone ? '🎉' : '👁️'}
        </div>

        {/* Status text */}
        <h2 className="text-xl font-bold text-white mb-2 text-center">
          {timerDone ? 'Your brief is ready!' : 'CricIQ is watching...'}
        </h2>

        {/* Match name */}
        <p className="text-gray-500 text-sm mb-10 text-center">
          {selectedMatch?.team1} vs {selectedMatch?.team2}
        </p>

        {/* Countdown circle */}
        {!timerDone && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl px-12 py-8 mb-8 text-center">
            <p className="text-5xl font-mono font-bold text-violet-400 tracking-wider">
              {formatTime(timeLeft)}
            </p>
            <p className="text-gray-600 text-sm mt-2">remaining in session</p>
          </div>
        )}

        {/* Study tip */}
        {!timerDone && (
          <p className="text-gray-600 text-sm text-center mb-8 max-w-xs">
            📚 Focus on your studies.<br />
            We'll brief you on everything that mattered.
          </p>
        )}

        {/* Error if brief failed */}
        {briefError && (
          <p className="text-red-400 text-sm text-center mb-4 max-w-xs">{briefError}</p>
        )}

        {/* Main CTA button */}
        <button
          onClick={getDeltaBrief}
          disabled={loadingBrief}
          className={`
            w-full max-w-sm py-5 rounded-2xl font-bold text-lg transition-all
            ${timerDone
              ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 animate-pulse'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }
          `}
        >
          {loadingBrief
            ? '🧠 AI is generating your brief...'
            : timerDone
              ? '📖 Show My Delta Brief™'
              : '🔍 Peek Early'
          }
        </button>

        {/* Back to setup */}
        <button
          onClick={resetAll}
          className="text-gray-600 hover:text-gray-400 text-sm mt-4"
        >
          ↩ Cancel session
        </button>
      </div>
    )
  }

  // ---- SCREEN 3: RESULT (Delta Brief™) ----
  if (screen === 'result' && brief) {

    // Get config objects for display
    const fomoConfig = FOMO_CONFIG[brief.fomo_level] || FOMO_CONFIG.MEDIUM
    const studySafeConfig = STUDY_SAFE_CONFIG[brief.study_safe] || STUDY_SAFE_CONFIG.orange

    return (
      <div className="min-h-screen bg-gray-950 text-white p-5">

        {/* Top bar */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={resetAll} className="text-gray-500 hover:text-white text-xl">←</button>
          <div>
            <h1 className="text-xl font-bold text-white">📚 Delta Brief™</h1>
            <p className="text-gray-500 text-xs">
              {brief.meta?.match} · away for {brief.meta?.away_for_minutes} mins
            </p>
          </div>
        </div>

        {/* ---- STUDY SAFE INDICATOR ---- */}
        {/* Big banner at top so user knows instantly */}
        <div className={`
          rounded-2xl p-4 border mb-4 flex items-center gap-3
          ${studySafeConfig.text === 'text-green-400' ? 'bg-green-950 border-green-800' : ''}
          ${studySafeConfig.text === 'text-orange-400' ? 'bg-orange-950 border-orange-800' : ''}
          ${studySafeConfig.text === 'text-red-400' ? 'bg-red-950 border-red-800' : ''}
        `}>
          {/* Colored dot */}
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${studySafeConfig.dot}`}></div>
          <div>
            <p className={`font-bold text-sm uppercase tracking-wide ${studySafeConfig.text}`}>
              {studySafeConfig.label}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">{brief.study_safe_reason}</p>
          </div>
        </div>

        {/* ---- WHAT CHANGED ---- */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
            🔥 What Changed
          </p>
          <div className="flex flex-col gap-3">
            {/* Each bullet point from AI */}
            {(brief.what_changed || []).map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                {/* Bullet dot */}
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0 mt-2"></div>
                {/* The AI-generated point */}
                <p className="text-gray-200 text-sm leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---- MATCH MOOD + PRESSURE ALERT (side by side) ---- */}
        <div className="grid grid-cols-2 gap-3 mb-4">

          {/* Match Mood Engine */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">🎭 Match Mood</p>
            <p className="text-white font-bold text-lg">{brief.match_mood}</p>
          </div>

          {/* Current score */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">📊 Score Now</p>
            <p className="text-white font-bold text-lg">{brief.meta?.current_score}</p>
          </div>
        </div>

        {/* ---- PRESSURE ALERT ---- */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">
            ⚡ Pressure Alert
          </p>
          <p className="text-gray-200 text-sm leading-relaxed italic">
            "{brief.pressure_alert}"
          </p>
        </div>

        {/* ---- FOMO METER™ ---- */}
        <div className={`rounded-2xl p-5 border mb-4 ${fomoConfig.bg}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
              📊 FOMO Meter™
            </p>
            {/* FOMO level badge */}
            <span className={`font-bold text-sm ${fomoConfig.color}`}>
              {brief.fomo_emoji} {brief.fomo_level}
            </span>
          </div>

          {/* FOMO progress bar */}
          <div className="bg-gray-800 rounded-full h-2 mb-3">
            <div className={`h-2 rounded-full transition-all ${fomoConfig.bar} ${fomoConfig.width}`}></div>
          </div>

          {/* FOMO reason text */}
          <p className="text-gray-300 text-sm">{brief.fomo_reason}</p>
        </div>

        {/* ---- SHOULD YOU WATCH NOW?™ ---- */}
        <div className={`
          rounded-2xl p-5 border mb-4
          ${brief.watch_now
            ? 'bg-red-950 border-red-800'
            : 'bg-gray-900 border-gray-800'
          }
        `}>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">
            📺 Should You Watch?
          </p>
          <p className={`font-bold text-lg mb-1 ${brief.watch_now ? 'text-red-400' : 'text-green-400'}`}>
            {brief.watch_now ? '🔴 WATCH NOW' : '🟢 Keep Studying'}
          </p>
          <p className="text-gray-300 text-sm">{brief.watch_reason}</p>
        </div>

        {/* ---- ONE-LINE HOSTEL SUMMARY™ ---- */}
        <div className="bg-gray-900 border border-violet-900 rounded-2xl p-5 mb-6">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">
            💬 Hostel Summary™
          </p>
          <p className="text-white text-base font-medium leading-relaxed">
            {brief.hostel_summary}
          </p>
        </div>

        {/* ---- NEW SESSION BUTTON ---- */}
        <button
          onClick={resetAll}
          className="w-full bg-violet-700 hover:bg-violet-600 text-white font-bold py-4 rounded-2xl text-base transition-all"
        >
          🔄 New Study Session
        </button>

        <p className="text-center text-gray-700 text-xs mt-4 pb-4">
          CricIQ Delta Brief™ · powered by Groq LLaMA 3
        </p>
      </div>
    )
  }

  // Fallback loading state
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )
}

export default DeltaBriefing
