// ============================================
// PressureScore.jsx — Feature 4
// Shows custom Pressure Score metric
// ============================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function PressureScore() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    runs_needed: 60,
    balls_remaining: 24,
    wickets_fallen: 6,
    win_probability: 0.35
  })

  const [score, setScore] = useState(null)
  const [loading, setLoading] = useState(false)

  // Update form when user types
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: parseFloat(e.target.value) })
  }

  // Calculate pressure score locally
  // Same formula we built in Python!
  const calculatePressure = () => {
    setLoading(true)

    const { runs_needed, balls_remaining, 
            wickets_fallen, win_probability } = form

    // Avoid division by zero
    if (balls_remaining <= 0) {
      setScore(100)
      setLoading(false)
      return
    }

    // Required run rate per ball
    const required_rate = runs_needed / balls_remaining

    // Wicket pressure
    const wicket_pressure = 1 - ((10 - wickets_fallen) / 10)

    // Run rate pressure — capped at 3 runs per ball
    const run_rate_pressure = Math.min(required_rate / 3, 1.0)

    // Win probability pressure
    const win_pressure = 1 - win_probability

    // Final pressure score
    const pressure = (
      (win_pressure * 0.50) +
      (run_rate_pressure * 0.30) +
      (wicket_pressure * 0.20)
    ) * 100

    setScore(Math.round(pressure * 100) / 100)
    setLoading(false)
  }

  // Get color based on pressure level
  const getPressureColor = (score) => {
    if (score >= 75) return 'text-red-500'
    if (score >= 50) return 'text-orange-400'
    if (score >= 25) return 'text-yellow-400'
    return 'text-green-400'
  }

  // Get label based on pressure level
  const getPressureLabel = (score) => {
    if (score >= 75) return '🔥 CRITICAL PRESSURE!'
    if (score >= 50) return '⚡ HIGH PRESSURE'
    if (score >= 25) return '😤 MODERATE PRESSURE'
    return '😎 LOW PRESSURE'
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

      <h1 className="text-3xl font-bold text-white mb-2">
        🔥 Pressure Score
      </h1>
      <p className="text-gray-400 mb-6">
        Novel ML metric invented for CricIQ
      </p>

      {/* Input form */}
      <div className="grid grid-cols-2 gap-4 max-w-lg mb-6">
        {Object.entries(form).map(([key, value]) => (
          <div key={key}>
            <label className="text-gray-400 text-sm block mb-1">
              {key.replace(/_/g, ' ')}
            </label>
            <input
              type="number"
              step="0.01"
              name={key}
              value={value}
              onChange={handleChange}
              className="w-full bg-gray-800 text-white rounded-lg p-2 border border-gray-600"
            />
          </div>
        ))}
      </div>

      {/* Calculate button */}
      <button
        onClick={calculatePressure}
        disabled={loading}
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl mb-6"
      >
        🔥 Calculate Pressure Score
      </button>

      {/* Result */}
      {score !== null && (
        <div className="bg-gray-900 rounded-2xl p-6 max-w-lg border border-gray-700">

          {/* Big score display */}
          <div className="text-center mb-4">
            <div className={`text-7xl font-bold ${getPressureColor(score)}`}>
              {score}
            </div>
            <div className="text-gray-400 mt-1">out of 100</div>
          </div>

          {/* Pressure label */}
          <div className="text-center text-2xl font-bold mb-6">
            {getPressureLabel(score)}
          </div>

          {/* Pressure bar */}
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div
              className="bg-red-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${score}%` }}
            />
          </div>

          {/* Formula explanation */}
          <div className="mt-6 bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">
              Formula: 50% win pressure + 30% run rate pressure + 20% wicket pressure
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PressureScore