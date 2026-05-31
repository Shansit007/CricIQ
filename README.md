# 🏏 CricIQ — Cricket Intelligence Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-criciq--nine.vercel.app-00D4FF?style=for-the-badge&logo=vercel)](https://criciq-nine.vercel.app)
[![GitHub Stars](https://img.shields.io/github/stars/Shansit007/CricIQ?style=for-the-badge&color=F4A703)](https://github.com/Shansit007/CricIQ/stargazers)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Made with Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![Made with React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)

> **AI-powered cricket intelligence platform — built for college students who can't watch every ball.**
> Final Year Project — B.Tech CSE (AI/ML), VIT Bhopal University

---

## 🌐 Live Demo

**Frontend:** https://criciq-nine.vercel.app  
**Backend API:** https://criciq-backend-8aoj.onrender.com/docs  
**Admin Dashboard:** https://criciq-nine.vercel.app/admin

---

## 🌟 Features (11 total)

| # | Feature | Description |
|---|---|---|
| 1 | 📊 **Win Probability** | XGBoost model trained on 500K+ IPL deliveries — updated every ball |
| 2 | 🔍 **SHAP Explainability** | "Why did the probability change?" — plain English, not ML jargon |
| 3 | 🤖 **AI Commentary** | Ball-by-ball Harsha Bhogle-style commentary via Llama 3.3 70B (Groq) |
| 4 | 📚 **Study Mode (Delta Briefing)** | Set a timer, study, come back — get ONLY what changed in 4 lines |
| 5 | 🎙 **AI Catch-Up Narrator** | Been away 45 mins? Get a 30-second friend-style catch-up from AI |
| 6 | ⚡ **Pressure Score** | Novel ML metric: `f(runs_needed, balls_left, wickets, SR, economy, phase)` — fires alert at critical moments |
| 7 | ♟ **Turning Points Map** | Chess-style analysis of the 3 match-turning moments + counterfactual ("if this catch wasn't dropped...") |
| 8 | ⚔️ **Rivalry Intelligence** | H2H stats, year-by-year trends, top performers between any two teams |
| 9 | 🏏 **Fantasy XI Optimizer** | Budget-constrained Dream11 team picker |
| 10 | 🎮 **Friend Game Room** | Create a room → share 6-digit code → friends predict → live leaderboard → Cricket Brain crowned |
| 11 | 🔐 **Auth + Dashboard** | Email/Google login via Supabase — personal prediction history and stats |

---

## 🏗️ Architecture

```
React Frontend (Vercel)
    │
    ├── REST API calls ──────────────► FastAPI Backend (Render)
    │                                        │
    ├── WebSocket (Socket.io) ───────────────┤
    │                                        ├── XGBoost ML Model (84% accuracy)
    └── Supabase Realtime ──────────────────►│── SHAP TreeExplainer
                                             ├── Groq Llama 3.3 70B (AI commentary)
                                             ├── Supabase (Auth + DB + Realtime)
                                             └── Cricsheet data (500K+ deliveries)
```

---

## 🛠️ Tech Stack (100% Free)

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Tailwind CSS | UI |
| **Charts** | Recharts | Win probability + rivalry charts |
| **Backend** | FastAPI (Python 3.11) | REST API + WebSocket |
| **Real-time** | python-socketio + Supabase Realtime | Live match + game room |
| **ML Model** | XGBoost + scikit-learn | Win probability |
| **Explainability** | SHAP TreeExplainer | Feature importance |
| **AI/LLM** | Groq API — Llama 3.3 70B | Commentary + catch-up narrator |
| **LLM Framework** | LangChain | LLM chains |
| **Auth + DB** | Supabase | Authentication + PostgreSQL |
| **Data** | Cricsheet.org | 500K+ IPL ball-by-ball records |
| **Deploy Frontend** | Vercel | Free hosting |
| **Deploy Backend** | Render | Free hosting |

---

## 🤖 ML Model — Pressure Score (Novel Metric)

The **Pressure Score** is a novel metric invented for CricIQ:

```
Pressure Score = RRR × wicket_multiplier × batter_efficiency × phase_factor × bowler_factor
```

- **Range**: 0 (no pressure) to 15 (maximum/critical)
- **Inputs**: Runs needed, balls remaining, wickets in hand, batter strike rate, bowler economy, match phase
- **Alert**: Fires a notification when score crosses threshold — "🔥 Critical moment RIGHT NOW"

### Win Probability Model

- **Algorithm**: XGBoost Classifier
- **Training Data**: 500K+ IPL deliveries (Cricsheet.org)
- **Features**: `cum_runs`, `cum_wickets`, `balls_remaining`, `runs_needed`, `ball_number`, `target`
- **Accuracy**: 84% on test set
- **Explainability**: SHAP values translated into plain cricket language

---

## 🎮 Friend Game Room

1. One person creates a room → gets a 6-digit code (e.g. `AB3X7K`)
2. Share code with WhatsApp group → friends join instantly
3. Everyone predicts: next wicket / next boundary / final score
4. **Live leaderboard** updates in real-time via Supabase Realtime
5. End of match → **"Cricket Brain of the Match"** crowned 🏆

---

## 🚀 Local Setup

### 1. Clone
```bash
git clone https://github.com/Shansit007/CricIQ.git
cd CricIQ
```

### 2. Backend
```bash
cd backend
pip3 install -r requirements.txt
# Create .env with your keys (see Environment Variables below)
uvicorn main:socket_app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
```
GROQ_API_KEY=your_groq_key          # console.groq.com — free
SUPABASE_URL=your_supabase_url      # supabase.com — free
SUPABASE_ANON_KEY=your_anon_key
FRONTEND_URL=https://criciq-nine.vercel.app
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🚢 Deployment

| Part | Platform | Cost |
|---|---|---|
| Frontend | Vercel | Free |
| Backend | Render | Free |
| Database + Auth | Supabase | Free tier |
| AI/LLM | Groq API | Free tier |

---

## 👤 Author

**Shansit** — B.Tech CSE (AI/ML), 8th Semester  
VIT Bhopal University

- GitHub: [@Shansit007](https://github.com/Shansit007)
- Project: [github.com/Shansit007/CricIQ](https://github.com/Shansit007/CricIQ)

---

## 📄 License

MIT License — free to use, modify, and distribute.
