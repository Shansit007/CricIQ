# ============================================
# turning_points.py — Feature 5: Chess-Style Turning Points Map
#
# Shows the 3 moments that ACTUALLY decided the match.
# Each turning point has:
#   - What happened (factual)
#   - Win probability shift (before → after)
#   - Chess annotation (♛ Game Changer / ♜ Momentum Shift / ♟ Pressure Point)
#   - Counterfactual: "If this went differently, win prob would have been X%"
#
# FLOW:
#   Frontend picks a match →
#   GET /api/turning-points/analyze/{match_id} →
#   Backend returns pre-defined turning points + Groq narrations
# ============================================

import os           # read environment variables
import json         # parse Groq JSON response
from fastapi import APIRouter, HTTPException   # web framework
from langchain_groq import ChatGroq            # free Groq LLM
from langchain_core.prompts import ChatPromptTemplate   # prompt builder
from dotenv import load_dotenv                 # read .env file

load_dotenv()   # load GROQ_API_KEY from .env

# All routes start with /api/turning-points
router = APIRouter(
    prefix="/api/turning-points",
    tags=["Turning Points"]
)

# ============================================
# GROQ LLM — same free model as other features
# ============================================
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.8,     # slightly creative for natural descriptions
    max_tokens=1200      # need room for 3 turning points + verdict
)

# ============================================
# PRE-DEFINED TURNING POINT DATA
# Each match has exactly 3 turning points.
# We identify WHICH moments mattered — Groq adds the WHY and WHAT IF.
#
# Fields per turning point:
#   over          — when it happened (e.g. 7.3 = over 7, ball 3)
#   event_short   — 1 line factual description of the event
#   event_type    — category of event (affects chess icon color)
#   chess_label   — chess-style annotation label
#   chess_symbol  — chess piece emoji
#   chess_rating  — !! (brilliant) / ! (good) / ? (mistake) / ?? (blunder)
#   team_benefited — which team gained from this moment
#   wp_before     — team1 win probability % BEFORE this moment
#   wp_after      — team1 win probability % AFTER this moment
#   counterfactual_if   — the "if X had happened differently..." premise
#   counterfactual_then — what would have happened as a result
# ============================================
MATCH_TURNING_POINTS = {

    # ===== MI vs CSK =====
    "mi-vs-csk": {
        "match_title": "Mumbai Indians vs Chennai Super Kings",
        "team1": "Mumbai Indians",
        "team2": "Chennai Super Kings",
        "result": "Mumbai Indians won by 23 runs",
        "turning_points": [
            {
                "id": 1,
                "over": 7.3,
                "event_short": "CSK drops Rohit Sharma on 38 at square leg off Jadeja",
                "event_type": "CATCH_DROP",          # type of event
                "chess_label": "Game Changer",
                "chess_symbol": "♛",                  # queen = most powerful piece
                "chess_rating": "??",                 # blunder in chess notation
                "team_benefited": "Mumbai Indians",
                "wp_before": 52,                      # CSK slightly ahead at this point
                "wp_after": 44,                       # MI take control after reprieve
                "counterfactual_if": "If Jadeja had caught Rohit on 38",
                "counterfactual_then": "MI would've been 55/2 stuck in middle overs, CSK win probability shoots to 67%"
            },
            {
                "id": 2,
                "over": 13.1,
                "event_short": "Rohit out for 41, SKY dismissed next over — MI lose 2 in 3 balls",
                "event_type": "WICKET_CLUSTER",
                "chess_label": "Momentum Shift",
                "chess_symbol": "♜",                  # rook = strong but not decisive
                "chess_rating": "!",                  # good play by CSK
                "team_benefited": "Chennai Super Kings",
                "wp_before": 62,
                "wp_after": 52,
                "counterfactual_if": "If MI had preserved both wickets into over 16",
                "counterfactual_then": "MI finishes 195+ comfortably, target becomes nearly impossible for CSK"
            },
            {
                "id": 3,
                "over": 17.1,
                "event_short": "Tim David hits back-to-back sixes off Deshpande — adds 22 in 2 overs",
                "event_type": "BOUNDARY_STORM",
                "chess_label": "Pressure Point",
                "chess_symbol": "♟",                  # pawn = decisive late-game move
                "chess_rating": "!!",                 # brilliant play
                "team_benefited": "Mumbai Indians",
                "wp_before": 56,
                "wp_after": 68,
                "counterfactual_if": "If Deshpande had bowled Tim David for a duck",
                "counterfactual_then": "MI finishes at 155, CSK chase becomes completely comfortable — CSK win probability 72%"
            }
        ]
    },

    # ===== RCB vs KKR =====
    "rcb-vs-kkr": {
        "match_title": "Royal Challengers Bangalore vs Kolkata Knight Riders",
        "team1": "Royal Challengers Bangalore",
        "team2": "Kolkata Knight Riders",
        "result": "Kolkata Knight Riders won by 6 wickets",
        "turning_points": [
            {
                "id": 1,
                "over": 6.2,
                "event_short": "Rajat Patidar run out for 2 — shocking mix-up with Kohli",
                "event_type": "RUN_OUT",
                "chess_label": "Game Changer",
                "chess_symbol": "♛",
                "chess_rating": "??",
                "team_benefited": "Kolkata Knight Riders",
                "wp_before": 50,
                "wp_after": 42,
                "counterfactual_if": "If Patidar had stayed and made his usual 35-40",
                "counterfactual_then": "RCB total reaches 185+, KKR chase becomes extremely difficult — RCB win probability 65%"
            },
            {
                "id": 2,
                "over": 16.3,
                "event_short": "RCB collapse — 3 wickets in 2 overs, Maxwell, Karthik and Lomror all gone",
                "event_type": "COLLAPSE",
                "chess_label": "Momentum Shift",
                "chess_symbol": "♜",
                "chess_rating": "?",
                "team_benefited": "Kolkata Knight Riders",
                "wp_before": 55,
                "wp_after": 38,
                "counterfactual_if": "If RCB's middle order batted out their full 4 overs",
                "counterfactual_then": "RCB posts 185, Ferguson and Starc face a tough last 3 overs — RCB win probability 63%"
            },
            {
                "id": 3,
                "over": 3.4,
                "event_short": "Phil Salt and Narine smash 35 in first 4 overs of KKR chase — powerplay carnage",
                "event_type": "POWERPLAY_ASSAULT",
                "chess_label": "Pressure Point",
                "chess_symbol": "♟",
                "chess_rating": "!!",
                "team_benefited": "Kolkata Knight Riders",
                "wp_before": 42,
                "wp_after": 61,
                "counterfactual_if": "If Siraj had taken Narine in over 2 as he nearly did",
                "counterfactual_then": "KKR chase resets completely — match goes to final over, anyone's game"
            }
        ]
    },

    # ===== GT vs RR =====
    "gt-vs-rr": {
        "match_title": "Gujarat Titans vs Rajasthan Royals",
        "team1": "Gujarat Titans",
        "team2": "Rajasthan Royals",
        "result": "Gujarat Titans won by 18 runs",
        "turning_points": [
            {
                "id": 1,
                "over": 5.2,
                "event_short": "Boult concedes only 18 in 3 overs — tightest opening spell of the tournament",
                "event_type": "BOWLING_SPELL",
                "chess_label": "Game Changer",
                "chess_symbol": "♛",
                "chess_rating": "!!",
                "team_benefited": "Gujarat Titans",
                "wp_before": 50,
                "wp_after": 57,
                "counterfactual_if": "If Boult had gone for 35 in his opening spell like most pacers",
                "counterfactual_then": "GT powerplay at 55+, Gill accelerates earlier, total reaches 190 — but also gives RR momentum in the chase"
            },
            {
                "id": 2,
                "over": 9.4,
                "event_short": "Shubman Gill reaches fifty off 38 balls — smashes 2 sixes off Ashwin back-to-back",
                "event_type": "BATTER_EXPLODES",
                "chess_label": "Momentum Shift",
                "chess_symbol": "♜",
                "chess_rating": "!!",
                "team_benefited": "Gujarat Titans",
                "wp_before": 57,
                "wp_after": 68,
                "counterfactual_if": "If Chahal had dismissed Gill on 44 as he nearly did",
                "counterfactual_then": "GT loses their anchor batter, total stuck at 140-150, RR chase this easily — RR win probability 71%"
            },
            {
                "id": 3,
                "over": 4.5,
                "event_short": "Both RR openers Jaiswal and Buttler dismissed in powerplay — chase derailed early",
                "event_type": "WICKET_CLUSTER",
                "chess_label": "Pressure Point",
                "chess_symbol": "♟",
                "chess_rating": "!",
                "team_benefited": "Gujarat Titans",
                "wp_before": 60,
                "wp_after": 74,
                "counterfactual_if": "If Jaiswal had survived and played his typical 60-ball cameo",
                "counterfactual_then": "RR comfortably chase 172 with overs to spare — this was the match deciding moment"
            }
        ]
    }
}

# ============================================
# GROQ PROMPT
# Takes all 3 turning points at once (single API call — efficient!)
# Returns narration + counterfactual for each, plus a match verdict
# ============================================
turning_points_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are CricIQ's match analyst — a cricket expert who explains matches like a chess grandmaster analyzing a game.

Your job: For each turning point, write:
1. A 2-sentence NARRATION — natural cricket language, emotional, captures the moment's drama
2. A COUNTERFACTUAL — "If X hadn't happened..." — must feel real and cricket-specific
3. A one-line MATCH VERDICT at the end — the overall story of what decided the match

TONE:
- Expert but passionate — like Harsha Bhogle explaining to college students
- Use cricket phrases naturally: "the complexion of the match changed", "under the pump", "took the game away"
- Counterfactuals must sound realistic — use actual win probabilities given

OUTPUT: Return ONLY valid JSON. No markdown. No explanation.
{{
    "turning_points": [
        {{
            "id": 1,
            "narration": "2 sentences — what happened and why it mattered",
            "counterfactual_story": "1-2 sentences starting with the given IF premise, ending with the realistic consequence"
        }},
        {{
            "id": 2,
            "narration": "...",
            "counterfactual_story": "..."
        }},
        {{
            "id": 3,
            "narration": "...",
            "counterfactual_story": "..."
        }}
    ],
    "match_verdict": "2-3 sentences summarizing which team controlled the match and how it was decided — the chess endgame story"
}}"""),

    ("human", """Match: {match_title}
Result: {result}

TURNING POINT 1 — Over {tp1_over} — {tp1_chess_label}
Event: {tp1_event}
Win Probability shift: {team1} {tp1_wp_before}% → {tp1_wp_after}% (benefited: {tp1_benefited})
Counterfactual premise: {tp1_if} → {tp1_then}

TURNING POINT 2 — Over {tp2_over} — {tp2_chess_label}
Event: {tp2_event}
Win Probability shift: {team1} {tp2_wp_before}% → {tp2_wp_after}% (benefited: {tp2_benefited})
Counterfactual premise: {tp2_if} → {tp2_then}

TURNING POINT 3 — Over {tp3_over} — {tp3_chess_label}
Event: {tp3_event}
Win Probability shift: {team1} {tp3_wp_before}% → {tp3_wp_after}% (benefited: {tp3_benefited})
Counterfactual premise: {tp3_if} → {tp3_then}

Generate narrations, counterfactual stories, and match verdict. Only JSON.""")
])

# Connect prompt + LLM into a chain
turning_points_chain = turning_points_prompt | llm

# ============================================
# HELPER: parse JSON from Groq (handles markdown code blocks)
# ============================================
def parse_groq_json(content: str) -> dict:
    """Parse Groq response — handles both raw JSON and markdown-wrapped JSON"""
    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1])   # strip first and last lines
    return json.loads(content)

# ============================================
# ROUTE 1: GET /api/turning-points/matches
# Returns available matches (same list as delta feature)
# ============================================
@router.get("/matches")
def get_matches():
    """Returns list of matches available for turning points analysis"""
    # Build list from our MATCH_TURNING_POINTS data
    matches = []
    for match_id, data in MATCH_TURNING_POINTS.items():
        matches.append({
            "id": match_id,
            "title": data["match_title"],
            "team1": data["team1"],
            "team2": data["team2"],
            "result": data["result"]
        })
    return {"matches": matches}

# ============================================
# ROUTE 2: GET /api/turning-points/analyze/{match_id}
# The main route — returns 3 turning points with AI narrations
# ============================================
@router.get("/analyze/{match_id}")
async def analyze_turning_points(match_id: str):
    """
    Analyzes the 3 turning points for a match.
    1. Fetches pre-defined turning point data
    2. Sends all 3 to Groq in ONE call (efficient)
    3. Merges AI narrations with turning point data
    4. Returns full analysis to frontend
    """

    # Get match data
    match_data = MATCH_TURNING_POINTS.get(match_id)
    if not match_data:
        raise HTTPException(
            status_code=404,
            detail=f"Match '{match_id}' not found. Available: {list(MATCH_TURNING_POINTS.keys())}"
        )

    tps = match_data["turning_points"]   # list of 3 turning points
    tp1, tp2, tp3 = tps[0], tps[1], tps[2]   # unpack for easy access

    # ---- Call Groq ONCE for all 3 turning points ----
    try:
        response = await turning_points_chain.ainvoke({
            "match_title": match_data["match_title"],
            "result": match_data["result"],
            "team1": match_data["team1"],

            # Turning point 1
            "tp1_over": tp1["over"],
            "tp1_chess_label": tp1["chess_label"],
            "tp1_event": tp1["event_short"],
            "tp1_wp_before": tp1["wp_before"],
            "tp1_wp_after": tp1["wp_after"],
            "tp1_benefited": tp1["team_benefited"],
            "tp1_if": tp1["counterfactual_if"],
            "tp1_then": tp1["counterfactual_then"],

            # Turning point 2
            "tp2_over": tp2["over"],
            "tp2_chess_label": tp2["chess_label"],
            "tp2_event": tp2["event_short"],
            "tp2_wp_before": tp2["wp_before"],
            "tp2_wp_after": tp2["wp_after"],
            "tp2_benefited": tp2["team_benefited"],
            "tp2_if": tp2["counterfactual_if"],
            "tp2_then": tp2["counterfactual_then"],

            # Turning point 3
            "tp3_over": tp3["over"],
            "tp3_chess_label": tp3["chess_label"],
            "tp3_event": tp3["event_short"],
            "tp3_wp_before": tp3["wp_before"],
            "tp3_wp_after": tp3["wp_after"],
            "tp3_benefited": tp3["team_benefited"],
            "tp3_if": tp3["counterfactual_if"],
            "tp3_then": tp3["counterfactual_then"],
        })

        # Parse Groq's JSON response
        ai_data = parse_groq_json(response.content)

        # ---- Merge AI narrations with pre-defined data ----
        # Build the final response by combining static data + AI text
        enriched_turning_points = []
        for i, tp in enumerate(tps):
            ai_tp = ai_data["turning_points"][i]   # AI narration for this TP

            # Calculate the impact (how much win prob changed)
            impact = abs(tp["wp_after"] - tp["wp_before"])

            # Which direction did it shift?
            # "positive" means team1 improved, "negative" means team2 improved
            if tp["team_benefited"] == match_data["team1"]:
                shift_direction = "team1"     # team1 gained
            else:
                shift_direction = "team2"     # team2 gained

            enriched_turning_points.append({
                # Static data
                "id": tp["id"],
                "over": tp["over"],
                "event_short": tp["event_short"],
                "event_type": tp["event_type"],
                "chess_label": tp["chess_label"],
                "chess_symbol": tp["chess_symbol"],
                "chess_rating": tp["chess_rating"],
                "team_benefited": tp["team_benefited"],
                "wp_before": tp["wp_before"],
                "wp_after": tp["wp_after"],
                "impact": impact,               # e.g. 8 (percent change)
                "shift_direction": shift_direction,

                # AI generated
                "narration": ai_tp["narration"],
                "counterfactual_if": tp["counterfactual_if"],
                "counterfactual_story": ai_tp["counterfactual_story"],
            })

        return {
            "match_id": match_id,
            "match_title": match_data["match_title"],
            "team1": match_data["team1"],
            "team2": match_data["team2"],
            "result": match_data["result"],
            "turning_points": enriched_turning_points,
            "match_verdict": ai_data["match_verdict"]   # overall match story
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI analysis failed — please try again!")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
