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
        </Routes>
      </div>
    </Router>
  )
}

export default App