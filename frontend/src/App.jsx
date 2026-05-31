// ============================================
// App.jsx — Main CricIQ App with updated routing
// All 6 pages wired up here
// ============================================

// React Router imports
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// New upgraded pages (TypeScript components work fine in JSX app)
import Home          from './pages/Home.tsx'
import Matches       from './pages/Matches.tsx'
import LiveMatch     from './pages/LiveMatch.tsx'
import Predict       from './pages/Predict.tsx'
import Rivalry       from './pages/Rivalry.tsx'
import Fantasy       from './pages/Fantasy.tsx'
import DeltaBriefing from './pages/DeltaBriefing.tsx'   // Feature 1: Study Mode
import CatchUp       from './pages/CatchUp.tsx'          // Feature 2: AI Catch-Up
import PressureScore from './pages/PressureScore.tsx'    // Feature 3: Pressure Score
import TurningPoints from './pages/TurningPoints.tsx'    // Feature 4: Turning Points Map

// Main App component — defines all page routes
function App() {
  return (
    // Router enables browser URL navigation
    <Router>
      {/*
        The dark background is set globally in index.css on the body element.
        No need to repeat it here — just let routes render their pages.
      */}
      <Routes>
        {/* Home/landing page */}
        <Route path="/"            element={<Home />}      />

        {/* All upcoming + live matches grid */}
        <Route path="/matches"     element={<Matches />}   />

        {/* Live match view — :matchId comes from URL like /live/abc123 */}
        <Route path="/live/:matchId" element={<LiveMatch />} />

        {/* Match prediction form */}
        <Route path="/predict"     element={<Predict />}   />

        {/* Head-to-head rivalry intelligence */}
        <Route path="/rivalry"     element={<Rivalry />}   />

        {/* Fantasy XI optimizer */}
        <Route path="/fantasy"     element={<Fantasy />}   />

        {/* New 4 features */}
        <Route path="/study"    element={<DeltaBriefing />} />
        <Route path="/catchup"  element={<CatchUp />}       />
        <Route path="/pressure" element={<PressureScore />} />
        <Route path="/turning"  element={<TurningPoints />} />

        {/* About page — simple static page */}
        <Route path="/about" element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl mb-4">🏏</p>
              <h1 className="text-2xl font-bold text-text-primary mb-2">CricIQ</h1>
              <p className="text-text-secondary">Cricket Intelligence Platform</p>
              <p className="text-text-secondary text-sm mt-2">Final Year Project — VIT Bhopal</p>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  )
}

export default App
