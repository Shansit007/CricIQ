# ============================================
# routes/rivalry.py — Rivalry intelligence endpoint
# GET /api/rivalry?team1=India&team2=Australia&format=T20I
# ============================================

from fastapi import APIRouter, HTTPException, Query
from services.data_service import get_rivalry_stats

router = APIRouter(prefix="/api", tags=["rivalry"])


@router.get("/rivalry")
async def rivalry(
    team1:  str = Query(..., description="First team name"),
    team2:  str = Query(..., description="Second team name"),
    format: str = Query("T20I", description="Match format: T20I, ODI, Test, IPL"),
):
    """
    Get head-to-head rivalry statistics between two teams.
    Returns win counts, year-by-year trends, top performers, and greatest match.
    """
    if team1 == team2:
        raise HTTPException(status_code=400, detail="Teams must be different")

    try:
        stats = get_rivalry_stats(team1, team2, format)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
