// ============================================
// App.jsx — Main CricIQ App with routing
// Each feature gets its own page/route
// ============================================

// BrowserRouter enables page navigation
// Routes and Route define each page
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// Import all our feature pages
import Home from './pages/Home'
import WinProbability from './pages/WinProbability'
import Narrator from './pages/Narrator'
import PressureScore from './pages/PressureScore'
import DeltaBriefing from './pages/DeltaBriefing'        // Feature 1 — Delta Brief
import TurningPoints from './pages/TurningPoints'        // Feature 5 — Turning Points Map
import PredictionGame from './pages/PredictionGame'      // Feature 6 — Friend Prediction Game
import PostMatchDebrief from './pages/PostMatchDebrief'  // Feature 7 — 60s Post-Match Debrief

// Main App component
function App() {
  return (
    // Router wraps everything to enable navigation
    <Router>
      <div className="min-h-screen bg-gray-950 text-white">
        <Routes>
          {/* Home page — shows all 7 features */}
          <Route path="/" element={<Home />} />
          
          {/* Feature 3 — Win Probability */}
          <Route path="/win-probability" element={<WinProbability />} />
          
          {/* Feature 2 — AI Narrator */}
          <Route path="/narrator" element={<Narrator />} />
          
          {/* Feature 4 — Pressure Score */}
          <Route path="/pressure" element={<PressureScore />} />

          {/* Feature 1 — Delta Brief "Explain Like I Was Studying" */}
          <Route path="/delta" element={<DeltaBriefing />} />

          {/* Feature 5 — Chess-Style Turning Points Map */}
          <Route path="/turning-points" element={<TurningPoints />} />

          {/* Feature 6 — Friend Group Prediction Game */}
          <Route path="/game" element={<PredictionGame />} />

          {/* Feature 7 — Post-Match 60-Second Debrief */}
          <Route path="/debrief" element={<PostMatchDebrief />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App