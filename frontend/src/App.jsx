// ============================================
// App.jsx — Main CricIQ App with all routes
// ============================================

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.tsx'   // global auth state

// Pages
import Home          from './pages/Home.tsx'
import Matches       from './pages/Matches.tsx'
import LiveMatch     from './pages/LiveMatch.tsx'
import Predict       from './pages/Predict.tsx'
import Rivalry       from './pages/Rivalry.tsx'
import Fantasy       from './pages/Fantasy.tsx'
import DeltaBriefing from './pages/DeltaBriefing.tsx'
import CatchUp       from './pages/CatchUp.tsx'
import PressureScore from './pages/PressureScore.tsx'
import TurningPoints from './pages/TurningPoints.tsx'
import Login         from './pages/Login.tsx'           // Auth
import Dashboard     from './pages/Dashboard.tsx'       // Personal dashboard
import GameRoom      from './pages/GameRoom.tsx'        // Friend game room
import Admin         from './pages/Admin.tsx'           // Admin dashboard

function App() {
  return (
    // AuthProvider wraps everything so any page can access the logged-in user
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/"              element={<Home />}         />
          <Route path="/matches"       element={<Matches />}      />
          <Route path="/live/:matchId" element={<LiveMatch />}    />
          <Route path="/predict"       element={<Predict />}      />
          <Route path="/rivalry"       element={<Rivalry />}      />
          <Route path="/fantasy"       element={<Fantasy />}      />
          <Route path="/study"         element={<DeltaBriefing />}/>
          <Route path="/catchup"       element={<CatchUp />}      />
          <Route path="/pressure"      element={<PressureScore />}/>
          <Route path="/turning"       element={<TurningPoints />}/>
          <Route path="/login"         element={<Login />}        />
          <Route path="/dashboard"     element={<Dashboard />}    />
          <Route path="/game"          element={<GameRoom />}     />
          <Route path="/admin"         element={<Admin />}        />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
