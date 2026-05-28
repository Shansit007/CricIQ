// ============================================
// Narrator.jsx — AI Match Narrator Page
// ============================================

import { useState } from 'react'
import axios from 'axios'

function Narrator() {
  // State to store form inputs
  const [form, setForm] = useState({
    batting_team: 'Mumbai Indians',
    bowling_team: 'Chennai Super Kings',
    current_score: 145,
    wickets: 4,
    overs: 16.2,
    target: 180,
    last_events: 'Rohit out for 67, Hardik hit 2 sixes',
    minutes_away: 45
  })

  // State to store AI response
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // Call our FastAPI backend
  const getCatchup = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        'https://criciq-backend-8aoj.onrender.com/api/narrator/catchup',
        form
      )
      setResult(response.data.catchup)
    } catch (error) {
      setResult('Error connecting to backend!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <h1 className="text-3xl font-bold text-white mb-6">
        🎙️ AI Match Narrator
      </h1>

      {/* Result box */}
      {result && (
        <div className="bg-blue-900 rounded-2xl p-6 mb-6 border border-blue-700">
          <p className="text-white text-lg leading-relaxed">{result}</p>
        </div>
      )}

      {/* Get catchup button */}
      <button
        onClick={getCatchup}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl"
      >
        {loading ? '⏳ Generating...' : '🎙️ Get Catch-up'}
      </button>
    </div>
  )
}

export default Narrator