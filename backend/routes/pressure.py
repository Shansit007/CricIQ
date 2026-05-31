# ============================================
# routes/pressure.py — Pressure Score Alerts
# POST /api/pressure — computes Shansit's custom
# Pressure Score metric and returns alert level
# ============================================
#
# Pressure Score = f(runs_needed, balls_left, wickets_in_hand,
#                    batter_strike_rate, bowler_economy, match_phase)
#
# This is a NOVEL metric invented for CricIQ — great to explain in interviews!

from fastapi import APIRouter
from pydantic import BaseModel
import math

router = APIRouter(prefix="/api", tags=["pressure"])


class PressureRequest(BaseModel):
    # Core match state
    runs_needed:       int   = 45
    balls_remaining:   int   = 30
    wickets_in_hand:   int   = 4
    # Batter + bowler current form
    batter_strike_rate: float = 130.0    # e.g. 130 = 130 runs per 100 balls
    bowler_economy:     float = 8.5      # e.g. 8.5 runs per over
    # Match phase: "powerplay", "middle", "death"
    match_phase:        str   = "death"
    # Optional context
    batting_team:       str   = "CSK"
    bowling_team:       str   = "MI"


def compute_pressure_score(
    runs_needed: int,
    balls_remaining: int,
    wickets_in_hand: int,
    batter_sr: float,
    bowler_economy: float,
    match_phase: str,
) -> dict:
    """
    Computes the CricIQ Pressure Score.

    Formula breakdown (explained for interviews):
    1. Base pressure = (runs needed per ball) * 6  → required run rate
    2. Wicket multiplier = more wickets lost = more pressure
    3. Batter efficiency = if batter SR > required, pressure reduces
    4. Phase multiplier = death overs have higher stakes
    5. Bowler threat = high economy bowler = less pressure on batting side

    Score range: 0 (no pressure) to 15 (maximum pressure)
    """

    if balls_remaining <= 0 or wickets_in_hand <= 0:
        return {"score": 15.0, "level": "CRITICAL", "message": "Match over!"}

    # ---- Step 1: Required run rate ----
    # runs_needed / balls_remaining * 6 → per over
    rrr = (runs_needed / balls_remaining) * 6

    # ---- Step 2: Base pressure = RRR normalized ----
    # At RRR=6 → average pressure; at 12+ → extreme
    base_pressure = rrr / 2   # scale: RRR 12 → base 6

    # ---- Step 3: Wicket multiplier ----
    # Fewer wickets in hand = exponentially more pressure
    # 10 wickets in hand → multiplier 1.0; 1 wicket → multiplier 2.0
    wicket_multiplier = 1 + (10 - wickets_in_hand) * 0.12

    # ---- Step 4: Batter efficiency adjustment ----
    # Required SR = runs_needed / balls_remaining * 100
    required_sr = (runs_needed / balls_remaining) * 100
    # If batter SR > required SR → pressure is lower (they can handle it)
    # If batter SR < required SR → pressure is higher
    efficiency_ratio = batter_sr / max(required_sr, 1)
    batter_adjustment = 1 / max(efficiency_ratio, 0.5)  # caps pressure reduction

    # ---- Step 5: Phase multiplier ----
    # Death overs: every ball matters more
    phase_multipliers = {
        "powerplay": 0.85,   # early game, less pressure usually
        "middle":    1.00,   # normal
        "death":     1.25,   # high stakes
    }
    phase_mult = phase_multipliers.get(match_phase, 1.0)

    # ---- Step 6: Bowler threat ----
    # Economy 6 = very tight, 12 = very expensive
    # High economy = batting team less pressured (easy runs)
    bowler_factor = 1 - (bowler_economy - 6) * 0.03   # small adjustment

    # ---- Final score ----
    score = base_pressure * wicket_multiplier * batter_adjustment * phase_mult * bowler_factor
    score = round(min(15.0, max(0.0, score)), 2)   # clamp to 0–15

    # ---- Level classification ----
    if score >= 10:
        level   = "CRITICAL"
        emoji   = "🔥"
        message = f"CRITICAL MOMENT! {score:.1f}/15 — This ball could decide the match!"
        color   = "#FF4B4B"
    elif score >= 7:
        level   = "HIGH"
        emoji   = "⚡"
        message = f"High pressure! {score:.1f}/15 — Batting team struggling to keep up."
        color   = "#F4A703"
    elif score >= 4:
        level   = "MEDIUM"
        emoji   = "📊"
        message = f"Building pressure. {score:.1f}/15 — Match is evenly poised."
        color   = "#00D4FF"
    else:
        level   = "LOW"
        emoji   = "😌"
        message = f"Low pressure. {score:.1f}/15 — Batting team in comfortable position."
        color   = "#22C55E"

    return {
        "score":             score,
        "level":             level,
        "emoji":             emoji,
        "message":           message,
        "color":             color,
        "formula_breakdown": {
            "required_run_rate":   round(rrr, 2),
            "base_pressure":       round(base_pressure, 2),
            "wicket_multiplier":   round(wicket_multiplier, 2),
            "batter_efficiency":   round(batter_adjustment, 2),
            "phase_multiplier":    phase_mult,
            "bowler_factor":       round(bowler_factor, 2),
        }
    }


@router.post("/pressure")
async def get_pressure_score(body: PressureRequest):
    """
    Compute Pressure Score for current match state.
    Returns: score (0–15), level, message, formula breakdown.
    The formula breakdown is great for the interview — shows exactly
    how each variable contributes.
    """
    result = compute_pressure_score(
        runs_needed      = body.runs_needed,
        balls_remaining  = body.balls_remaining,
        wickets_in_hand  = body.wickets_in_hand,
        batter_sr        = body.batter_strike_rate,
        bowler_economy   = body.bowler_economy,
        match_phase      = body.match_phase,
    )

    return {
        **result,
        "batting_team":  body.batting_team,
        "bowling_team":  body.bowling_team,
        "input_used": {
            "runs_needed":       body.runs_needed,
            "balls_remaining":   body.balls_remaining,
            "wickets_in_hand":   body.wickets_in_hand,
            "batter_sr":         body.batter_strike_rate,
            "bowler_economy":    body.bowler_economy,
            "match_phase":       body.match_phase,
        }
    }
