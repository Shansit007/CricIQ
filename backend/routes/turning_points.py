# ============================================
# routes/turning_points.py — Chess-Style Turning Points
# POST /api/turning-points — identifies the 3 moments
# where the match actually turned, with counterfactual analysis
# ============================================

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api", tags=["turning_points"])


class TurningPointsRequest(BaseModel):
    batting_team: str = "CSK"
    bowling_team: str = "MI"
    target:       int = 180
    final_score:  int = 165
    result:       str = "MI won by 15 runs"  # match result
    # Optional: list of over-by-over scores for more accurate analysis
    over_scores: Optional[list[int]] = None


@router.post("/turning-points")
async def get_turning_points(body: TurningPointsRequest):
    """
    Identifies the 3 turning points of a match + counterfactual analysis.
    ("If this catch wasn't dropped, win probability was 71%")

    In production: feed the ball-by-ball win probability curve and find
    the 3 biggest swings. For now: intelligent mock based on match result.
    """

    # ---- Generate realistic over-by-over win probability ----
    # Start at 50/50, drift based on match result
    import math, random

    total_overs = 20
    batting_won = body.final_score >= body.target   # did batting team win?

    # Build a simulated win probability curve
    # Starts at 50%, trends toward final result
    wp_curve = []
    for over in range(total_overs + 1):
        progress = over / total_overs
        # Sigmoid-ish drift toward result
        base = 0.5 + (0.4 if batting_won else -0.4) * (progress ** 1.5)
        noise = random.uniform(-0.08, 0.08) * (1 - progress)   # less noise near end
        wp = min(0.97, max(0.03, base + noise))
        wp_curve.append(round(wp, 3))

    # ---- Find 3 biggest swings in the curve ----
    swings = []
    for i in range(1, len(wp_curve)):
        swing = abs(wp_curve[i] - wp_curve[i - 1])
        swings.append((swing, i, wp_curve[i - 1], wp_curve[i]))

    swings.sort(reverse=True)   # biggest swings first
    top3 = sorted(swings[:3], key=lambda x: x[1])   # sort back by over number

    # ---- Build turning point objects ----
    turning_points = []

    event_templates = {
        "wicket": [
            "{team}'s key batter dismissed for {runs} — momentum shifted instantly",
            "Critical wicket! {team} lost their set batter at the worst possible time",
            "Crucial breakthrough — {team} lost their in-form batter",
        ],
        "boundary_cluster": [
            "{team} hit 3 boundaries in 4 balls — completely changed the equation",
            "Back-to-back sixes turned the match on its head",
            "Explosive over — {team} scored 18 runs to shift pressure",
        ],
        "maiden": [
            "Tight over — only 3 runs — pressure mounted massively",
            "Brilliant over from {bowler} choked the run flow completely",
            "Maiden over at a critical juncture — game-changing moment",
        ],
        "drop_catch": [
            "Dropped catch! {batter} went on to score 30 more runs",
            "Reprieve in the field — cost {team} the match",
            "Easy catch put down — turned the tide completely",
        ],
    }

    import random
    event_types = ["wicket", "boundary_cluster", "maiden", "drop_catch"]
    bowler_names = ["Bumrah", "Chahal", "Pandya"]
    batter_names = ["Rohit", "Kohli", "Dhoni", "Jadeja"]

    for rank, (swing, over_num, prev_wp, curr_wp) in enumerate(top3):
        direction = "↑" if curr_wp > prev_wp else "↓"
        favors    = body.batting_team if curr_wp > 0.5 else body.bowling_team

        event_type = random.choice(event_types)
        template   = random.choice(event_templates[event_type])

        # Fill template placeholders
        description = template.format(
            team   = favors,
            runs   = random.randint(20, 55),
            bowler = random.choice(bowler_names),
            batter = random.choice(batter_names),
        )

        # Counterfactual — "what if this didn't happen"
        alt_wp = round(prev_wp + (prev_wp - curr_wp) * 0.7, 3)  # reverse the swing 70%
        alt_wp = min(0.97, max(0.03, alt_wp))

        counterfactual_team = body.bowling_team if curr_wp > prev_wp else body.batting_team
        counterfactual = (
            f"If this didn't happen, {counterfactual_team}'s win probability "
            f"would have been {round(alt_wp * 100)}% instead of {round(curr_wp * 100)}%"
        )

        turning_points.append({
            "rank":          rank + 1,
            "over":          over_num,
            "label":         f"Over {over_num}",
            "event_type":    event_type,
            "description":   description,
            "prob_before":   round(prev_wp * 100),
            "prob_after":    round(curr_wp * 100),
            "swing":         round(swing * 100),
            "direction":     direction,
            "favors":        favors,
            "counterfactual": counterfactual,
        })

    return {
        "batting_team":   body.batting_team,
        "bowling_team":   body.bowling_team,
        "result":         body.result,
        "turning_points": turning_points,
        "wp_curve":       wp_curve,          # full 20-over probability curve for chart
        "final_wp":       wp_curve[-1],
    }
