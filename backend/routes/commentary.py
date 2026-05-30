# ============================================
# routes/commentary.py — AI commentary endpoint
# POST /api/commentary — returns one commentary line
# ============================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from services.groq_service import get_commentary

router = APIRouter(prefix="/api", tags=["commentary"])


# ---- Request body ----
class CommentaryRequest(BaseModel):
    batting_team:    str
    bowling_team:    str
    over:            int
    ball:            int
    runs_needed:     int
    wickets_left:    int
    current_rr:      float
    required_rr:     float
    last_3_balls:    List[str] = []
    win_probability: float
    ball_result:     str       # "0","1","2","4","6","W"
    match_id:        str = "default"


@router.post("/commentary")
async def generate_commentary(body: CommentaryRequest):
    """
    Generate one ball commentary line.
    Returns AI commentary (Groq) every 3rd ball, pre-written otherwise.
    """
    try:
        result = await get_commentary(
            match_id        = body.match_id,
            batting_team    = body.batting_team,
            bowling_team    = body.bowling_team,
            over            = body.over,
            ball            = body.ball,
            runs_needed     = body.runs_needed,
            wickets_left    = body.wickets_left,
            current_rr      = body.current_rr,
            required_rr     = body.required_rr,
            last_3_balls    = body.last_3_balls,
            win_probability = body.win_probability,
            ball_result     = body.ball_result,
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
