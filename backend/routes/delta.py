# ============================================
# routes/delta.py — Delta Briefing endpoint
# POST /api/delta — returns only what changed
# since the user's last check-in timestamp
# ============================================

from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/api", tags=["delta"])


# ---- Request body ----
class DeltaRequest(BaseModel):
    match_id: str = "mock_match_1"        # which match to check
    last_checked: str = ""                 # ISO timestamp of user's last check
    batting_team: str = "CSK"
    bowling_team: str = "MI"
    format: str = "T20"


# ---- In-memory "match event log" ----
# In production this would come from the WebSocket ball log
# For now we simulate a realistic T20 innings progression
def _generate_mock_events(minutes_ago: int) -> list[dict]:
    """
    Generate realistic cricket events that happened in the last N minutes.
    1 over ≈ 4 minutes in T20.
    """
    overs_happened = max(1, minutes_ago // 4)   # estimate how many overs passed
    events = []

    # Random wickets (roughly 1 per 6 overs)
    wickets_this_period = random.randint(0, max(1, overs_happened // 5))
    runs_this_period    = random.randint(overs_happened * 5, overs_happened * 12)
    boundaries          = random.randint(1, max(1, overs_happened // 2))
    sixes               = random.randint(0, max(1, overs_happened // 3))

    # Build player events
    batters = [
        ("Rohit Sharma", random.randint(20, 60)),
        ("Virat Kohli",  random.randint(5, 80)),
        ("MS Dhoni",     random.randint(0, 40)),
    ]
    bowlers = [
        ("Bumrah",        random.randint(0, 3)),
        ("Chahal",        random.randint(0, 2)),
        ("Hardik Pandya", random.randint(0, 2)),
    ]

    if wickets_this_period > 0:
        # Pick random batters who got out
        for i in range(min(wickets_this_period, len(batters))):
            batter_name, runs = batters[i]
            bowler_name, _ = random.choice(bowlers)
            events.append({
                "type":    "wicket",
                "summary": f"{batter_name} out for {runs} — b {bowler_name}",
                "impact":  "high",
            })

    events.append({
        "type":    "runs",
        "summary": f"{runs_this_period} runs scored in {overs_happened} over(s)",
        "impact":  "medium",
    })

    if boundaries > 0:
        events.append({
            "type":    "boundary",
            "summary": f"{boundaries} fours, {sixes} sixes hit",
            "impact":  "low",
        })

    return events


@router.post("/delta")
async def get_delta_briefing(body: DeltaRequest):
    """
    Returns a 4-line delta brief of ONLY what changed
    since the user's last check-in timestamp.

    Response shape:
    {
      "minutes_away": 32,
      "events": [...],
      "four_line_brief": ["line1", "line2", "line3", "line4"],
      "current_state": { "score": "...", "overs": "...", ... }
    }
    """

    # ---- Calculate how long the user was away ----
    try:
        # JavaScript sends ISO strings ending in 'Z' (e.g. "2024-01-01T10:00:00.000Z")
        # Python's fromisoformat() can't parse the 'Z' — replace it with '+00:00'
        clean_ts = body.last_checked.replace('Z', '+00:00')
        last_dt  = datetime.fromisoformat(clean_ts)
        # Make utcnow() timezone-aware so subtraction works
        from datetime import timezone
        now = datetime.now(timezone.utc)
        minutes_away = max(1, int((now - last_dt).total_seconds() / 60))
    except Exception as e:
        print(f"[Delta] Timestamp parse error: {e}")
        minutes_away = 30   # default: assume 30 minutes

    # ---- Get events that happened in that window ----
    events = _generate_mock_events(minutes_away)

    # ---- Build the 4-line brief ----
    # Line 1: Time summary
    line1 = f"⏱ You were away for ~{minutes_away} minutes ({minutes_away // 4} overs played)"

    # Line 2: Wickets (most important)
    wicket_events = [e for e in events if e["type"] == "wicket"]
    if wicket_events:
        wkt_text = " | ".join(e["summary"] for e in wicket_events)
        line2 = f"🎯 Wickets: {wkt_text}"
    else:
        line2 = "🎯 Wickets: None fell — batting team steady"

    # Line 3: Runs scored
    runs_event = next((e for e in events if e["type"] == "runs"), None)
    line3 = f"📊 Runs: {runs_event['summary']}" if runs_event else "📊 Runs: No change"

    # Line 4: Boundaries / highlights
    boundary_event = next((e for e in events if e["type"] == "boundary"), None)
    line4 = f"💥 Highlights: {boundary_event['summary']}" if boundary_event else "💥 Highlights: Quiet period — tight bowling"

    # ---- Mock current state ----
    # In production: fetch from live WebSocket state
    current_score  = random.randint(80, 160)
    current_wickets = random.randint(1, 6)
    current_overs   = round(random.uniform(8.0, 18.0), 1)

    return {
        "minutes_away":   minutes_away,
        "events":         events,
        "four_line_brief": [line1, line2, line3, line4],
        "current_state": {
            "score":   f"{body.batting_team}: {current_score}/{current_wickets}",
            "overs":   f"{current_overs} overs",
            "vs":      body.bowling_team,
            "format":  body.format,
        },
    }
