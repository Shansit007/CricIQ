// ============================================
// WinProbability.jsx — Feature 3
// Shows live win probability with SHAP reasons
// ============================================

import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

function WinProbability() {
  const navigate = useNavigate()

  // Form state — match situation inputs
  const [form, setForm] = useState({
    cum_runs: 45,
    cum_wickets: 2,
    balls_remaining: 60,
    runs_needed: 80,
    ball_number: 60,
    target: 125
  })

  // Result state — what API returns
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // Update form when user types
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: parseFloat(e.target.value) })
  }

  // Call win probability API
  const predict = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        'https://criciq-backend-8aoj.onrender.com/api/win-probability/predict',
        form
      )
      setResult(response.data)
    } catch (error) {
      alert('Error connecting to backend!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="text-gray-400 mb-6 hover:text-white"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold text-white mb-6">
        📊 Win Probability
      </h1>

      {/* Input form */}
      <div className="grid grid-cols-2 gap-4 max-w-lg mb-6">
        {Object.entries(form).map(([key, value]) => (
          <div key={key}>
            <label className="text-gray-400 text-sm block mb-1">
              {key.replace(/_/g, ' ')}
            </label>
            <input
              type="number"
              name={key}
              value={value}
              onChange={handleChange}
              className="w-full bg-gray-800 text-white rounded-lg p-2 border border-gray-600"
            />
          </div>
        ))}
      </div>

      {/* Predict button */}
      <button
        onClick={predict}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl mb-6"
      >
        {loading ? '⏳ Predicting...' : '📊 Predict Win Probability'}
      </button>

      {/* Result */}
      {result && (
        <div className="bg-gray-900 rounded-2xl p-6 max-w-lg border border-gray-700">
          
          {/* Big probability display */}
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-green-400">
              {result.win_probability}%
            </div>
            <div className="text-gray-400 mt-2">
              Batting team win probability
            </div>
          </div>

          {/* Probability bar */}
          <div className="w-full bg-gray-700 rounded-full h-4 mb-6">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${result.win_probability}%` }}
            />
          </div>

          {/* SHAP reasons */}
          <div>
            <h3 className="text-white font-bold mb-3">
              Why? 🤔
            </h3>
            {result.reasons.map((reason, i) => (
              <div
                key={i}
                className="bg-gray-800 rounded-lg p-3 mb-2 text-gray-300"
              >
                {reason}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default WinProbability