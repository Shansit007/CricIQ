// ============================================
// DeltaBriefing.jsx — Feature 1: "Explain Like I Was Studying" Mode
// User sets a timer, comes back, gets ONLY what changed
// No full scorecard — just the delta (difference)
// ============================================

// useState lets us store and update data on screen
import { useState } from 'react'

// axios is our HTTP library to call the FastAPI backend
import axios from 'axios'

// useNavigate lets us go back to Home
import { useNavigate } from 'react-router-dom'

// ============================================
// TIMER OPTIONS — user picks how long they studied
// ============================================
const TIMER_OPTIONS = [
  { label: "15 mins", value: 15 },
  { label: "30 mins", value: 30 },
  { label: "45 mins", value: 45 },
  { label: "60 mins", value: 60 },
]

// ============================================
// MAIN COMPONENT
// ============================================
function DeltaBriefing() {

  // navigate lets us go to other pages
  const navigate = useNavigate()

  // selectedTimer — how long user was studying (default 30 mins)
  const [selectedTimer, setSelectedTimer] = useState(30)

  // showForm — toggle between "set checkpoint" view and "get delta" view
  const [showForm, setShowForm] = useState(false)

  // checkpoint — the score when user last checked (saved state)
  const [checkpoint, setCheckpoint] = useState(null)

  // checkpointForm — form values for saving the checkpoint
  const [checkpointForm, setCheckpointForm] = useState({
    score: '',        // score at checkpoint e.g. 85
    wickets: '',      // wickets at checkpoint e.g. 2
    overs: '',        // overs at checkpoint e.g. 10.3
    batting_team: 'Mumbai Indians',  // team batting
  })

  // currentForm — form values for "what is it now"
  const [currentForm, setCurrentForm] = useState({
    current_score: '',    // current score
    current_wickets: '',  // current wickets
    current_overs: '',    // current overs
    key_events: '',       // what happened — typed by user or fetched
  })

  // deltaResult — the AI-generated brief text
  const [deltaResult, setDeltaResult] = useState(null)

  // loading — shows spinner while AI is thinking
  const [loading, setLoading] = useState(false)

  // error — shows error message if API call fails
  const [error, setError] = useState(null)

  // ============================================
  // STEP 1: Save checkpoint before studying
  // ============================================
  const saveCheckpoint = () => {
    // Validate that all fields are filled
    if (!checkpointForm.score || !checkpointForm.wickets || !checkpointForm.overs) {
      setError('Please fill in all checkpoint fields!')
      return
    }

    // Save the checkpoint to state
    setCheckpoint({
      score: parseInt(checkpointForm.score),        // convert to number
      wickets: parseInt(checkpointForm.wickets),
      overs: parseFloat(checkpointForm.overs),
      batting_team: checkpointForm.batting_team,
      savedAt: new Date().toLocaleTimeString(),      // when they saved it
    })

    // Clear error and go to "check delta" view
    setError(null)
    setShowForm(false)  // hide checkpoint form, show timer screen
  }

  // ============================================
  // STEP 2: Get the delta brief (call AI)
  // ============================================
  const getDeltaBrief = async () => {
    // Make sure checkpoint exists
    if (!checkpoint) {
      setError('Please set a checkpoint first!')
      return
    }

    // Make sure current score is filled
    if (!currentForm.current_score || !currentForm.current_wickets || !currentForm.current_overs) {
      setError('Please enter the current match state!')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Call our FastAPI backend — the delta endpoint in narrator.py
      const response = await axios.post(
        'http://localhost:8000/api/narrator/delta',
        {
          // Previous state (checkpoint)
          previous_score: checkpoint.score,
          previous_wickets: checkpoint.wickets,
          previous_overs: checkpoint.overs,

          // Current state (user just entered)
          current_score: parseInt(currentForm.current_score),
          current_wickets: parseInt(currentForm.current_wickets),
          current_overs: parseFloat(currentForm.current_overs),

          // Match context
          batting_team: checkpoint.batting_team,
          key_events: currentForm.key_events || 'No specific events noted',
        }
      )

      // Save the result to show on screen
      setDeltaResult(response.data)

    } catch (err) {
      // Show error if backend is down or returns error
      setError('Could not reach backend. Is FastAPI running on port 8000?')
    }

    setLoading(false)
  }

  // ============================================
  // RESET — start over
  // ============================================
  const resetAll = () => {
    setCheckpoint(null)
    setDeltaResult(null)
    setError(null)
    setCurrentForm({
      current_score: '',
      current_wickets: '',
      current_overs: '',
      key_events: '',
    })
  }

  // ============================================
  // RENDER — what the user sees
  // ============================================
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">

      {/* ---- TOP BAR: back button + title ---- */}
      <div className="flex items-center gap-4 mb-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white text-2xl"
        >
          ←
        </button>

        {/* Page title */}
        <div>
          <h1 className="text-3xl font-bold text-white">
            ⏱️ Delta Brief
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            "Explain Like I Was Studying" — only what changed
          </p>
        </div>
      </div>

      {/* ---- RESULT SCREEN (shown after AI replies) ---- */}
      {deltaResult && (
        <div className="mb-8">

          {/* Big result card */}
          <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-2xl p-6 border border-purple-600 mb-4">

            {/* "You were away for X mins" header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">⏱️</span>
              <span className="text-purple-300 text-sm font-semibold uppercase tracking-wide">
                You were studying for {selectedTimer} mins
              </span>
            </div>

            {/* The AI delta brief text */}
            <p className="text-white text-lg leading-relaxed whitespace-pre-line">
              {deltaResult.delta_brief}
            </p>
          </div>

          {/* Score change pill badges */}
          <div className="flex gap-4 flex-wrap mb-6">

            {/* Runs scored */}
            <div className="bg-green-900 border border-green-700 rounded-xl px-4 py-2 text-center">
              <p className="text-green-300 text-xs uppercase tracking-wide">Runs Scored</p>
              <p className="text-green-400 text-2xl font-bold">
                +{deltaResult.score_change}
              </p>
            </div>

            {/* Wickets fallen */}
            <div className="bg-red-900 border border-red-700 rounded-xl px-4 py-2 text-center">
              <p className="text-red-300 text-xs uppercase tracking-wide">Wickets Fallen</p>
              <p className="text-red-400 text-2xl font-bold">
                {deltaResult.wickets_fallen > 0 ? `-${deltaResult.wickets_fallen}` : '0'}
              </p>
            </div>

            {/* Time studied badge */}
            <div className="bg-purple-900 border border-purple-700 rounded-xl px-4 py-2 text-center">
              <p className="text-purple-300 text-xs uppercase tracking-wide">You Studied</p>
              <p className="text-purple-400 text-2xl font-bold">
                {selectedTimer}m
              </p>
            </div>

          </div>

          {/* Check Again button */}
          <button
            onClick={resetAll}
            className="bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-xl w-full"
          >
            🔄 Set New Checkpoint
          </button>
        </div>
      )}

      {/* ---- MAIN FLOW (shown when no result yet) ---- */}
      {!deltaResult && (
        <>

          {/* ---- TIMER PICKER ---- */}
          <div className="mb-8">
            <h2 className="text-gray-300 text-sm font-semibold uppercase tracking-wide mb-3">
              📚 How long are you studying?
            </h2>
            <div className="flex gap-3 flex-wrap">
              {TIMER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedTimer(opt.value)}
                  className={`
                    px-5 py-2 rounded-xl font-bold border transition-all
                    ${selectedTimer === opt.value
                      ? 'bg-purple-600 border-purple-400 text-white'   // selected style
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-purple-500'  // normal style
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ---- STEP 1: SET CHECKPOINT ---- */}
          {!checkpoint && (
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 mb-6">

              <h2 className="text-lg font-bold text-white mb-1">
                Step 1 — Save Checkpoint Before Studying
              </h2>
              <p className="text-gray-400 text-sm mb-5">
                Enter the current score before you go study. We'll compare when you come back!
              </p>

              {/* Batting team selector */}
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-1">Batting Team</label>
                <select
                  value={checkpointForm.batting_team}
                  onChange={(e) => setCheckpointForm({ ...checkpointForm, batting_team: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white"
                >
                  {/* IPL teams */}
                  {[
                    'Mumbai Indians', 'Chennai Super Kings', 'Royal Challengers Bangalore',
                    'Kolkata Knight Riders', 'Delhi Capitals', 'Rajasthan Royals',
                    'Punjab Kings', 'Sunrisers Hyderabad', 'Lucknow Super Giants',
                    'Gujarat Titans'
                  ].map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              {/* Score, Wickets, Overs in a row */}
              <div className="grid grid-cols-3 gap-3 mb-5">

                {/* Score input */}
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Score</label>
                  <input
                    type="number"
                    placeholder="e.g. 85"
                    value={checkpointForm.score}
                    onChange={(e) => setCheckpointForm({ ...checkpointForm, score: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-3 text-white text-center"
                  />
                </div>

                {/* Wickets input */}
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Wickets</label>
                  <input
                    type="number"
                    placeholder="e.g. 2"
                    min="0" max="10"
                    value={checkpointForm.wickets}
                    onChange={(e) => setCheckpointForm({ ...checkpointForm, wickets: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-3 text-white text-center"
                  />
                </div>

                {/* Overs input */}
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Overs</label>
                  <input
                    type="number"
                    placeholder="e.g. 10.3"
                    step="0.1"
                    value={checkpointForm.overs}
                    onChange={(e) => setCheckpointForm({ ...checkpointForm, overs: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-3 text-white text-center"
                  />
                </div>
              </div>

              {/* Error message */}
              {error && (
                <p className="text-red-400 text-sm mb-4">⚠️ {error}</p>
              )}

              {/* Save checkpoint button */}
              <button
                onClick={saveCheckpoint}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl"
              >
                📌 Save Checkpoint &amp; Start Studying
              </button>
            </div>
          )}

          {/* ---- CHECKPOINT SAVED SCREEN ---- */}
          {checkpoint && (
            <div>

              {/* Checkpoint badge */}
              <div className="bg-green-950 border border-green-800 rounded-2xl p-4 mb-6 flex items-center gap-4">
                <span className="text-3xl">✅</span>
                <div>
                  <p className="text-green-400 font-bold">Checkpoint Saved at {checkpoint.savedAt}</p>
                  <p className="text-green-300 text-sm">
                    {checkpoint.batting_team} — {checkpoint.score}/{checkpoint.wickets} in {checkpoint.overs} overs
                  </p>
                </div>
              </div>

              {/* Step 2 — Enter current state */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700">

                <h2 className="text-lg font-bold text-white mb-1">
                  Step 2 — Back from studying? Enter current score!
                </h2>
                <p className="text-gray-400 text-sm mb-5">
                  What does the score look like now? We'll brief you on what changed.
                </p>

                {/* Current score fields */}
                <div className="grid grid-cols-3 gap-3 mb-4">

                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Current Score</label>
                    <input
                      type="number"
                      placeholder="e.g. 142"
                      value={currentForm.current_score}
                      onChange={(e) => setCurrentForm({ ...currentForm, current_score: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-3 text-white text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Wickets</label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      min="0" max="10"
                      value={currentForm.current_wickets}
                      onChange={(e) => setCurrentForm({ ...currentForm, current_wickets: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-3 text-white text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Current Overs</label>
                    <input
                      type="number"
                      placeholder="e.g. 16.2"
                      step="0.1"
                      value={currentForm.current_overs}
                      onChange={(e) => setCurrentForm({ ...currentForm, current_overs: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-3 text-white text-center"
                    />
                  </div>
                </div>

                {/* Key events — optional */}
                <div className="mb-5">
                  <label className="block text-gray-400 text-sm mb-1">
                    Key Events (optional — what happened?)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kohli out for 45, Dhoni hit 2 sixes"
                    value={currentForm.key_events}
                    onChange={(e) => setCurrentForm({ ...currentForm, key_events: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white"
                  />
                </div>

                {/* Error */}
                {error && (
                  <p className="text-red-400 text-sm mb-4">⚠️ {error}</p>
                )}

                {/* Get Delta button */}
                <button
                  onClick={getDeltaBrief}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-bold py-4 rounded-xl text-lg"
                >
                  {loading ? '⏳ AI is thinking...' : '⚡ Get My Delta Brief'}
                </button>

                {/* Reset link */}
                <button
                  onClick={resetAll}
                  className="w-full text-gray-500 hover:text-gray-300 text-sm mt-3 py-2"
                >
                  ↩ Start Over
                </button>
              </div>
            </div>
          )}

        </>
      )}

    </div>
  )
}

// Export so App.jsx can use this page
export default DeltaBriefing
