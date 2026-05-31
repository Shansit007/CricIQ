# ============================================
# routes/catchup.py — AI Catch-Up Narrator
# POST /api/catchup — Groq generates a 30-second
# English catch-up like a friend explaining the match
# ============================================

from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
import os, random

# Groq client (same one used in commentary)
try:
    from groq import Groq
    _client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
    GROQ_OK = bool(os.getenv("GROQ_API_KEY"))
except Exception:
    _client  = None
    GROQ_OK  = False

router = APIRouter(prefix="/api", tags=["catchup"])


class CatchupRequest(BaseModel):
    match_id:     str   = "mock_match_1"
    last_checked: str   = ""          # ISO timestamp
    batting_team: str   = "CSK"
    bowling_team: str   = "MI"
    # current match state (frontend passes this in)
    current_score:   int   = 120
    current_wickets: int   = 4
    current_overs:   float = 14.2
    target:          int   = 180
    top_scorer:      str   = "Rohit Sharma (52)"
    top_wicket:      str   = "Bumrah (2/18)"


@router.post("/catchup")
async def get_catchup(body: CatchupRequest):
    """
    Returns a 30-second natural English catch-up narration.
    Uses Groq AI if key is available; otherwise uses a rich mock.
    """

    # ---- Calculate time away ----
    try:
        # Fix: JavaScript ISO strings end in 'Z', Python needs '+00:00'
        clean_ts = body.last_checked.replace('Z', '+00:00')
        last_dt  = datetime.fromisoformat(clean_ts)
        from datetime import timezone
        now = datetime.now(timezone.utc)
        minutes_away = max(1, int((now - last_dt).total_seconds() / 60))
    except Exception as e:
        print(f"[Catchup] Timestamp parse error: {e}")
        minutes_away = 45

    runs_needed    = body.target - body.current_score
    balls_remaining = int((20 - body.current_overs) * 6)

    # ---- Build Groq prompt ----
    prompt = f"""You are a cricket-obsessed college friend catching up your buddy who was studying.
Be casual, excited, and explain in EXACTLY 4-5 short sentences (30 seconds to read).
No bullet points. Natural speech only.

Match situation:
- {body.batting_team} vs {body.bowling_team} (T20)
- Score: {body.current_score}/{body.current_wickets} after {body.current_overs} overs
- Target: {body.target} — needs {runs_needed} from {balls_remaining} balls
- Top scorer: {body.top_scorer}
- Best bowler: {body.top_wicket}
- You were away: {minutes_away} minutes

Start with "Bro," and give the match situation like you're in a college canteen."""

    # ---- Try Groq ----
    narration = None
    if GROQ_OK and _client:
        try:
            response = _client.chat.completions.create(
                model    = "llama-3.3-70b-versatile",  # free Groq model
                messages = [{"role": "user", "content": prompt}],
                max_tokens = 200,
                temperature = 0.85,
            )
            narration = response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[Catchup] Groq failed: {e}")

    # ---- Fallback narration pool (used when Groq is unavailable) ----
    if not narration:
        rr_needed = round((runs_needed / max(balls_remaining, 1)) * 6, 1)
        templates = [
            f"Bro, you missed a crazy {minutes_away} minutes! {body.batting_team} need {runs_needed} off {balls_remaining} balls — it's getting tight. {body.top_scorer} was batting brilliantly but then fell. {body.top_wicket} has been wrecking the lineup. Required rate is {rr_needed} — totally possible but pressure is building!",
            f"Bro, listen — {body.batting_team} are at {body.current_score}/{body.current_wickets} after {body.current_overs} overs. They need {runs_needed} more from {balls_remaining} balls to chase {body.target}. {body.top_scorer} top-scored for them. {body.top_wicket} is the pick of the bowlers. This match is actually hanging in the balance right now!",
            f"Dude, you picked the worst time to study! {body.batting_team} are chasing {body.target} and they need {runs_needed} off the last {balls_remaining} balls — RRR is {rr_needed}. {body.top_scorer} gave a good start. {body.bowling_team}'s {body.top_wicket} has been absolute fire. This one could go either way!",
        ]
        narration = random.choice(templates)

    return {
        "narration":     narration,
        "minutes_away":  minutes_away,
        "runs_needed":   runs_needed,
        "balls_remaining": balls_remaining,
        "current_state": {
            "score":   f"{body.current_score}/{body.current_wickets}",
            "overs":   str(body.current_overs),
            "target":  body.target,
        },
        "groq_used": GROQ_OK and narration is not None,
    }
