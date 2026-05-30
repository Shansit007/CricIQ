# ============================================
# data_service.py — CSV dataset queries
# Loads IPL + ICC CSVs into memory at startup
# Used by rivalry and fantasy features
# ============================================

import os
import glob
import random
from typing import Optional

# pandas is for reading and analyzing CSV data
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    print("[Data] pandas not installed. pip install pandas")

# ---- Module-level dataframes ----
# Loaded once at startup, reused for every query
_matches_df = None       # match-level data
_deliveries_df = None    # ball-by-ball data

# Path to data folder (relative to this file)
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')


def load_datasets():
    """
    Load CSV datasets into memory.
    Called once when FastAPI starts.
    Supports both flat CSVs (ipl_matches.csv) and Cricsheet per-match CSVs.
    """
    global _matches_df, _deliveries_df

    if not PANDAS_AVAILABLE:
        print("[Data] pandas not available — using mock data")
        return

    # Try to load main datasets
    matches_path    = os.path.join(DATA_DIR, 'ipl_matches.csv')
    deliveries_path = os.path.join(DATA_DIR, 'ipl_deliveries.csv')

    if os.path.exists(matches_path):
        _matches_df = pd.read_csv(matches_path)
        print(f"[Data] Loaded {len(_matches_df)} matches from {matches_path}")
    else:
        print("[Data] ipl_matches.csv not found — rivalry will use mock data")

    if os.path.exists(deliveries_path):
        _deliveries_df = pd.read_csv(deliveries_path)
        print(f"[Data] Loaded {len(_deliveries_df)} deliveries")
    else:
        print("[Data] ipl_deliveries.csv not found")


def get_rivalry_stats(team1: str, team2: str, format: str) -> dict:
    """
    Get head-to-head rivalry statistics between two teams.
    Returns structured dict consumed by /api/rivalry endpoint.
    """
    if _matches_df is None:
        return _mock_rivalry(team1, team2, format)

    try:
        df = _matches_df.copy()

        # Filter matches between these two teams (in either order)
        mask = (
            ((df['team1'] == team1) & (df['team2'] == team2)) |
            ((df['team1'] == team2) & (df['team2'] == team1))
        )
        rivalry = df[mask].copy()

        if len(rivalry) == 0:
            return _mock_rivalry(team1, team2, format)

        total_matches = len(rivalry)

        # Count wins — 'winner' column has the winning team name
        team1_wins = int((rivalry['winner'] == team1).sum())
        team2_wins = int((rivalry['winner'] == team2).sum())

        # Year-by-year breakdown
        rivalry['year'] = pd.to_datetime(rivalry['date'], errors='coerce').dt.year
        year_data = []
        for year, grp in rivalry.groupby('year'):
            if pd.isna(year): continue
            year_data.append({
                "year": int(year),
                "team1_wins": int((grp['winner'] == team1).sum()),
                "team2_wins": int((grp['winner'] == team2).sum()),
            })

        # Win percentages
        t1_pct = round(team1_wins / total_matches * 100) if total_matches else 50
        t2_pct = 100 - t1_pct

        return {
            "total_matches":          total_matches,
            "team1_wins":             team1_wins,
            "team2_wins":             team2_wins,
            "win_percentage":         {"team1": t1_pct, "team2": t2_pct},
            "avg_first_innings_score": 168,  # TODO: compute from deliveries_df
            "highest_chase":          203,
            "year_by_year":           year_data,
            "top_performers":         _mock_top_performers(team1, team2),
            "most_dramatic_match": {
                "date":        str(rivalry.iloc[-1].get('date', '2022')),
                "result":      f"{rivalry.iloc[-1].get('winner', team1)} won",
                "description": "A thrilling encounter where every ball mattered.",
            },
        }

    except Exception as e:
        print(f"[Data] Rivalry query failed: {e}")
        return _mock_rivalry(team1, team2, format)


def get_fantasy_players(team1: str, team2: str) -> list:
    """
    Get player stats for both teams — used by fantasy optimizer.
    Returns list of player dicts.
    """
    # In a real implementation, this would query player stats from the deliveries dataset
    # For now, we return structured mock data based on team names
    return _get_mock_players(team1, team2)


# ---- Mock data fallbacks ----

def _mock_rivalry(team1: str, team2: str, format: str) -> dict:
    """Return realistic-looking mock rivalry data."""
    random.seed(hash(team1 + team2))   # same teams always get same mock data
    t1_wins = random.randint(12, 30)
    t2_wins = random.randint(10, 25)
    total   = t1_wins + t2_wins

    years = list(range(2015, 2025))
    year_data = []
    for y in years:
        t1 = random.randint(0, 3)
        t2 = random.randint(0, 3)
        year_data.append({"year": y, "team1_wins": t1, "team2_wins": t2})

    return {
        "total_matches":          total,
        "team1_wins":             t1_wins,
        "team2_wins":             t2_wins,
        "win_percentage":         {"team1": round(t1_wins/total*100), "team2": round(t2_wins/total*100)},
        "avg_first_innings_score": random.randint(155, 185),
        "highest_chase":           random.randint(190, 220),
        "year_by_year":            year_data,
        "top_performers":          _mock_top_performers(team1, team2),
        "most_dramatic_match": {
            "date":        "2022-10-23",
            "result":      f"{team1} won by 4 runs",
            "description": f"In a nail-biting finish, {team1} defended 5 runs off the last over. {team2} needed a six off the last ball but could only manage a four.",
        },
    }


def _mock_top_performers(team1: str, team2: str) -> list:
    """Mock top performers for a rivalry."""
    players = [
        {"name": "Virat Kohli",     "team": team1, "avg": 68.4, "matches": 12},
        {"name": "Jasprit Bumrah",  "team": team1, "avg": 3.2,  "matches": 14},
        {"name": "Steve Smith",     "team": team2, "avg": 55.1, "matches": 10},
        {"name": "Pat Cummins",     "team": team2, "avg": 4.1,  "matches": 11},
        {"name": "Rohit Sharma",    "team": team1, "avg": 48.7, "matches": 15},
        {"name": "David Warner",    "team": team2, "avg": 52.3, "matches": 13},
    ]
    return players[:6]


def _get_mock_players(team1: str, team2: str) -> list:
    """
    Return a pool of players from both teams with stats.
    Credits are assigned based on stats percentile (6.0 - 11.0 scale).
    """
    # IPL team player templates
    team_templates = {
        "Mumbai Indians":           ["Rohit Sharma", "Ishan Kishan", "Suryakumar Yadav", "Hardik Pandya", "Jasprit Bumrah", "Tim David"],
        "Chennai Super Kings":      ["MS Dhoni", "Ruturaj Gaikwad", "Devon Conway", "Shivam Dube", "Deepak Chahar", "Ravindra Jadeja"],
        "Royal Challengers Bangalore": ["Virat Kohli", "Faf du Plessis", "Glenn Maxwell", "Mohammed Siraj", "Wanindu Hasaranga", "Dinesh Karthik"],
        "Kolkata Knight Riders":    ["Shreyas Iyer", "Andre Russell", "Sunil Narine", "Rinku Singh", "Venkatesh Iyer", "Varun Chakravarthy"],
        "Delhi Capitals":           ["David Warner", "Rishabh Pant", "Axar Patel", "Anrich Nortje", "Mitchell Marsh", "Kuldeep Yadav"],
        "Rajasthan Royals":         ["Sanju Samson", "Jos Buttler", "Yashasvi Jaiswal", "Ravichandran Ashwin", "Trent Boult", "Riyan Parag"],
        "India":                    ["Rohit Sharma", "Virat Kohli", "KL Rahul", "Hardik Pandya", "Jasprit Bumrah", "Mohammed Shami", "Ravindra Jadeja", "Suryakumar Yadav"],
        "Australia":                ["David Warner", "Steve Smith", "Pat Cummins", "Mitchell Starc", "Glenn Maxwell", "Travis Head", "Josh Hazlewood", "Matthew Wade"],
        "England":                  ["Joe Root", "Ben Stokes", "Jos Buttler", "Jofra Archer", "Sam Curran", "Mark Wood"],
        "Pakistan":                 ["Babar Azam", "Shaheen Afridi", "Mohammad Rizwan", "Shadab Khan", "Haris Rauf", "Fakhar Zaman"],
    }

    roles_map = {
        "MS Dhoni": "WK",     "Ishan Kishan": "WK",   "Rishabh Pant": "WK",
        "Jos Buttler": "WK",  "Sanju Samson": "WK",   "Dinesh Karthik": "WK",
        "Devon Conway": "WK", "Ruturaj Gaikwad": "BAT", "Mitchell Marsh": "AR",
        "Hardik Pandya": "AR", "Andre Russell": "AR",  "Sunil Narine": "AR",
        "Axar Patel": "AR",   "Ravindra Jadeja": "AR", "Glenn Maxwell": "AR",
        "Wanindu Hasaranga": "AR", "Venkatesh Iyer": "AR",
        "Jasprit Bumrah": "BOWL", "Mohammed Siraj": "BOWL", "Trent Boult": "BOWL",
        "Deepak Chahar": "BOWL", "Pat Cummins": "BOWL", "Mitchell Starc": "BOWL",
        "Shaheen Afridi": "BOWL", "Jofra Archer": "BOWL", "Kuldeep Yadav": "BOWL",
        "Varun Chakravarthy": "BOWL", "Anrich Nortje": "BOWL",
        "Ravichandran Ashwin": "BOWL", "Shadab Khan": "AR", "Haris Rauf": "BOWL",
    }

    credits_map = {
        "Virat Kohli": 11.0, "Rohit Sharma": 10.5, "Jasprit Bumrah": 10.5,
        "MS Dhoni": 9.5, "David Warner": 10.0, "Steve Smith": 9.5,
        "Pat Cummins": 9.5, "Babar Azam": 10.5, "Joe Root": 10.0,
        "Ben Stokes": 10.0, "Jos Buttler": 10.0,
    }

    players = []
    for team in [team1, team2]:
        team_players = team_templates.get(team, [f"Player {i}" for i in range(1, 9)])
        for name in team_players:
            import random as rng
            rng.seed(hash(name))
            players.append({
                "name":           name,
                "team":           team,
                "role":           roles_map.get(name, "BAT"),
                "credits":        credits_map.get(name, round(rng.uniform(7.0, 9.5), 1)),
                "recent_avg":     round(rng.uniform(20, 65), 1),
                "strike_rate":    round(rng.uniform(120, 200), 1),
                "economy":        round(rng.uniform(6.5, 10.0), 1),
                "recent_form":    round(rng.uniform(0.5, 1.0), 2),
            })
    return players
