# ============================================
# win_probability.py — Feature 3: Win Probability + SHAP
# This router handles all win probability requests
# ============================================

# APIRouter lets us organize routes into separate files
from fastapi import APIRouter

# BaseModel lets us define what data we expect
from pydantic import BaseModel

# joblib loads our saved ML model
import joblib

# os helps us build file paths
import os

# numpy for number calculations
import numpy as np

# Create a router — like a mini FastAPI app
router = APIRouter(
    prefix="/api/win-probability",  # all routes start with this
    tags=["Win Probability"]        # groups routes in docs
)

# Build path to our saved model files
# __file__ = current file location
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "ml", "win_probability_model.pkl")
EXPLAINER_PATH = os.path.join(BASE_DIR, "ml", "shap_explainer.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "ml", "feature_names.pkl")

# Load model files when server starts
# These stay in memory so responses are fast
model = joblib.load(MODEL_PATH)
explainer = joblib.load(EXPLAINER_PATH)
features = joblib.load(FEATURES_PATH)

# Define what data this endpoint expects
# BaseModel automatically validates the data
class MatchSituation(BaseModel):
    cum_runs: float        # runs scored so far
    cum_wickets: float     # wickets fallen so far
    balls_remaining: float # balls left
    runs_needed: float     # runs needed to win
    ball_number: float     # current ball number
    target: float          # target score

# SHAP value to plain English translator
def shap_to_english(feature_name, shap_value):
    """Convert SHAP value into human readable cricket language"""
    
    # Dictionary of human friendly explanations
    explanations = {
        "runs_needed": {
            "positive": "Runs needed is manageable ✅",
            "negative": "Too many runs needed 📈"
        },
        "balls_remaining": {
            "positive": "Plenty of balls left ⏰",
            "negative": "Running out of balls ⚡"
        },
        "cum_wickets": {
            "positive": "Good wickets in hand 🏏",
            "negative": "Too many wickets lost 💀"
        },
        "cum_runs": {
            "positive": "Good scoring rate so far 📊",
            "negative": "Scoring rate is slow 🐢"
        },
        "target": {
            "positive": "Target is chaseable 🎯",
            "negative": "Target is very high 🏔️"
        },
        "ball_number": {
            "positive": "Good position in innings 👍",
            "negative": "Behind the required rate 📉"
        }
    }
    
    # Return appropriate explanation based on shap direction
    if feature_name in explanations:
        if shap_value > 0.05:
            return explanations[feature_name]["positive"]
        elif shap_value < -0.05:
            return explanations[feature_name]["negative"]
    return None

# POST endpoint — frontend sends match situation, we return probability
@router.post("/predict")
def predict_win_probability(situation: MatchSituation):
    
    # Convert input to numpy array in correct feature order
    input_data = np.array([[
        situation.cum_runs,
        situation.cum_wickets,
        situation.balls_remaining,
        situation.runs_needed,
        situation.ball_number,
        situation.target
    ]])
    
    # Get win probability from model
    # predict_proba returns [lose_prob, win_prob]
    win_prob = float(model.predict_proba(input_data)[0][1])
    
    # Get SHAP values to explain WHY
    shap_vals = explainer.shap_values(input_data)[0]
    
    # Convert SHAP values to plain English reasons
    reasons = []
    for feat, shap_val in zip(features, shap_vals):
        explanation = shap_to_english(feat, shap_val)
        if explanation:
            reasons.append(explanation)
    
    # Return everything to frontend
    return {
        "win_probability": round(win_prob * 100, 1),  # as percentage
        "lose_probability": round((1 - win_prob) * 100, 1),
        "reasons": reasons[:3],  # top 3 reasons only
        "situation": {
            "runs_needed": situation.runs_needed,
            "balls_remaining": situation.balls_remaining,
            "wickets_fallen": situation.cum_wickets
        }
    }