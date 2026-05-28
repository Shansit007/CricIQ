// ============================================
// TurningPoints.jsx — Feature 5: Chess-Style Turning Points Map
//
// Shows the 3 moments that DECIDED the match.
// Each turning point has:
//   - Chess annotation (♛ ♜ ♟ with rating !!/!/??/??)
//   - Win probability shift visualization
//   - AI narration (natural cricket language)
//   - "🔮 What If?" counterfactual analysis
//
// 2 SCREENS:
//   SCREEN 1 — SETUP:  Pick a match
//   SCREEN 2 — RESULT: The 3 turning points timeline
// ============================================

// useState = store screen data
// useEffect = fetch matches on page load
import { useState, useEffect } from 'react'

// axios = HTTP calls to FastAPI backend
import axios from 'axios'

// useNavigate = back button
import { useNavigate } from 'react-router-dom'

// ============================================
// CHESS RATING CONFIG
// Chess uses !! / ! / ? / ?? to rate moves
// We use the same for cricket moments
// ============================================
const CHESS_RATING_CONFIG = {
  "!!": { label: "Brilliant",  color: "text-yellow-400", bg: "bg-yellow-900/40 border-yellow-700" },
  "!":  { label: "Good",       color: "text-green-400",  bg: "bg-green-900/40 border-green-700"  },
  "?":  { label: "Mistake",    color: "text-orange-400", bg: "bg-orange-900/40 border-orange-700"},
  "??": { label: "Blunder",    color: "text-red-400",    bg: "bg-red-900/40 border-red-700"      },
}

// ============================================
// EVENT TYPE ICONS
// Each type of cricket event gets a specific emoji
// ============================================
const EVENT_ICONS = {
  CATCH_DROP:        "🙌",
  WICKET_CLUSTER:    "💀",
  BOUNDARY_STORM:    "💥",
  RUN_OUT:           "🏃",
  COLLAPSE:          "📉",
  POWERPLAY_ASSAULT: "⚡",
  BOWLING_SPELL:     "🎯",
  BATTER_EXPLODES:   "🔥",
}

// ============================================
// CHESS LABEL COLORS
// Each turning point tier has its own color
// ============================================
const CHESS_LABEL_COLORS = {
  "Game Changer":    { text: "text-yellow-300", border: "border-yellow-600", bg: "bg-yellow-950" },
  "Momentum Shift":  { text: "text-blue-300",   border: "border-blue-600",   bg: "bg-blue-950"   },
  "Pressure Point":  { text: "text-purple-300", border: "border-purple-600", bg: "bg-purple-950" },
}

// ============================================
// MAIN COMPONENT
// ============================================
function TurningPoints() {

  const navigate = useNavigate()

  // screen: 'setup' = match picker, 'result' = turning points
  const [screen, setScreen] = useState('setup')

  // matches list from backend
  const [matches, setMatches] = useState([])
  const [loadingMatches, setLoadingMatches] = useState(true)

  // which match user picked
  const [selectedMatch, setSelectedMatch] = useState(null)

  // the turning points analysis data from backend
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // which "what if" card is expanded (null = none)
  const [expandedWhatIf, setExpandedWhatIf] = useState(null)

  // ============================================
  // FETCH MATCHES on page load
  // ============================================
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/turning-points/matches')
        setMatches(res.data.matches)
        if (res.data.matches.length > 0) {
          setSelectedMatch(res.data.matches[0])   // auto-select first match
        }
      } catch {
        // Fallback mock if backend is down
        const mock = [
          { id: "mi-vs-csk",  title: "Mumbai Indians vs Chennai Super Kings",              team1: "MI",  team2: "CSK",  result: "MI won by 23 runs" },
          { id: "rcb-vs-kkr", title: "Royal Challengers Bangalore vs Kolkata Knight Riders", team1: "RCB", team2: "KKR",  result: "KKR won by 6 wickets" },
          { id: "gt-vs-rr",   title: "Gujarat Titans vs Rajasthan Royals",                  team1: "GT",  team2: "RR",   result: "GT won by 18 runs" },
        ]
        setMatches(mock)
        setSelectedMatch(mock[0])
      }
      setLoadingMatches(false)
    }
    fetchMatches()
  }, [])

  // ============================================
  // ANALYZE — call backend to get turning points
  // ============================================
  const analyze = async () => {
    if (!selectedMatch) return
    setLoading(true)
    setError(null)

    try {
      const res = await axios.get(
        `http://localhost:8000/api/turning-points/analyze/${selectedMatch.id}`
      )
      setAnalysis(res.data)
      setScreen('result')
    } catch (err) {
      setError('Backend error. Make sure uvicorn is running and GROQ_API_KEY is set in .env')
    }
    setLoading(false)
  }

  // ============================================
  // WIN PROBABILITY BAR COMPONENT
  // Shows before/after win prob as colored bars
  // ============================================
  const WinProbBar = ({ team1, team2, wpBefore, wpAfter, shiftDirection }) => {
    // Colors: team1 = blue side, team2 = red side
    return (
      <div className="mt-3">
        {/* Labels */}
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{team1}</span>
          <span>{team2}</span>
        </div>

        {/* BEFORE bar */}
        <div className="mb-1.5">
          <p className="text-gray-600 text-xs mb-0.5">Before</p>
          <div className="flex rounded-full overflow-hidden h-3 bg-gray-800">
            {/* team1 portion */}
            <div
              className="bg-blue-700 transition-all duration-500"
              style={{ width: `${wpBefore}%` }}
            />
            {/* team2 portion */}
            <div
              className="bg-red-700 flex-1"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-0.5">
            <span>{wpBefore}%</span>
            <span>{100 - wpBefore}%</span>
          </div>
        </div>

        {/* AFTER bar */}
        <div>
          <p className="text-gray-600 text-xs mb-0.5">After</p>
          <div className="flex rounded-full overflow-hidden h-3 bg-gray-800">
            <div
              className={`transition-all duration-700 ${shiftDirection === 'team1' ? 'bg-blue-400' : 'bg-blue-700'}`}
              style={{ width: `${wpAfter}%` }}
            />
            <div className={`flex-1 ${shiftDirection === 'team2' ? 'bg-red-400' : 'bg-red-700'}`} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-0.5">
            <span className={shiftDirection === 'team1' ? 'text-blue-400 font-bold' : ''}>{wpAfter}%</span>
            <span className={shiftDirection === 'team2' ? 'text-red-400 font-bold' : ''}>{100 - wpAfter}%</span>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER — SCREEN 1: SETUP
  // ============================================
  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-5">

        {/* Top bar */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-white text-xl">←</button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">♟️ Turning Points</h1>
            <p className="text-gray-500 text-sm">3 moments that decided the match</p>
          </div>
        </div>

        {/* Chess legend */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Chess Annotations</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(CHESS_RATING_CONFIG).map(([rating, cfg]) => (
              <div key={rating} className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${cfg.bg}`}>
                <span className={`font-bold text-sm ${cfg.color}`}>{rating}</span>
                <span className="text-gray-400 text-xs">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Match selector */}
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
          Select Match to Analyze
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
                  rounded-2xl p-4 border text-left transition-all
                  ${selectedMatch?.id === match.id
                    ? 'bg-yellow-950 border-yellow-600 shadow-lg shadow-yellow-900/20'
                    : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                  }
                `}
              >
                <p className={`font-bold text-base ${selectedMatch?.id === match.id ? 'text-yellow-300' : 'text-white'}`}>
                  ♟️ {match.title || `${match.team1} vs ${match.team2}`}
                </p>
                <p className="text-gray-500 text-xs mt-1">{match.result}</p>
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && <p className="text-red-400 text-sm mb-4">⚠️ {error}</p>}

        {/* Analyze button */}
        <button
          onClick={analyze}
          disabled={!selectedMatch || loading}
          className={`
            w-full py-5 rounded-2xl font-bold text-lg transition-all
            ${selectedMatch && !loading
              ? 'bg-yellow-600 hover:bg-yellow-500 text-black shadow-lg shadow-yellow-900/30'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }
          `}
        >
          {loading ? '🧠 AI is analyzing the match...' : '♟️ Analyze Turning Points'}
        </button>

        {selectedMatch && !loading && (
          <p className="text-center text-gray-600 text-xs mt-3">
            AI will identify the 3 moments that decided {selectedMatch.title || `${selectedMatch.team1} vs ${selectedMatch.team2}`}
          </p>
        )}
      </div>
    )
  }

  // ============================================
  // RENDER — SCREEN 2: RESULT (Timeline)
  // ============================================
  if (screen === 'result' && analysis) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-5">

        {/* Top bar */}
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => { setScreen('setup'); setAnalysis(null); setExpandedWhatIf(null); }}
            className="text-gray-500 hover:text-white text-xl"
          >←</button>
          <div>
            <h1 className="text-xl font-bold text-white">♟️ Turning Points</h1>
            <p className="text-gray-500 text-xs">{analysis.match_title}</p>
          </div>
        </div>

        {/* Result badge */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 mb-6 inline-block">
          <p className="text-gray-300 text-sm">🏆 {analysis.result}</p>
        </div>

        {/* ---- TIMELINE ---- */}
        {/* The 3 turning points, connected by a vertical line */}
        <div className="relative">

          {/* Vertical connector line */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-800 z-0"></div>

          {analysis.turning_points.map((tp, index) => {
            const ratingCfg = CHESS_RATING_CONFIG[tp.chess_rating] || CHESS_RATING_CONFIG["!"]
            const labelCfg  = CHESS_LABEL_COLORS[tp.chess_label]   || CHESS_LABEL_COLORS["Pressure Point"]
            const eventIcon = EVENT_ICONS[tp.event_type] || "⚡"
            const isWhatIfOpen = expandedWhatIf === tp.id

            return (
              <div key={tp.id} className="relative flex gap-4 mb-6 z-10">

                {/* ---- LEFT: Numbered circle node on timeline ---- */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  {/* The circle with number */}
                  <div className={`
                    w-12 h-12 rounded-full border-2 flex items-center justify-center
                    font-bold text-lg z-10
                    ${labelCfg.bg} ${labelCfg.border} ${labelCfg.text}
                  `}>
                    {tp.id}
                  </div>
                </div>

                {/* ---- RIGHT: The turning point card ---- */}
                <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-2">

                  {/* Top row: over + chess label + rating */}
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">

                    {/* Over badge */}
                    <span className="bg-gray-800 text-gray-300 text-xs font-bold px-3 py-1 rounded-full">
                      Over {tp.over}
                    </span>

                    {/* Chess label (Game Changer / Momentum Shift / Pressure Point) */}
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${labelCfg.bg} ${labelCfg.border} ${labelCfg.text}`}>
                      {tp.chess_symbol} {tp.chess_label}
                    </span>

                    {/* Chess rating badge (!!/!/??/?) */}
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${ratingCfg.bg} ${ratingCfg.color}`}>
                      {tp.chess_rating} {ratingCfg.label}
                    </span>
                  </div>

                  {/* Event description */}
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-xl flex-shrink-0">{eventIcon}</span>
                    <p className="text-white font-semibold text-sm leading-relaxed">{tp.event_short}</p>
                  </div>

                  {/* AI narration */}
                  <p className="text-gray-300 text-sm leading-relaxed mb-4 italic">
                    {tp.narration}
                  </p>

                  {/* Benefited team pill */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-gray-500 text-xs">Benefited:</span>
                    <span className="bg-gray-800 text-gray-200 text-xs font-bold px-3 py-1 rounded-full">
                      🏏 {tp.team_benefited}
                    </span>
                  </div>

                  {/* Win probability shift bars */}
                  <WinProbBar
                    team1={analysis.team1}
                    team2={analysis.team2}
                    wpBefore={tp.wp_before}
                    wpAfter={tp.wp_after}
                    shiftDirection={tp.shift_direction}
                  />

                  {/* ---- WHAT IF? SECTION (expandable) ---- */}
                  <div className="mt-4">

                    {/* Toggle button */}
                    <button
                      onClick={() => setExpandedWhatIf(isWhatIfOpen ? null : tp.id)}
                      className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-semibold transition-colors"
                    >
                      <span>🔮 What If?</span>
                      {/* Chevron rotates when open */}
                      <span className={`transition-transform duration-200 ${isWhatIfOpen ? 'rotate-180' : ''}`}>
                        ▾
                      </span>
                    </button>

                    {/* Expanded counterfactual content */}
                    {isWhatIfOpen && (
                      <div className="mt-3 bg-purple-950 border border-purple-800 rounded-xl p-4">
                        {/* The "if" premise */}
                        <p className="text-purple-300 text-xs font-semibold uppercase tracking-wide mb-2">
                          Alternate Timeline
                        </p>
                        <p className="text-purple-200 text-xs mb-2 font-medium">
                          IF: {tp.counterfactual_if}
                        </p>
                        {/* The AI counterfactual story */}
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {tp.counterfactual_story}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ---- MATCH VERDICT ---- */}
        {/* AI's overall summary of how the match was decided */}
        <div className="bg-gradient-to-br from-yellow-950 to-gray-900 border border-yellow-800 rounded-2xl p-5 mt-2 mb-6">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-3">
            ♛ Match Verdict
          </p>
          <p className="text-gray-200 text-sm leading-relaxed">
            {analysis.match_verdict}
          </p>
        </div>

        {/* New analysis button */}
        <button
          onClick={() => { setScreen('setup'); setAnalysis(null); setExpandedWhatIf(null); }}
          className="w-full bg-yellow-700 hover:bg-yellow-600 text-black font-bold py-4 rounded-2xl text-base transition-all"
        >
          ♟️ Analyze Another Match
        </button>

        <p className="text-center text-gray-700 text-xs mt-4 pb-4">
          CricIQ Turning Points™ · powered by Groq LLaMA 3
        </p>
      </div>
    )
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )
}

export default TurningPoints
