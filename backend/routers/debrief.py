# ============================================
# debrief.py — Feature 7: Post-Match 60-Second Debrief
#
# "Match ended while you were studying?
#  Open app → get a 60-second read."
#
# Covers:
#   1. Punchy headline
#   2. Result summary
#   3. Key performer story
#   4. Turning point story
#   5. CricIQ Pressure Score accuracy
#   6. Final word — the lasting memory
# ============================================

import os       # read env variables
import json     # parse Groq response
from fastapi import APIRouter, HTTPException
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv()

# All routes start with /api/debrief
router = APIRouter(
    prefix="/api/debrief",
    tags=["Post-Match Debrief"]
)

# ============================================
# GROQ LLM — free tier
# ============================================
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.75,    # slightly creative for punchy writing
    max_tokens=900       # 6 sections need decent room
)

# ============================================
# PRE-DEFINED MATCH DATA
# Factual data used to build the debrief prompt.
# Groq adds the narrative layer on top.
# ============================================
MATCH_DEBRIEF_DATA = {

    "mi-vs-csk": {
        "match_title": "Mumbai Indians vs Chennai Super Kings",
        "venue": "Wankhede Stadium, Mumbai",
        "result": "Mumbai Indians won by 23 runs",
        "winning_team": "Mumbai Indians",
        "losing_team": "Chennai Super Kings",
        "team1_score": "178/5 (20 overs)",
        "team2_score": "155/8 (20 overs)",
        "key_performer": "Jasprit Bumrah",
        "key_performer_stats": "4 overs, 2/18 — held his nerve in the death overs to keep CSK to 155 chasing 179",
        "top_scorer": "Rohit Sharma — 41 off 29 balls",
        "turning_point": "CSK dropped Rohit Sharma on 38 at square leg off Jadeja — that dropped catch cost them 25+ extra runs and ultimately the match",
        "high_moment": "Tim David's back-to-back sixes off Tushar Deshpande in over 17 pushed MI from 148 to 168",
        "low_moment": "MI wobbled at 118/3 in over 13, losing Rohit and SKY in quick succession — a brief but dangerous dip",
        "pressure_score_note": "CricIQ Pressure Score hit 82 at over 17 — correctly predicted the game-deciding phase. Alert would have fired at that exact moment."
    },

    "rcb-vs-kkr": {
        "match_title": "Royal Challengers Bangalore vs Kolkata Knight Riders",
        "venue": "M. Chinnaswamy Stadium, Bengaluru",
        "result": "Kolkata Knight Riders won by 6 wickets",
        "winning_team": "Kolkata Knight Riders",
        "losing_team": "Royal Challengers Bangalore",
        "team1_score": "163/6 (20 overs)",
        "team2_score": "164/4 (18.3 overs)",
        "key_performer": "Sunil Narine",
        "key_performer_stats": "32 off 19 balls opening the batting + 2/24 bowling — a complete all-round performance that strangled RCB",
        "top_scorer": "Virat Kohli — 72 off 49 balls",
        "turning_point": "RCB collapsed from 130/3 to 158/6 in under 3 overs — a stunning three-wicket cluster in the death that limited their total to 163",
        "high_moment": "Kohli's straight six off Andre Russell to bring up his fifty brought a packed Chinnaswamy to its feet",
        "low_moment": "Rajat Patidar's catastrophic run-out for 2 in over 6 — a horrible mix-up that destroyed RCB's powerplay platform",
        "pressure_score_note": "CricIQ Pressure Score reached 78 at RCB's collapse — the pressure alert would have fired as Ferguson took his second wicket, perfectly timed."
    },

    "gt-vs-rr": {
        "match_title": "Gujarat Titans vs Rajasthan Royals",
        "venue": "Narendra Modi Stadium, Ahmedabad",
        "result": "Gujarat Titans won by 18 runs",
        "winning_team": "Gujarat Titans",
        "losing_team": "Rajasthan Royals",
        "team1_score": "171/6 (20 overs)",
        "team2_score": "153/7 (20 overs)",
        "key_performer": "Shubman Gill",
        "key_performer_stats": "89 off 58 balls — a captain's masterclass that set up the entire innings and controlled the match from ball one",
        "top_scorer": "Shubman Gill — 89 off 58 balls",
        "turning_point": "Both RR openers Jaiswal and Buttler dismissed in the powerplay — the chase was derailed before it even started. Shami's opening spell was defining.",
        "high_moment": "Gill's back-to-back sixes off Ravichandran Ashwin in over 9 — a statement that shifted the entire match tempo",
        "low_moment": "GT lost 3 wickets between overs 15-19 trying to accelerate, nearly squandering Gill's platform",
        "pressure_score_note": "CricIQ Pressure Score hit 80 in the final GT overs — flagged the wobble perfectly. In the RR chase, pressure spiked again after Buttler's dismissal, correctly signalling game over."
    }
}

# ============================================
# GROQ PROMPT — 60-second debrief
# Strict format: 6 JSON fields, each very concise
# ============================================
debrief_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are CricIQ's post-match analyst. A student missed the match entirely while studying. Give them a crisp 60-second read.

TONE: Like a great sports journalist — sharp, specific, slightly passionate. Not casual. Not a list of stats.
RULE: Each section should feel like a well-crafted sentence, not a bullet point.

OUTPUT: Return ONLY valid JSON. No markdown code blocks. No extra text.
{{
    "headline": "One punchy match headline — max 10 words, starts with winning team",
    "result_summary": "2 sentences: who won, how dominant was it, key number",
    "key_performer_story": "2 sentences: what they did and why it mattered to the outcome",
    "turning_point_story": "2 sentences: the single moment that changed everything — specific, emotional",
    "pressure_score_accuracy": "1 sentence: how CricIQ Pressure Score predicted the critical moment — make it sound impressive",
    "final_word": "1 sentence: the one thing a fan will remember from this match — vivid, specific"
}}"""),

    ("human", """Match: {match_title}
Venue: {venue}
Result: {result} ({team1_score} vs {team2_score})

Key Performer: {key_performer} — {key_performer_stats}
Top Scorer: {top_scorer}

Match Turning Point: {turning_point}
High Moment: {high_moment}
Low Moment for loser: {low_moment}

CricIQ Pressure Score: {pressure_score_note}

Generate the 60-second debrief JSON now.""")
])

debrief_chain = debrief_prompt | llm

# ============================================
# HELPER: parse Groq JSON (handles markdown wrapping)
# ============================================
def parse_groq_json(content: str) -> dict:
    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1])
    return json.loads(content)

# ============================================
# ROUTE 1: GET /api/debrief/matches
# Returns matches available for debrief
# ============================================
@router.get("/matches")
def get_matches():
    """Returns completed matches available for post-match debrief"""
    return {
        "matches": [
            {
                "id": mid,
                "title": data["match_title"],
                "result": data["result"],
                "winning_team": data["winning_team"]
            }
            for mid, data in MATCH_DEBRIEF_DATA.items()
        ]
    }

# ============================================
# ROUTE 2: GET /api/debrief/generate/{match_id}
# Calls Groq to generate the 60-second debrief
# ============================================
@router.get("/generate/{match_id}")
async def generate_debrief(match_id: str):
    """
    Generates a 60-second post-match debrief using Groq LLM.
    Returns 6 sections: headline, result, key performer,
    turning point, pressure score accuracy, final word.
    """

    data = MATCH_DEBRIEF_DATA.get(match_id)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Match '{match_id}' not found. Try: {list(MATCH_DEBRIEF_DATA.keys())}"
        )

    try:
        response = await debrief_chain.ainvoke({
            "match_title": data["match_title"],
            "venue": data["venue"],
            "result": data["result"],
            "team1_score": data["team1_score"],
            "team2_score": data["team2_score"],
            "key_performer": data["key_performer"],
            "key_performer_stats": data["key_performer_stats"],
            "top_scorer": data["top_scorer"],
            "turning_point": data["turning_point"],
            "high_moment": data["high_moment"],
            "low_moment": data["low_moment"],
            "pressure_score_note": data["pressure_score_note"]
        })

        # Parse Groq's JSON
        debrief = parse_groq_json(response.content)

        # Add metadata (non-AI facts)
        debrief["meta"] = {
            "match_title": data["match_title"],
            "venue": data["venue"],
            "result": data["result"],
            "winning_team": data["winning_team"],
            "losing_team": data["losing_team"],
            "key_performer": data["key_performer"],
            "scores": f"{data['team1_score']} vs {data['team2_score']}"
        }

        return debrief

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Debrief generation failed — try again!")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
