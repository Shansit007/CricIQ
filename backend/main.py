# ============================================
# main.py — CricIQ FastAPI Backend Entry Point
# This is the main file that starts our server
# ============================================

# FastAPI is our web framework — like Express in Node.js
from fastapi import FastAPI

# CORSMiddleware allows our React frontend to talk to this backend
from fastapi.middleware.cors import CORSMiddleware

# load_dotenv reads our .env file and loads the keys
from dotenv import load_dotenv

# os helps us read environment variables
import os

# Load all keys from .env file into memory
load_dotenv()

# Create the FastAPI app — this is our server
app = FastAPI(
    title="CricIQ API",           # name of our API
    description="AI-powered cricket intelligence backend",
    version="1.0.0"
)

# Allow React frontend to talk to this backend
# Without this, browser blocks the connection
app.add_middleware(
    CORSMiddleware,
    # allow_origins = which websites can talk to us
    allow_origins=[
        "http://localhost:5173",   # React dev server
        "http://localhost:3000",   # alternate React port
        os.getenv("FRONTEND_URL", "*")  # production URL
    ],
    allow_credentials=True,   # allow cookies
    allow_methods=["*"],      # allow all HTTP methods
    allow_headers=["*"],      # allow all headers
)

# Basic health check route
# When someone visits /health, server says it's alive
@app.get("/health")
def health_check():
    return {
        "status": "CricIQ backend is running! 🏏",
        "version": "1.0.0"
    }

# Root route
@app.get("/")
def root():
    return {
        "message": "Welcome to CricIQ API",
        "docs": "/docs",        # FastAPI auto-generates docs here
        "health": "/health"
    }

# ============================================
# Import and connect all routers
# Each router handles one feature of CricIQ
# ============================================

# Import win probability router
from routers.win_probability import router as win_probability_router

# Connect router to main app
# Now /api/win-probability/predict will work!
app.include_router(win_probability_router)

# Import narrator router
from routers.narrator import router as narrator_router

# Connect narrator router
app.include_router(narrator_router)

# Import Delta Brief™ router — Feature 1
from routers.delta import router as delta_router

# Connect Delta Brief router
# Routes: /api/delta/matches, /api/delta/start-session, /api/delta/brief/{id}
app.include_router(delta_router)

# Import Turning Points router — Feature 5
from routers.turning_points import router as turning_points_router

# Connect Turning Points router
# Routes: /api/turning-points/matches, /api/turning-points/analyze/{match_id}
app.include_router(turning_points_router)

# Import Prediction Game router — Feature 6
from routers.prediction_game import router as prediction_game_router

# Connect Prediction Game router
# Routes: /api/game/matches, /api/game/create, /api/game/join, etc.
app.include_router(prediction_game_router)

# Import Post-Match Debrief router — Feature 7
from routers.debrief import router as debrief_router

# Connect Debrief router
# Routes: /api/debrief/matches, /api/debrief/generate/{match_id}
app.include_router(debrief_router)