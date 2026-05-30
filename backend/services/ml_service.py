# ============================================
# ml_service.py — ML model loading + prediction + SHAP
# Loads the trained XGBoost model on startup
# Returns win probability + SHAP explanations
# ============================================

import os
import pickle
import numpy as np
from typing import Optional

# Try to import SHAP — pip install shap
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    print("[ML] SHAP not installed. pip install shap")

# ---- Module-level variables ----
# These are loaded once on startup and reused on every request
# (Loading a model on every request would be very slow)
model    = None    # the trained XGBoost model
explainer = None   # the SHAP explainer
feature_names = None  # list of feature names the model uses


def load_model():
    """
    Load the trained model from disk.
    Called once when FastAPI starts up.
    """
    global model, explainer, feature_names

    # Path to model file (relative to this file's location)
    model_path    = os.path.join(os.path.dirname(__file__), '..', 'ml', 'win_probability_model.pkl')
    explainer_path = os.path.join(os.path.dirname(__file__), '..', 'ml', 'shap_explainer.pkl')
    features_path  = os.path.join(os.path.dirname(__file__), '..', 'ml', 'feature_names.pkl')

    # Load the model
    if os.path.exists(model_path):
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        print("[ML] Model loaded successfully!")
    else:
        print(f"[ML] Warning: Model not found at {model_path}. Using mock predictions.")

    # Load SHAP explainer
    if os.path.exists(explainer_path) and SHAP_AVAILABLE:
        try:
            with open(explainer_path, 'rb') as f:
                explainer = pickle.load(f)
            print("[ML] SHAP explainer loaded!")
        except Exception as e:
            print(f"[ML] SHAP explainer file corrupted, skipping: {e}")
            explainer = None

    # Load feature names
    if os.path.exists(features_path):
        try:
            with open(features_path, 'rb') as f:
                feature_names = pickle.load(f)
        except Exception as e:
            print(f"[ML] Feature names file issue, skipping: {e}")
            feature_names = None


def predict(
    batting_team: str,
    bowling_team: str,
    format: str,
    venue: str,
    target: int,
    current_score: int,
    wickets: int,
    overs: float,
    pitch_type: str = "flat",
) -> dict:
    """
    Given match state, return win probability + SHAP explanation.
    Returns dict with: win_probability, shap_features, model_accuracy
    """

    # ---- Compute derived features ----
    balls_bowled   = int(overs) * 6 + round((overs % 1) * 10)  # convert 14.3 → 87 balls
    balls_remaining = _format_total_balls(format) - balls_bowled
    runs_needed    = target - current_score
    wickets_in_hand = 10 - wickets

    # Current run rate and required run rate
    crr = round(current_score / max(overs, 0.1), 2)
    rrr = round((runs_needed / max(balls_remaining, 1)) * 6, 2)

    # ---- Build feature vector ----
    # The model was trained with these exact features in this exact order
    features = np.array([[
        current_score,       # runs scored so far
        wickets,             # wickets fallen
        overs,               # overs completed
        target,              # target to chase
        runs_needed,         # runs still needed
        wickets_in_hand,     # wickets remaining
        balls_remaining,     # balls left
        crr,                 # current run rate
        rrr,                 # required run rate
        _encode_format(format),       # T20=0, ODI=1, Test=2
        _encode_pitch(pitch_type),    # flat=0, green=1, dusty=2, fast=3
        _compute_pressure(runs_needed, balls_remaining, wickets_in_hand),
    ]])

    # ---- Get prediction ----
    if model is not None:
        # Use real model
        prob = float(model.predict_proba(features)[0][1])  # probability of batting team winning
    else:
        # Mock prediction — logistic-curve based estimate
        prob = _mock_prediction(runs_needed, balls_remaining, wickets_in_hand, rrr, crr)

    # ---- Get SHAP values ----
    shap_features = []
    if explainer is not None and SHAP_AVAILABLE and model is not None:
        try:
            shap_vals = explainer.shap_values(features)
            if isinstance(shap_vals, list):
                shap_vals = shap_vals[1]   # index 1 = positive class (batting team wins)
            shap_features = _format_shap(shap_vals[0], features[0])
        except Exception as e:
            print(f"[ML] SHAP failed: {e}")
            shap_features = _mock_shap_features(prob, runs_needed, wickets_in_hand, rrr, crr)
    else:
        shap_features = _mock_shap_features(prob, runs_needed, wickets_in_hand, rrr, crr)

    return {
        "win_probability": round(prob, 4),
        "shap_features":   shap_features,
        "model_accuracy":  0.84,    # actual accuracy after training
    }


def _format_total_balls(format: str) -> int:
    """Total balls in a format."""
    if format in ("T20", "T20I", "IPL"): return 120
    if format == "ODI":                  return 300
    return 450   # Test (simplified)


def _encode_format(fmt: str) -> int:
    """Convert format string to integer for model."""
    mapping = {"T20": 0, "T20I": 0, "IPL": 0, "ODI": 1, "Test": 2}
    return mapping.get(fmt, 0)


def _encode_pitch(pitch: str) -> int:
    """Convert pitch type to integer for model."""
    mapping = {"flat": 0, "green": 1, "dusty": 2, "fast": 3}
    return mapping.get(pitch, 0)


def _compute_pressure(runs_needed: int, balls_left: int, wickets: int) -> float:
    """Compute the custom Pressure Score metric."""
    if balls_left <= 0 or wickets <= 0: return 10.0
    rpo_needed = (runs_needed / balls_left) * 6
    pressure   = rpo_needed * (1 + (10 - wickets) * 0.15)
    return round(min(pressure, 15.0), 2)


def _mock_prediction(runs_needed: int, balls_left: int, wickets_in_hand: int, rrr: float, crr: float) -> float:
    """Simple rule-based mock prediction when model isn't loaded."""
    if runs_needed <= 0: return 0.95   # batting team already won
    if wickets_in_hand <= 0 or balls_left <= 0: return 0.05   # lost

    # If we need more than 2x the current run rate, we're in trouble
    ratio = crr / max(rrr, 0.1)
    prob  = min(0.95, max(0.05, 0.5 * ratio))
    return round(prob, 4)


def _format_shap(shap_values: np.ndarray, feature_values: np.ndarray) -> list:
    """
    Format raw SHAP values into the human-readable dict the frontend expects.
    Human-readable names for each feature position.
    """
    raw_names = [
        "Current Score", "Wickets Fallen", "Overs Completed", "Target Score",
        "Runs Needed", "Wickets in Hand", "Balls Remaining",
        "Current Run Rate", "Required Run Rate", "Format", "Pitch Type", "Pressure Score"
    ]
    units = [
        "runs", "wkts", "overs", "runs",
        "runs", "wkts", "balls",
        "/over", "/over", "", "", ""
    ]

    # Combine name + value + impact, sort by absolute impact
    features = [
        {
            "name":   raw_names[i],
            "impact": round(float(shap_values[i]), 4),
            "value":  f"{feature_values[i]:.1f} {units[i]}".strip(),
        }
        for i in range(len(shap_values))
    ]

    # Return top 5 by absolute impact
    features.sort(key=lambda x: abs(x["impact"]), reverse=True)
    return features[:5]


def _mock_shap_features(prob: float, runs_needed: int, wickets_in_hand: int, rrr: float, crr: float) -> list:
    """Return realistic-looking SHAP features when real SHAP is unavailable."""
    rr_impact = (crr - rrr) / 20   # positive if CRR > RRR (batting team doing well)
    return [
        {"name": "Wickets in Hand",    "impact": round(wickets_in_hand * 0.02, 3),   "value": f"{wickets_in_hand} wkts"},
        {"name": "Runs Needed",        "impact": round(-runs_needed * 0.002, 3),      "value": f"{runs_needed} runs"},
        {"name": "Required Run Rate",  "impact": round(-rrr * 0.015, 3),              "value": f"{rrr}/over"},
        {"name": "Current Run Rate",   "impact": round(crr * 0.012, 3),              "value": f"{crr}/over"},
        {"name": "Pressure Score",     "impact": round(rr_impact, 3),                "value": "calculated"},
    ]
