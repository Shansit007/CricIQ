# ============================================
# routes/predict.py — Win probability prediction
# POST /api/predict — takes match state, returns prob + SHAP
# ============================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel   # Pydantic validates incoming JSON automatically
from services.ml_service import predict as ml_predict
from services.data_service import get_rivalry_stats

router = APIRouter(prefix="/api", tags=["predict"])


# ---- Request body schema ----
# Pydantic model validates the JSON body automatically
# If a required field is missing, FastAPI returns 422 automatically
class PredictRequest(BaseModel):
    batting_team:  str
    bowling_team:  str
    format:        str = "T20"
    venue:         str = "Unknown"
    target:        int = 180
    current_score: int = 0
    wickets:       int = 0
    overs:         float = 0.0
    pitch_type:    str = "flat"


@router.post("/predict")
async def predict_win_probability(body: PredictRequest):
    """
    Predict win probability for the batting team.
    Also returns:
    - SHAP explanation (top 5 features)
    - Historical H2H win rate at venue
    - Model accuracy
    """
    try:
        # Call ML service
        result = ml_predict(
            batting_team  = body.batting_team,
            bowling_team  = body.bowling_team,
            format        = body.format,
            venue         = body.venue,
            target        = body.target,
            current_score = body.current_score,
            wickets       = body.wickets,
            overs         = body.overs,
            pitch_type    = body.pitch_type,
        )

        # Get H2H rivalry stat as a quick context number
        # We get the win% for team1 vs team2 in this format
        try:
            rivalry = get_rivalry_stats(body.batting_team, body.bowling_team, body.format)
            h2h_win_rate = rivalry['win_percentage']['team1'] / 100
        except Exception:
            h2h_win_rate = 0.5   # fallback

        return {
            "win_probability": result["win_probability"],
            "batting_team":    body.batting_team,
            "bowling_team":    body.bowling_team,
            "shap_features":   result["shap_features"],
            "h2h_win_rate":    h2h_win_rate,
            "model_accuracy":  result["model_accuracy"],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
