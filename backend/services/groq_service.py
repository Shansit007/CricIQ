# ============================================
# groq_service.py — Groq AI commentary engine
# Uses Llama 3.3 70B for ball-by-ball commentary
# Free tier — no credit card needed
# ============================================

import os
import random
from typing import Optional

# groq is the official Groq Python SDK — pip install groq
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("[Groq] groq package not installed. pip install groq")

# ---- Pre-written commentary pool (50 lines) ----
# We use these on balls where we DON'T call Groq (every 2nd ball)
# This saves our free tier quota (prevents >500 calls/day)
COMMENTARY_POOL = [
    "Dot ball — the pressure builds!",
    "Played and missed! The bat was nowhere near that one.",
    "Pushed into the gap for a single. Running hard between the wickets.",
    "A quiet over building — the asking rate ticks up.",
    "The bowler is finding good length here. Nothing easy to hit.",
    "Defends solidly — test of temperament.",
    "Just clipped off the pads — they've taken the single.",
    "Good running between the wickets. Smart cricket.",
    "Angled across, no stroke offered — disciplined bowling.",
    "The batsman is reading the length early.",
    "Nipped back off the seam — kept out by the batter!",
    "Through mid-off for one! Easy pickings.",
    "That's two runs — quick between the wickets.",
    "Third man in the deep — they settle for a single.",
    "Lovely footwork, pushed down the ground for a single.",
    "This match is on a knife edge right now.",
    "Brilliant placement — splits the field perfectly.",
    "The fielder cuts it off — only one run.",
    "Driven hard but straight to the fielder.",
    "Sharp reflexes from the fielder at mid-on!",
    "Just short of the boundary — the fielder did well.",
    "Picked the gap — easy two runs.",
    "That's the over! Tight bowling.",
    "The required run rate keeps climbing.",
    "A full toss — put away for an easy single.",
    "Outside off, left alone — good technique.",
    "Bouncer! Well ducked by the batter.",
    "Swing and a miss — the bowler celebrates!",
    "Punched off the back foot for two.",
    "The bowling is keeping this match very much alive.",
    "Just wide of the fielder — they'll run two.",
    "Flicked off the legs for a comfortable single.",
    "Mid-wicket rushes in — only one allowed.",
    "Full and wide — no shot offered.",
    "The crowd is tense. You can feel it.",
    "Driven through the covers — well placed, one run.",
    "Both batters are talking in the middle. Strategy session.",
    "Back of a length — rocked onto the back foot.",
    "Edged and safe! Through the slips for two.",
    "Played watchfully — this is a measured innings.",
    "That's three — excellent running!",
    "Called for a run but sent back — close call!",
    "The fielder dives to his right — saves two!",
    "Back of a length, kept out — good defence.",
    "Flighted up, pushed back firmly.",
    "The partnership is ticking along nicely.",
    "Dug in short — pulled away to square leg for two.",
    "Every run is precious at this stage.",
    "The seamer is getting some movement off the surface.",
    "Brilliant fielding — the throw was like a rifle shot.",
]

# Counter to decide when to call Groq vs use pool
# We call Groq every 3rd ball — saves free tier quota
_ball_counter: dict = {}   # key: match_id, value: count


async def get_commentary(
    match_id: str,
    batting_team: str,
    bowling_team: str,
    over: int,
    ball: int,
    runs_needed: int,
    wickets_left: int,
    current_rr: float,
    required_rr: float,
    last_3_balls: list,
    win_probability: float,
    ball_result: str,
) -> dict:
    """
    Get commentary for a ball.
    Returns {"commentary": "...", "is_ai": True/False}

    Strategy:
    - Every 3rd ball: call Groq for AI commentary
    - Other balls: pick randomly from COMMENTARY_POOL
    - On wickets and sixes: always call Groq (special moments!)
    """

    # Track how many balls we've done for this match
    count = _ball_counter.get(match_id, 0) + 1
    _ball_counter[match_id] = count

    # Always call AI for wickets and sixes (dramatic moments)
    is_special = ball_result in ["W", "6"]

    # Call AI every 3rd ball OR on special deliveries
    should_call_ai = is_special or (count % 3 == 0)

    if should_call_ai and GROQ_AVAILABLE and os.getenv("GROQ_API_KEY"):
        try:
            commentary = await _call_groq(
                batting_team, bowling_team, over, ball,
                runs_needed, wickets_left, current_rr, required_rr,
                last_3_balls, win_probability, ball_result
            )
            return {"commentary": commentary, "is_ai": True}
        except Exception as e:
            print(f"[Groq] API call failed: {e}")
            # Fall through to pool commentary on error

    # Use pre-written pool — pick contextually if possible
    commentary = _pick_contextual_commentary(ball_result, runs_needed, wickets_left, win_probability)
    return {"commentary": commentary, "is_ai": False}


async def _call_groq(
    batting_team: str, bowling_team: str,
    over: int, ball: int,
    runs_needed: int, wickets_left: int,
    current_rr: float, required_rr: float,
    last_3_balls: list,
    win_probability: float,
    ball_result: str,
) -> str:
    """
    Call Groq API with Llama 3.3 70B to generate one commentary line.
    Max 20 words, dramatic and specific.
    """
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    # System prompt — tells the model its persona
    system_prompt = (
        "You are a passionate cricket commentator like Harsha Bhogle. "
        "Generate ONE punchy commentary line (max 20 words) for this exact "
        "match situation. Be dramatic and specific to the numbers given. "
        "Vary your style — sometimes poetic, sometimes statistical, sometimes emotional. "
        "Return ONLY the commentary text, nothing else."
    )

    # User prompt — specific to this exact ball
    last_3_str = ", ".join(last_3_balls) if last_3_balls else "unknown"
    user_prompt = (
        f"{batting_team} need {runs_needed} runs to win. "
        f"{wickets_left} wickets in hand. "
        f"Over {over + 1}, ball {ball}. "
        f"CRR: {current_rr:.1f}, RRR: {required_rr:.1f}. "
        f"Last 3 balls: {last_3_str}. "
        f"This ball: {ball_result}. "
        f"Win probability: {round(win_probability * 100)}%. "
        f"Generate commentary."
    )

    # Make the API call
    # model = llama-3.3-70b-versatile — Groq's best free model
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        max_tokens=50,        # we only need ~20 words
        temperature=0.8,      # 0.8 = creative but not random
    )

    # Extract the text from the response
    return response.choices[0].message.content.strip()


def _pick_contextual_commentary(
    ball_result: str,
    runs_needed: int,
    wickets_left: int,
    win_probability: float,
) -> str:
    """Pick a semi-relevant commentary line from the pre-written pool."""
    # For wickets — always use a dramatic line
    if ball_result == "W":
        wicket_lines = [
            "BOWLED HIM! The stumps are shattered!",
            "OUT! The fielder takes a stunning catch!",
            "GONE! The pressure got to him in the end.",
            "WICKET! What a time to get him out!",
            "Clean bowled! That one was unplayable.",
        ]
        return random.choice(wicket_lines)

    # For sixes
    if ball_result == "6":
        six_lines = [
            "SIX! That's out of the stadium! Magnificent hitting!",
            "MAXIMUM! The crowd erupts as it sails over the boundary!",
            "Six! He's picked up that length early and absolutely murdered it!",
            "That's gone all the way! What a shot under pressure!",
        ]
        return random.choice(six_lines)

    # For fours
    if ball_result == "4":
        four_lines = [
            "FOUR! Raced away to the boundary!",
            "Beautiful timing — that's pierced the gap perfectly!",
            "Four! The outfield is lightning fast today.",
        ]
        return random.choice(four_lines)

    # Generic
    return random.choice(COMMENTARY_POOL)
