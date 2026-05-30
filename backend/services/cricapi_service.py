# ============================================
# cricapi_service.py — CricAPI integration
# Fetches live scores + upcoming matches
# Free tier: 100 requests/day — we cache 5 mins
# ============================================

import httpx           # async HTTP client — like requests but async
import os              # to read env variables
import time            # to check cache age
from typing import Optional

# ---- Simple in-memory cache ----
# We store the last API response + timestamp here
# This prevents burning through our 100 req/day free tier
_cache: dict = {
    "upcoming": {"data": None, "timestamp": 0.0},
    "live": {},   # key: match_id, value: {"data": ..., "timestamp": ...}
}
CACHE_TTL = 300  # 5 minutes = 300 seconds — cache lifetime


def _is_cache_fresh(timestamp: float) -> bool:
    """Check if a cached response is still fresh (less than 5 mins old)."""
    return (time.time() - timestamp) < CACHE_TTL


async def get_upcoming_matches() -> list:
    """
    Fetch upcoming + live matches from CricAPI.
    Returns a list of match dicts.
    Caches response for 5 minutes to protect free tier quota.
    """
    # Return cached data if it's still fresh
    cache_entry = _cache["upcoming"]
    if _is_cache_fresh(cache_entry["timestamp"]) and cache_entry["data"] is not None:
        return cache_entry["data"]

    # Get API key from environment variable
    api_key = os.getenv("CRICAPI_KEY", "")
    if not api_key:
        # If no API key set, return mock data for development
        return _get_mock_matches()

    # Build the API URL
    # cricScore endpoint gives us all currently active matches
    url = f"https://api.cricapi.com/v1/cricScore?apikey={api_key}"

    try:
        # httpx.AsyncClient is like requests.get but works with async/await
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()   # throws if status != 200
            raw = response.json()

        # CricAPI returns {"status": "success", "data": [...]}
        if raw.get("status") != "success":
            return _get_mock_matches()

        # Transform CricAPI format → our internal format
        matches = _transform_matches(raw.get("data", []))

        # Save to cache with current timestamp
        _cache["upcoming"] = {"data": matches, "timestamp": time.time()}
        return matches

    except Exception as e:
        print(f"[CricAPI] Error fetching matches: {e}")
        # On error, return mock data so the app still works
        return _get_mock_matches()


def _transform_matches(raw_matches: list) -> list:
    """
    Convert CricAPI response format to our internal Match format.
    CricAPI gives messy data — we clean it up here.
    """
    matches = []
    for m in raw_matches:
        try:
            # Detect if match is live (CricAPI marks live matches differently)
            is_live = m.get("matchStarted", False) and not m.get("matchEnded", False)

            # Extract teams
            t1 = m.get("t1", "Team A")
            t2 = m.get("t2", "Team B")

            # Extract format from match name (T20I, ODI, Test, IPL)
            name  = m.get("name", "").upper()
            fmt   = "T20"
            if "ODI" in name:   fmt = "ODI"
            elif "TEST" in name: fmt = "Test"
            elif "IPL" in name:  fmt = "IPL"
            elif "T20I" in name: fmt = "T20I"

            # Build the match object
            match = {
                "match_id": m.get("id", f"match_{len(matches)}"),
                "team1":    t1,
                "team2":    t2,
                "format":   fmt,
                "venue":    m.get("venue", "Unknown Venue"),
                "date":     m.get("dateTimeGMT", ""),
                "status":   "live" if is_live else "upcoming",
            }

            # Add live score if match is in progress
            if is_live:
                score_raw = m.get("t1s", "") or ""   # e.g. "120/3 (15.2 ov)"
                match["live_score"] = _parse_score(score_raw, t1, t2)

            matches.append(match)
        except Exception:
            continue   # skip malformed entries

    return matches


def _parse_score(score_str: str, batting_team: str, bowling_team: str) -> dict:
    """
    Parse score string like "120/3 (15.2 ov)" into a structured dict.
    """
    try:
        # Example: "120/3 (15.2 ov)"
        parts    = score_str.split(" ")
        runs_wkts = parts[0] if parts else "0/0"
        overs     = parts[1].replace("(","").replace(")","") if len(parts) > 1 else "0"

        runs, wickets = runs_wkts.split("/") if "/" in runs_wkts else (runs_wkts, "0")

        return {
            "batting_team":  batting_team,
            "bowling_team":  bowling_team,
            "current_score": int(runs),
            "wickets":       int(wickets),
            "overs":         overs,
            "run_rate":      round(int(runs) / max(float(overs.replace(".","").replace("ov","") or 1), 1), 2),
        }
    except Exception:
        return {
            "batting_team":  batting_team,
            "bowling_team":  bowling_team,
            "current_score": 0,
            "wickets":       0,
            "overs":         "0.0",
            "run_rate":      0.0,
        }


def _get_mock_matches() -> list:
    """
    Returns fake match data for development (when no API key is set).
    This lets you build and test the UI without a CricAPI account.
    """
    return [
        {
            "match_id": "mock_001",
            "team1": "India",
            "team2": "Australia",
            "format": "T20I",
            "venue": "Wankhede Stadium, Mumbai",
            "date": "2025-06-20T14:00:00",
            "status": "live",
            "live_score": {
                "batting_team": "India",
                "bowling_team": "Australia",
                "current_score": 142,
                "wickets": 3,
                "overs": "16.4",
                "run_rate": 8.52,
                "target": 185,
                "required_run_rate": 11.2,
            }
        },
        {
            "match_id": "mock_002",
            "team1": "England",
            "team2": "New Zealand",
            "format": "ODI",
            "venue": "Lord's Cricket Ground, London",
            "date": "2025-06-22T10:30:00",
            "status": "upcoming",
        },
        {
            "match_id": "mock_003",
            "team1": "Mumbai Indians",
            "team2": "Chennai Super Kings",
            "format": "IPL",
            "venue": "Wankhede Stadium, Mumbai",
            "date": "2025-06-23T19:30:00",
            "status": "upcoming",
        },
        {
            "match_id": "mock_004",
            "team1": "Pakistan",
            "team2": "South Africa",
            "format": "Test",
            "venue": "Gaddafi Stadium, Lahore",
            "date": "2025-06-25T10:00:00",
            "status": "upcoming",
        },
        {
            "match_id": "mock_005",
            "team1": "Royal Challengers Bangalore",
            "team2": "Delhi Capitals",
            "format": "IPL",
            "venue": "M. Chinnaswamy Stadium, Bangalore",
            "date": "2025-06-24T19:30:00",
            "status": "upcoming",
        },
        {
            "match_id": "mock_006",
            "team1": "West Indies",
            "team2": "Sri Lanka",
            "format": "T20I",
            "venue": "Kensington Oval, Barbados",
            "date": "2025-06-26T18:00:00",
            "status": "upcoming",
        },
    ]
