# ============================================
# main.py — CricIQ FastAPI Backend (Upgraded v2)
# Includes: REST API + Socket.io WebSocket + ML
# ============================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load .env file (CRICAPI_KEY, GROQ_API_KEY, etc.)
load_dotenv()

# ============================================
# Create FastAPI app
# ============================================
app = FastAPI(
    title="CricIQ API",
    description="AI-powered cricket intelligence platform",
    version="2.0.0",
)

# ---- CORS — allow React frontend to call this API ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",          # Vite dev server
        "http://localhost:3000",          # alternate
        os.getenv("FRONTEND_URL", "*"),   # production Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Startup event — load ML model + datasets once
# ============================================
@app.on_event("startup")
async def startup():
    """Load ML model and datasets into memory on startup."""
    print("[Startup] Loading ML model...")
    from services.ml_service import load_model
    load_model()

    print("[Startup] Loading datasets...")
    from services.data_service import load_datasets
    load_datasets()

    print("[Startup] CricIQ backend ready! 🏏")


# ============================================
# Register new route files (v2 features)
# ============================================
from routes.matches        import router as matches_router
from routes.predict        import router as predict_router
from routes.commentary     import router as commentary_router
from routes.rivalry        import router as rivalry_router
from routes.fantasy        import router as fantasy_router
from routes.delta          import router as delta_router         # Feature 1: Delta Briefing
from routes.catchup        import router as catchup_router       # Feature 2: AI Catch-Up
from routes.pressure       import router as pressure_router      # Feature 3: Pressure Score
from routes.turning_points import router as turning_points_router  # Feature 4: Turning Points

app.include_router(matches_router)
app.include_router(predict_router)
app.include_router(commentary_router)
app.include_router(rivalry_router)
app.include_router(fantasy_router)
app.include_router(delta_router)
app.include_router(catchup_router)
app.include_router(pressure_router)
app.include_router(turning_points_router)

# ============================================
# Keep old routers from Phase 1 (backward compat)
# ============================================
from routers.win_probability import router as old_win_prob_router
from routers.narrator        import router as old_narrator_router
from routers.delta           import router as old_delta_router
from routers.turning_points  import router as old_turning_points_router
from routers.prediction_game import router as old_prediction_game_router
from routers.debrief         import router as old_debrief_router

app.include_router(old_win_prob_router)
app.include_router(old_narrator_router)
app.include_router(old_delta_router)
app.include_router(old_turning_points_router)
app.include_router(old_prediction_game_router)
app.include_router(old_debrief_router)

# ============================================
# Health check routes
# ============================================
@app.get("/")
def root():
    return {"message": "CricIQ API v2.0 🏏", "docs": "/docs", "health": "/health"}

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}

# ============================================
# Socket.io — wrap FastAPI with socketio ASGI
# Adds WebSocket support at /ws/socket.io
# ============================================
import socketio
from websocket.match_socket import sio

# socket_app handles BOTH HTTP (FastAPI) and WebSocket (Socket.io)
# on the same port (8000)
socket_app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=app,
    socketio_path='/ws/socket.io',
)

# ============================================
# HOW TO RUN (always use socket_app):
#   cd backend
#   uvicorn main:socket_app --reload --port 8000
# ============================================
