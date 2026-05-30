# ============================================
# routes/matches.py — Match endpoints
# GET /api/matches/upcoming
# GET /api/matches/live/{match_id}
# ============================================

from fastapi import APIRouter, HTTPException
from services.cricapi_service import get_upcoming_matches
from services.ml_service import predict

# APIRouter groups all match-related endpoints
# prefix means all routes here start with /api/matches
router = APIRouter(prefix="/api/matches", tags=["matches"])


@router.get("/upcoming")
async def upcoming_matches():
    """
    Get all upcoming + live matches.
    Cached for 5 minutes to protect CricAPI free tier.
    Returns list of match objects.
    """
    try:
        matches = await get_upcoming_matches()
        return matches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/live/{match_id}")
async def live_match(match_id: str):
    """
    Get current live state of a specific match.
    Includes win probability from ML model.
    """
    try:
        # Get all matches (cached)
        all_matches = await get_upcoming_matches()

        # Find the specific match by ID
        match = next((m for m in all_matches if m.get('match_id') == match_id), None)

        if not match:
            raise HTTPException(status_code=404, detail=f"Match {match_id} not found")

        # If match is live, compute win probability
        live_score = match.get('live_score')
        win_prob   = 0.5   # default 50-50 if no data

        if live_score:
            try:
                pred = predict(
                    batting_team  = live_score.get('batting_team', 'Team A'),
                    bowling_team  = live_score.get('bowling_team', 'Team B'),
                    format        = match.get('format', 'T20'),
                    venue         = match.get('venue', 'Unknown'),
                    target        = live_score.get('target', 180),
                    current_score = live_score.get('current_score', 0),
                    wickets       = live_score.get('wickets', 0),
                    overs         = float(live_score.get('overs', 0) or 0),
                )
                win_prob = pred['win_probability']
            except Exception as e:
                print(f"[Matches] Win prob failed: {e}")

        return {
            "match_state":     match,
            "win_probability": win_prob,
            "momentum_score":  0.0,   # updated via WebSocket
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
