# ============================================
# narrator.py — Feature 2: AI Match Narrator
# Uses Groq LLM to generate natural English
# catch-up summaries like a friend telling you
# what happened in the match
# ============================================

# APIRouter lets us organize routes into separate files
from fastapi import APIRouter

# BaseModel lets us define what data we expect
from pydantic import BaseModel

# ChatGroq connects us to Groq's free LLM API
from langchain_groq import ChatGroq

# ChatPromptTemplate helps us build prompts
from langchain_core.prompts import ChatPromptTemplate

# os helps us read environment variables
import os

# load_dotenv reads our .env file
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create router for narrator endpoints
router = APIRouter(
    prefix="/api/narrator",   # all routes start with this
    tags=["AI Narrator"]      # groups in docs
)

# Initialize Groq LLM — completely free tier
# llama-3.3-70b-versatile is Groq's best free model
llm = ChatGroq(
    model="llama-3.3-70b-versatile",  # free model
    groq_api_key=os.getenv("GROQ_API_KEY"),  # from .env
    temperature=0.7,   # 0=robotic, 1=creative, 0.7=natural
    max_tokens=300     # keep responses short and punchy
)

# Define what data this endpoint expects
class MatchState(BaseModel):
    batting_team: str      # team currently batting
    bowling_team: str      # team currently bowling
    current_score: int     # runs scored so far
    wickets: int           # wickets fallen
    overs: float           # overs bowled so far
    target: int            # target score (0 if first innings)
    last_events: str       # what happened recently e.g "Kohli out, 2 sixes by Dhoni"
    minutes_away: int      # how long user was away

# Feature 1: Delta Brief — what changed in last X minutes
class DeltaBrief(BaseModel):
    previous_score: int    # score when user last checked
    current_score: int     # score right now
    previous_wickets: int  # wickets when user last checked
    current_wickets: int   # wickets right now
    previous_overs: float  # overs when user last checked
    current_overs: float   # overs right now
    batting_team: str      # team batting
    key_events: str        # important things that happened

# Build the catch-up prompt template
# {variable} placeholders get filled with real data
catchup_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a cricket-loving college friend giving a 
    quick match update. Be casual, fun, and use cricket slang. 
    Keep it under 4 sentences. Use emojis sparingly."""),
    
    ("human", """My friend needs a {minutes_away}-minute catch-up.
    
    Match situation:
    - {batting_team} batting vs {bowling_team}
    - Score: {current_score}/{wickets} in {overs} overs
    - Target: {target} (0 means first innings)
    - Recent events: {last_events}
    
    Give a natural, conversational catch-up in 3-4 sentences.""")
])

# Build the delta brief prompt
delta_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a cricket score update bot. 
    Give ONLY what changed since last check.
    Be extremely brief — maximum 4 lines.
    Use cricket language naturally."""),
    
    ("human", """User last checked: {previous_score}/{previous_wickets} in {previous_overs} overs
    Right now: {current_score}/{current_wickets} in {current_overs} overs
    Team batting: {batting_team}
    Key events: {key_events}
    
    Tell them ONLY what changed. Start with the most important thing.""")
])

# Create chains — prompt + llm connected together
catchup_chain = catchup_prompt | llm
delta_chain = delta_prompt | llm

# Endpoint 1 — Full catch-up after being away
@router.post("/catchup")
async def get_catchup(match: MatchState):
    """Generate a natural English catch-up summary"""
    
    # Fill prompt with real match data
    response = await catchup_chain.ainvoke({
        "minutes_away": match.minutes_away,
        "batting_team": match.batting_team,
        "bowling_team": match.bowling_team,
        "current_score": match.current_score,
        "wickets": match.wickets,
        "overs": match.overs,
        "target": match.target,
        "last_events": match.last_events
    })
    
    # Return the generated text
    return {
        "catchup": response.content,
        "generated_for": f"{match.minutes_away} minutes away"
    }

# Endpoint 2 — Delta brief (only what changed)
@router.post("/delta")
async def get_delta_brief(delta: DeltaBrief):
    """Generate a brief of only what changed since last check"""
    
    # Fill prompt with delta data
    response = await delta_chain.ainvoke({
        "previous_score": delta.previous_score,
        "current_score": delta.current_score,
        "previous_wickets": delta.previous_wickets,
        "current_wickets": delta.current_wickets,
        "previous_overs": delta.previous_overs,
        "current_overs": delta.current_overs,
        "batting_team": delta.batting_team,
        "key_events": delta.key_events
    })
    
    return {
        "delta_brief": response.content,
        "score_change": delta.current_score - delta.previous_score,
        "wickets_fallen": delta.current_wickets - delta.previous_wickets
    }