// ============================================
// Home.jsx — CricIQ Home Page
// Shows all 7 features as clickable cards
// ============================================

// useNavigate lets us go to different pages
import { useNavigate } from 'react-router-dom'

// Data for all 7 feature cards
const features = [
  {
    id: 1,
    title: "Delta Brief",
    emoji: "⏱️",
    description: "Only what changed since you last checked",
    route: "/delta",   // ← fixed: points to the dedicated Delta page
    color: "from-purple-900 to-purple-700"
  },
  {
    id: 2,
    title: "AI Narrator",
    emoji: "🎙️",
    description: "30-second catch-up like a friend explaining",
    route: "/narrator",
    color: "from-blue-900 to-blue-700"
  },
  {
    id: 3,
    title: "Win Probability",
    emoji: "📊",
    description: "XGBoost prediction with plain English reasons",
    route: "/win-probability",
    color: "from-green-900 to-green-700"
  },
  {
    id: 4,
    title: "Pressure Score",
    emoji: "🔥",
    description: "Custom ML metric — know when it's critical",
    route: "/pressure",
    color: "from-red-900 to-red-700"
  },
  {
    id: 5,
    title: "Turning Points",
    emoji: "♟️",
    description: "3 moments that changed the match",
    route: "/turning-points",   // ← fixed: points to turning points page
    color: "from-yellow-900 to-yellow-700"
  },
  {
    id: 6,
    title: "Friend Game",
    emoji: "👥",
    description: "Predict with friends, win Cricket Brain title",
    route: "/game",     // ← fixed: points to the Prediction Game page
    color: "from-pink-900 to-pink-700"
  },
  {
    id: 7,
    title: "60s Debrief",
    emoji: "📋",
    description: "Full match summary in 60 seconds",
    route: "/debrief",  // ← fixed: points to the Post-Match Debrief page
    color: "from-orange-900 to-orange-700"
  }
]

function Home() {
  // useNavigate hook lets us go to different pages
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-white mb-2">
          🏏 CricIQ
        </h1>
        <p className="text-gray-400 text-lg">
          AI-powered cricket intelligence for college students
        </p>
      </div>

      {/* Feature cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {features.map((feature) => (
          <div
            key={feature.id}
            // onClick navigates to the feature page
            onClick={() => navigate(feature.route)}
            className={`
              bg-gradient-to-br ${feature.color}
              rounded-2xl p-6 cursor-pointer
              hover:scale-105 transition-transform duration-200
              border border-gray-700
            `}
          >
            {/* Feature emoji and title */}
            <div className="text-4xl mb-3">{feature.emoji}</div>
            <h2 className="text-xl font-bold text-white mb-2">
              {feature.title}
            </h2>
            <p className="text-gray-300 text-sm">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-gray-600 mt-10 text-sm">
        Built with XGBoost + SHAP + Groq LLaMA 3 🤖
      </p>
    </div>
  )
}

export default Home