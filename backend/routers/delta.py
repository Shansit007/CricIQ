# ============================================
# delta.py — Feature 1: Delta Brief™
# "Study peacefully. CricIQ watches for you."
#
# FLOW:
# 1. User picks match + study duration → POST /start-session
# 2. Backend saves initial match snapshot + timestamp
# 3. User studies...
# 4. User returns → GET /brief/{session_id}
# 5. Backend compares snapshots → Groq generates Delta Brief™
# ============================================

import os        # read environment variables
import uuid      # generate unique session IDs
import json      # parse Groq's JSON response
from datetime import datetime    # track session time
from fastapi import APIRouter, HTTPException    # web framework tools
from pydantic import BaseModel                  # request body validation
from langchain_groq import ChatGroq             # free Groq LLM
from langchain_core.prompts import ChatPromptTemplate  # prompt builder
from dotenv import load_dotenv                  # read .env file

# Load .env keys into memory
load_dotenv()

# Create the router — all routes will start with /api/delta
router = APIRouter(
    prefix="/api/delta",     # e.g. /api/delta/matches
    tags=["Delta Brief"]     # groups routes in FastAPI /docs page
)

# ============================================
# IN-MEMORY SESSION STORAGE
# When user starts study session, we save data here
# Key: session_id (8-char string)
# Value: dict with match info + initial snapshot
# NOTE: data clears when server restarts — fine for demo
# ============================================
active_sessions = {}  # stores all active study sessions

# ============================================
# LIVE MATCH DATA — MOCK VERSION
# In production: replace with real API call
# Free option: cricapi.com (100 calls/day free)
# API call would look like:
#   GET https://api.cricapi.com/v1/currentMatches?apikey=YOUR_KEY
# ============================================
LIVE_MATCHES = [
    {
        "id": "mi-vs-csk",
        "team1": "Mumbai Indians",
        "team2": "Chennai Super Kings",
        "team1_short": "MI",
        "team2_short": "CSK",
        "venue": "Wankhede Stadium, Mumbai",
        "status": "live",          # live or upcoming
        "emoji": "🔵"
    },
    {
        "id": "rcb-vs-kkr",
        "team1": "Royal Challengers Bangalore",
        "team2": "Kolkata Knight Riders",
        "team1_short": "RCB",
        "team2_short": "KKR",
        "venue": "M. Chinnaswamy Stadium, Bengaluru",
        "status": "live",
        "emoji": "🔴"
    },
    {
        "id": "gt-vs-rr",
        "team1": "Gujarat Titans",
        "team2": "Rajasthan Royals",
        "team1_short": "GT",
        "team2_short": "RR",
        "venue": "Narendra Modi Stadium, Ahmedabad",
        "status": "upcoming",
        "emoji": "🔵"
    }
]

# ============================================
# MATCH TIMELINES — PRE-DEFINED SNAPSHOTS
# Each match has snapshots at 0, 15, 30, 45, 60 mins
# Key = minutes elapsed in study session
# In production: replace with real-time API polling
# ============================================
MATCH_TIMELINES = {

    # ---- MI vs CSK ----
    "mi-vs-csk": {
        0: {   # what the match looks like when user starts studying
            "batting_team": "Mumbai Indians",
            "bowling_team": "Chennai Super Kings",
            "score": 23, "wickets": 0, "overs": 2.4,
            "run_rate": 8.4, "target": 0,          # target=0 means first innings
            "win_prob_team1": 50,                    # win probability % for team1
            "pressure_score": 28,                    # CricIQ's pressure metric
            "batters": ["Rohit Sharma (18*)", "Ishan Kishan (5*)"],
            "bowler": "Deepak Chahar",
            "phase": "powerplay",
            "events": []                             # nothing happened yet
        },
        15: {  # 15 minutes into study session
            "batting_team": "Mumbai Indians",
            "bowling_team": "Chennai Super Kings",
            "score": 67, "wickets": 1, "overs": 7.3,
            "run_rate": 8.9, "target": 0,
            "win_prob_team1": 55, "pressure_score": 41,
            "batters": ["Rohit Sharma (41*)", "Suryakumar Yadav (8*)"],
            "bowler": "Moeen Ali",
            "phase": "middle overs",
            "events": [
                "Ishan Kishan caught at deep mid-wicket for 21 — soft dismissal",
                "Rohit Sharma smashed 3 consecutive boundaries off Jadeja",
                "CSK dropped a sitter at square leg — Rohit survived on 38"
            ]
        },
        30: {  # 30 minutes into study session
            "batting_team": "Mumbai Indians",
            "bowling_team": "Chennai Super Kings",
            "score": 118, "wickets": 3, "overs": 13.1,
            "run_rate": 9.0, "target": 0,
            "win_prob_team1": 62, "pressure_score": 67,
            "batters": ["Hardik Pandya (22*)", "Tilak Varma (11*)"],
            "bowler": "Ravindra Jadeja",
            "phase": "middle overs",
            "events": [
                "Rohit Sharma out for 41 — top edge to fine leg, slightly reckless",
                "Suryakumar Yadav cleaned up by Chahar for a swift 31",
                "MI crossed 100 in under 12 overs — absolute acceleration",
                "CSK's DRS review failed — pressure and momentum clearly with MI",
                "Hardik arrived and immediately launched two massive sixes over long-on"
            ]
        },
        45: {  # 45 minutes into study session
            "batting_team": "Mumbai Indians",
            "bowling_team": "Chennai Super Kings",
            "score": 168, "wickets": 5, "overs": 18.2,
            "run_rate": 9.1, "target": 0,
            "win_prob_team1": 68, "pressure_score": 82,
            "batters": ["Tim David (28*)", "Jasprit Bumrah (3*)"],
            "bowler": "Tushar Deshpande",
            "phase": "death overs",
            "events": [
                "Hardik Pandya struck for 38 — outstanding death bowling from CSK",
                "Tilak Varma fell for a composed 24 trying to go big",
                "Tim David hit consecutive sixes in over 17 — Wankhede erupted",
                "MI lost 2 wickets in 2 balls at over 16 — brief wobble",
                "CSK desperately trying to restrict MI under 180"
            ]
        },
        60: {  # 60 minutes into study session — second innings now
            "batting_team": "Chennai Super Kings",
            "bowling_team": "Mumbai Indians",
            "score": 24, "wickets": 1, "overs": 3.0,
            "run_rate": 8.0, "target": 179,
            "win_prob_team1": 72,           # MI still favorites
            "pressure_score": 55,
            "batters": ["Ruturaj Gaikwad (18*)", "Moeen Ali (6*)"],
            "bowler": "Jasprit Bumrah",
            "phase": "powerplay",
            "events": [
                "MI finished at 178/5 — commanding total at Wankhede",
                "Bumrah struck on ball 3 of CSK chase — Conway golden duck",
                "Required rate is 8.5 — chaseable but CSK under early pressure",
                "Bumrah bowling 3 near-maiden overs — match already tilting MI's way"
            ]
        }
    },

    # ---- RCB vs KKR ----
    "rcb-vs-kkr": {
        0: {
            "batting_team": "Royal Challengers Bangalore",
            "bowling_team": "Kolkata Knight Riders",
            "score": 15, "wickets": 0, "overs": 1.4,
            "run_rate": 9.0, "target": 0,
            "win_prob_team1": 50, "pressure_score": 22,
            "batters": ["Faf du Plessis (10*)", "Virat Kohli (5*)"],
            "bowler": "Mitchell Starc",
            "phase": "powerplay",
            "events": []
        },
        15: {
            "batting_team": "Royal Challengers Bangalore",
            "bowling_team": "Kolkata Knight Riders",
            "score": 52, "wickets": 2, "overs": 6.4,
            "run_rate": 7.8, "target": 0,
            "win_prob_team1": 45, "pressure_score": 38,
            "batters": ["Virat Kohli (28*)", "Glenn Maxwell (7*)"],
            "bowler": "Varun Chakravarthy",
            "phase": "powerplay",
            "events": [
                "Faf du Plessis caught at long-on for 21 — Starc in full flight",
                "Rajat Patidar run out for 2 — terrible mix-up in the middle",
                "Kohli sweeping spinners beautifully — looking very focused",
                "Varun Chakravarthy spinning sharply — RCB top order under pressure"
            ]
        },
        30: {
            "batting_team": "Royal Challengers Bangalore",
            "bowling_team": "Kolkata Knight Riders",
            "score": 95, "wickets": 3, "overs": 11.3,
            "run_rate": 8.3, "target": 0,
            "win_prob_team1": 52, "pressure_score": 58,
            "batters": ["Virat Kohli (54*)", "Dinesh Karthik (4*)"],
            "bowler": "Andre Russell",
            "phase": "middle overs",
            "events": [
                "Glenn Maxwell dismissed for a frustrating 14 — tame chip shot",
                "Virat Kohli reached fifty with a stunning straight six",
                "RCB crossed 90 in 11 overs — tempo finally building",
                "Crowd at Chinnaswamy Stadium going absolutely wild for Kohli"
            ]
        },
        45: {
            "batting_team": "Royal Challengers Bangalore",
            "bowling_team": "Kolkata Knight Riders",
            "score": 158, "wickets": 6, "overs": 18.0,
            "run_rate": 8.8, "target": 0,
            "win_prob_team1": 55, "pressure_score": 78,
            "batters": ["Karn Sharma (9*)", "Mohammed Siraj (2*)"],
            "bowler": "Lockie Ferguson",
            "phase": "death overs",
            "events": [
                "Virat Kohli out for a brilliant 72 — standing ovation from everyone",
                "Dinesh Karthik fell for 22 trying to go big at death",
                "RCB lost 3 wickets in 2 overs — shocking middle-order collapse",
                "Lockie Ferguson bowling 150kph thunderbolts — nearly unplayable",
                "RCB tail-enders slogging desperately for every run"
            ]
        },
        60: {
            "batting_team": "Kolkata Knight Riders",
            "bowling_team": "Royal Challengers Bangalore",
            "score": 35, "wickets": 0, "overs": 4.0,
            "run_rate": 8.75, "target": 164,
            "win_prob_team1": 40, "pressure_score": 48,
            "batters": ["Phil Salt (22*)", "Sunil Narine (13*)"],
            "bowler": "Mohammed Siraj",
            "phase": "powerplay",
            "events": [
                "RCB ended at 163/6 — decent but very chaseable total",
                "Phil Salt and Narine absolutely blazing in powerplay",
                "Siraj hit for 3 boundaries in his 2nd over — RCB in trouble",
                "Narine slog-sweeping spinners for boundaries — vintage Narine",
                "RCB fielders looking nervy — this could be a comfortable KKR chase"
            ]
        }
    },

    # ---- GT vs RR ----
    "gt-vs-rr": {
        0: {
            "batting_team": "Gujarat Titans",
            "bowling_team": "Rajasthan Royals",
            "score": 0, "wickets": 0, "overs": 0.0,
            "run_rate": 0, "target": 0,
            "win_prob_team1": 50, "pressure_score": 20,
            "batters": ["Shubman Gill (0*)", "Wriddhiman Saha (0*)"],
            "bowler": "Trent Boult",
            "phase": "powerplay",
            "events": ["Match just started — first ball coming up!"]
        },
        15: {
            "batting_team": "Gujarat Titans",
            "bowling_team": "Rajasthan Royals",
            "score": 48, "wickets": 1, "overs": 5.2,
            "run_rate": 9.0, "target": 0,
            "win_prob_team1": 53, "pressure_score": 35,
            "batters": ["Shubman Gill (32*)", "David Miller (8*)"],
            "bowler": "Yuzvendra Chahal",
            "phase": "powerplay",
            "events": [
                "Wriddhiman Saha caught brilliantly at slip by Samson for 14",
                "Shubman Gill looking imperious — classic drives through the covers",
                "Trent Boult's opening spell — just 18 in 3 overs, very disciplined",
                "Gill swept Chahal for back-to-back fours — clearly in great touch"
            ]
        },
        30: {
            "batting_team": "Gujarat Titans",
            "bowling_team": "Rajasthan Royals",
            "score": 102, "wickets": 2, "overs": 11.0,
            "run_rate": 9.3, "target": 0,
            "win_prob_team1": 60, "pressure_score": 54,
            "batters": ["Shubman Gill (67*)", "Vijay Shankar (12*)"],
            "bowler": "Ravichandran Ashwin",
            "phase": "middle overs",
            "events": [
                "Gill smashed consecutive sixes off Ashwin — 50 in just 38 balls",
                "David Miller dismissed cheaply for 8 — caught at long-on",
                "Gill batting on a different level — best IPL innings this season",
                "Samson looking frustrated — keeps shuffling bowlers but nothing working"
            ]
        },
        45: {
            "batting_team": "Gujarat Titans",
            "bowling_team": "Rajasthan Royals",
            "score": 165, "wickets": 4, "overs": 18.3,
            "run_rate": 8.9, "target": 0,
            "win_prob_team1": 65, "pressure_score": 80,
            "batters": ["Rashid Khan (15*)", "Alzarri Joseph (4*)"],
            "bowler": "Trent Boult",
            "phase": "death overs",
            "events": [
                "Shubman Gill out for a magnificent 89 — one of the great IPL innings",
                "Vijay Shankar fell trying to accelerate — mistimed for 28",
                "Rahul Tewatia hit one helicopter six then got caught for 12",
                "Boult back for death — just 6 in over 18, extremely tight",
                "GT targeting 175-180, RR need a special chase"
            ]
        },
        60: {
            "batting_team": "Rajasthan Royals",
            "bowling_team": "Gujarat Titans",
            "score": 42, "wickets": 2, "overs": 5.0,
            "run_rate": 8.4, "target": 172,
            "win_prob_team1": 60, "pressure_score": 62,
            "batters": ["Sanju Samson (26*)", "Shimron Hetmyer (5*)"],
            "bowler": "Mohammed Shami",
            "phase": "powerplay",
            "events": [
                "GT finished at a strong 171/6 — very competitive total",
                "Jaiswal fell first ball — nipped back by Shami, golden duck",
                "Buttler caught at mid-off for 14 — massive wicket for GT",
                "Sanju Samson looking dangerous — two massive sixes off Shami",
                "RR need a Samson captain's special to win this from here"
            ]
        }
    }
}

# ============================================
# GROQ LLM SETUP
# Free tier: https://console.groq.com
# llama-3.3-70b-versatile — best free model
# ============================================
llm = ChatGroq(
    model="llama-3.3-70b-versatile",      # free and fast model
    groq_api_key=os.getenv("GROQ_API_KEY"),  # from .env file
    temperature=0.85,    # slightly creative for natural language
    max_tokens=900       # enough for all 5 sections of Delta Brief
)

# ============================================
# DELTA BRIEF™ PROMPT
# Tells Groq exactly how to generate the brief
# Uses variables like {team1}, {elapsed_minutes} etc.
# ============================================
delta_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are CricIQ's Delta Brief AI — a cricket companion for college students who study during live matches.

MISSION: When a student returns from studying, brief them on ONLY what mattered. Sound like their smartest cricket-obsessed friend.

CRITICAL TONE RULES:
✅ Show EMOTION and MOMENTUM, not raw scores
✅ Use natural cricket phrases: "shifted gears", "under the pump", "collar the bowling", "tidy spell"
✅ Each bullet must be under 15 words
✅ Sound like a college friend — casual but insightful
✅ Hostel summary = WhatsApp-style message with emoji

❌ NEVER write: "Score changed from X to Y"
❌ NEVER write: "Player scored N runs"
✅ WRITE: "MI suddenly shifted gears — boundaries started flowing"
✅ WRITE: "CSK started fumbling after that crucial dropped catch"

FOMO LEVELS:
- LOW: Nothing major happened, stable match
- MEDIUM: Some action, 1-2 wickets, minor momentum shift
- HIGH: Key wickets, momentum swings, crowd moments
- EXTREME: Multiple wickets, dramatic turns, match-defining moments

STUDY SAFE:
- green: Match is calm/stable, safe to keep studying
- orange: Getting interesting, check occasionally
- red: Critical phase — match could end soon or dramatic collapse

OUTPUT: Return ONLY valid JSON. No markdown. No explanation. Just the JSON.
{{
    "what_changed": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
    "match_mood": "one of: Calm / Tense / Chaos / Collapse Loading / One-sided / Electric / Last-over Madness",
    "pressure_alert": "one sentence about what's about to happen next",
    "fomo_level": "LOW or MEDIUM or HIGH or EXTREME",
    "fomo_emoji": "single emoji matching fomo level",
    "fomo_reason": "casual one sentence explanation",
    "watch_now": true or false,
    "watch_reason": "one short sentence — why watch or why keep studying",
    "hostel_summary": "1 gen-z WhatsApp-style sentence with emoji — e.g. 'Bro CSK fumbled hard after 15th over 💀'",
    "study_safe": "green or orange or red",
    "study_safe_reason": "3-5 words only"
}}"""),

    ("human", """Match: {team1} vs {team2}
Student away for: {elapsed_minutes} minutes

WHEN STUDENT LEFT:
Batting: {old_batting_team} vs {old_bowling_team}
Score: {old_score}/{old_wickets} in {old_overs} overs
Run Rate: {old_run_rate} | Win Prob ({team1}): {old_win_prob}% | Pressure: {old_pressure}
Batters: {old_batters} | Phase: {old_phase}

RIGHT NOW:
Batting: {new_batting_team} vs {new_bowling_team}
Score: {new_score}/{new_wickets} in {new_overs} overs
Run Rate: {new_run_rate} | Win Prob ({team1}): {new_win_prob}% | Pressure: {new_pressure}
Batters: {new_batters} | Bowler: {new_bowler} | Phase: {new_phase}

EVENTS DURING STUDY SESSION:
{events_text}

Generate the Delta Brief™ JSON now. Only JSON. No extra text.""")
])

# Connect prompt + LLM into a chain
delta_chain = delta_prompt | llm

# ============================================
# REQUEST BODY MODELS
# Defines what data our API endpoints expect
# ============================================
class StartSessionRequest(BaseModel):
    match_id: str       # e.g. "mi-vs-csk"
    study_minutes: int  # how long user plans to study (30, 45, 60 etc)

# ============================================
# HELPER: parse JSON from Groq response
# Groq sometimes wraps JSON in markdown code blocks
# This function handles both cases
# ============================================
def parse_groq_json(content: str) -> dict:
    """
    Safely parse JSON from Groq response.
    Handles cases where Groq wraps output in ```json ... ``` blocks.
    """
    content = content.strip()

    # Remove markdown code block if present
    if content.startswith("```"):
        lines = content.split("\n")
        # Remove first line (```json) and last line (```)
        content = "\n".join(lines[1:-1])

    return json.loads(content)

# ============================================
# HELPER: get current match snapshot by elapsed time
# Picks the closest pre-defined snapshot
# ============================================
def get_snapshot_for_elapsed(match_id: str, elapsed_minutes: int) -> dict:
    """
    Given elapsed minutes, returns the closest match snapshot.
    e.g. 22 mins → returns 15-min snapshot (closest available)
    """
    timeline = MATCH_TIMELINES.get(match_id, {})
    available_times = sorted(timeline.keys())   # [0, 15, 30, 45, 60]

    # Find closest time key to elapsed_minutes
    closest = min(available_times, key=lambda t: abs(t - elapsed_minutes))
    return timeline[closest], closest

# ============================================
# ROUTE 1: GET /api/delta/matches
# Returns list of live/upcoming matches
# ============================================
@router.get("/matches")
def get_live_matches():
    """Returns all live and upcoming matches for the match selector"""
    return {"matches": LIVE_MATCHES}

# ============================================
# ROUTE 2: POST /api/delta/start-session
# Saves the initial match snapshot and returns a session_id
# Called when user clicks "Start Study Session"
# ============================================
@router.post("/start-session")
def start_session(req: StartSessionRequest):
    """
    Saves the current match state as the 'checkpoint'.
    Returns a session_id that user will use to get their brief.
    """

    # Check if match exists
    timeline = MATCH_TIMELINES.get(req.match_id)
    if not timeline:
        raise HTTPException(status_code=404, detail=f"Match '{req.match_id}' not found")

    # Get initial snapshot — this is what match looks like RIGHT NOW
    initial_snapshot = timeline[0]  # T=0 snapshot

    # Get match info from LIVE_MATCHES list
    match_info = next(
        (m for m in LIVE_MATCHES if m["id"] == req.match_id),
        None
    )

    # Generate a short unique session ID
    session_id = str(uuid.uuid4())[:8]   # e.g. "a3f8b2c1"

    # Save session data in memory
    active_sessions[session_id] = {
        "session_id": session_id,
        "match_id": req.match_id,
        "match_info": match_info,
        "study_minutes": req.study_minutes,
        "started_at": datetime.now().isoformat(),  # save start time
        "initial_snapshot": initial_snapshot
    }

    return {
        "session_id": session_id,
        "match": f"{match_info['team1']} vs {match_info['team2']}",
        "study_minutes": req.study_minutes,
        "message": "CricIQ is watching the match for you 👁️"
    }

# ============================================
# ROUTE 3: GET /api/delta/brief/{session_id}
# Compares initial snapshot with current state
# Calls Groq to generate the Delta Brief™
# Called when user clicks "Show What I Missed"
# ============================================
@router.get("/brief/{session_id}")
async def get_delta_brief(session_id: str):
    """
    The main Delta Brief™ generator.
    1. Finds the session
    2. Calculates how much time passed
    3. Gets the 'current' match snapshot
    4. Calls Groq to generate emotional AI brief
    5. Returns all 5 unique Delta Brief sections
    """

    # Find session in memory
    session = active_sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Please start a new study session."
        )

    match_info = session["match_info"]
    match_id = session["match_id"]
    initial_snapshot = session["initial_snapshot"]

    # Calculate how many real minutes have passed since session started
    started_at = datetime.fromisoformat(session["started_at"])
    real_elapsed_seconds = (datetime.now() - started_at).seconds
    real_elapsed_minutes = real_elapsed_seconds // 60

    # DEMO MODE: if less than 2 real minutes passed,
    # simulate as if the user's chosen study time has passed
    # This way demo works instantly without having to wait
    if real_elapsed_minutes < 2:
        simulated_elapsed = session["study_minutes"]
    else:
        # Use real time, capped at 60 mins (our max snapshot)
        simulated_elapsed = min(real_elapsed_minutes, 60)

    # Get the "current" match snapshot closest to elapsed time
    current_snapshot, current_time_key = get_snapshot_for_elapsed(match_id, simulated_elapsed)

    # Make sure "current" is not the same as "initial"
    # (Always show at least 15 mins of change)
    timeline = MATCH_TIMELINES[match_id]
    sorted_times = sorted(timeline.keys())  # [0, 15, 30, 45, 60]
    if current_time_key == 0 and len(sorted_times) > 1:
        current_time_key = sorted_times[1]  # use 15 min snapshot
        current_snapshot = timeline[current_time_key]

    # Collect ALL events that happened between T=0 and current time
    all_events = []
    for t in sorted_times:
        if 0 < t <= current_time_key:   # between start and now
            all_events.extend(timeline[t].get("events", []))

    # Format events as bullet list for Groq
    if all_events:
        events_text = "\n".join([f"• {e}" for e in all_events])
    else:
        events_text = "Normal match progression — no standout events"

    # ---- Call Groq to generate the Delta Brief™ ----
    try:
        response = await delta_chain.ainvoke({
            # Match info
            "team1": match_info["team1"],
            "team2": match_info["team2"],
            "elapsed_minutes": simulated_elapsed,

            # Initial snapshot (when user LEFT to study)
            "old_batting_team": initial_snapshot["batting_team"],
            "old_bowling_team": initial_snapshot["bowling_team"],
            "old_score": initial_snapshot["score"],
            "old_wickets": initial_snapshot["wickets"],
            "old_overs": initial_snapshot["overs"],
            "old_run_rate": initial_snapshot["run_rate"],
            "old_win_prob": initial_snapshot["win_prob_team1"],
            "old_pressure": initial_snapshot["pressure_score"],
            "old_batters": ", ".join(initial_snapshot["batters"]),
            "old_phase": initial_snapshot["phase"],

            # Current snapshot (when user RETURNED)
            "new_batting_team": current_snapshot["batting_team"],
            "new_bowling_team": current_snapshot["bowling_team"],
            "new_score": current_snapshot["score"],
            "new_wickets": current_snapshot["wickets"],
            "new_overs": current_snapshot["overs"],
            "new_run_rate": current_snapshot["run_rate"],
            "new_win_prob": current_snapshot["win_prob_team1"],
            "new_pressure": current_snapshot["pressure_score"],
            "new_batters": ", ".join(current_snapshot["batters"]),
            "new_bowler": current_snapshot["bowler"],
            "new_phase": current_snapshot["phase"],

            # Events that happened
            "events_text": events_text
        })

        # Parse Groq's JSON response
        brief = parse_groq_json(response.content)

        # Add metadata to response (current score etc.)
        brief["meta"] = {
            "match": f"{match_info['team1']} vs {match_info['team2']}",
            "venue": match_info["venue"],
            "away_for_minutes": simulated_elapsed,
            "current_score": f"{current_snapshot['score']}/{current_snapshot['wickets']} ({current_snapshot['overs']} ov)",
            "current_phase": current_snapshot["phase"]
        }

        return brief

    except json.JSONDecodeError:
        # Groq returned invalid JSON — return a fallback
        raise HTTPException(
            status_code=500,
            detail="AI brief generation failed — please try again!"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Something went wrong: {str(e)}"
        )
