# ============================================
# routes/fantasy.py — Fantasy XI optimizer
# POST /api/fantasy/optimize — returns best 11 players
# ============================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.data_service import get_fantasy_players

router = APIRouter(prefix="/api/fantasy", tags=["fantasy"])


class FantasyRequest(BaseModel):
    team1:  str
    team2:  str
    format: str = "T20"
    budget: float = 100.0    # total credits allowed


@router.post("/optimize")
async def optimize_fantasy_xi(body: FantasyRequest):
    """
    Pick optimal Fantasy XI within budget constraints.
    Algorithm:
    1. Compute predicted fantasy points for each player
    2. Compute value score = predicted_points / credits
    3. Greedy selection: best value-score within constraints
    4. Constraints: exactly 11 players, 1 WK, 3-5 BAT, 1-3 AR, 3-5 BOWL
    """
    try:
        # Get all players from both teams
        players = get_fantasy_players(body.team1, body.team2)

        # Compute predicted fantasy points for each player
        # Formula based on recent form + strike rate / economy
        for p in players:
            role = p.get('role', 'BAT')
            if role in ('BAT', 'WK'):
                # Batsman points: avg * form * (strike_rate / 130)
                pts = p['recent_avg'] * p['recent_form'] * (p['strike_rate'] / 130)
            elif role == 'BOWL':
                # Bowler points: 20 / economy * form * 10
                pts = (20 / max(p['economy'], 1)) * p['recent_form'] * 10
            else:  # AR
                # All-rounder gets both
                bat_pts  = p['recent_avg'] * p['recent_form'] * (p['strike_rate'] / 130)
                bowl_pts = (20 / max(p['economy'], 1)) * p['recent_form'] * 8
                pts = bat_pts + bowl_pts

            p['predicted_points'] = round(pts, 1)
            p['value_score']      = round(pts / max(p['credits'], 1), 2)

        # ---- Greedy selection with constraints ----
        selected   = []
        used_credits = 0.0
        counts = {'WK': 0, 'BAT': 0, 'AR': 0, 'BOWL': 0}

        # Sort by value score descending (best value first)
        players.sort(key=lambda x: x['value_score'], reverse=True)

        # Role constraints (min and max for each role)
        role_min = {'WK': 1, 'BAT': 3, 'AR': 1, 'BOWL': 3}
        role_max = {'WK': 2, 'BAT': 5, 'AR': 3, 'BOWL': 5}

        def can_add(player, current_selected, current_counts, current_credits, budget):
            """Check if adding this player violates any constraint."""
            role     = player['role']
            new_cred = current_credits + player['credits']
            remaining = 11 - len(current_selected) - 1   # spots left after adding

            if new_cred > budget: return False
            if current_counts.get(role, 0) >= role_max.get(role, 5): return False

            # Check if remaining spots can still satisfy minimums
            rem_needs = sum(
                max(0, role_min.get(r, 0) - current_counts.get(r, 0) - (1 if r == role else 0))
                for r in role_min
            )
            if rem_needs > remaining: return False

            return True

        for player in players:
            if len(selected) >= 11: break

            if can_add(player, selected, counts, used_credits, body.budget):
                selected.append(player)
                counts[player['role']] = counts.get(player['role'], 0) + 1
                used_credits += player['credits']

        # ---- Ensure we have 11 players ----
        # If greedy didn't get us to 11, fill remaining slots from cheapest available
        if len(selected) < 11:
            remaining_players = [p for p in players if p not in selected]
            remaining_players.sort(key=lambda x: x['credits'])
            for p in remaining_players:
                if len(selected) >= 11: break
                selected.append(p)
                used_credits += p['credits']

        # ---- Pick captain and vice-captain ----
        # Captain = highest predicted points player
        # Vice captain = second highest
        selected.sort(key=lambda x: x['predicted_points'], reverse=True)
        captain_name = selected[0]['name'] if selected else ""
        vc_name      = selected[1]['name'] if len(selected) > 1 else ""

        # Add C / VC flags
        for p in selected:
            p['is_captain']      = (p['name'] == captain_name)
            p['is_vice_captain'] = (p['name'] == vc_name)
            p['reason']          = _generate_reason(p)

        total_points = sum(p['predicted_points'] for p in selected)

        return {
            "xi":                    selected,
            "captain":               captain_name,
            "vice_captain":          vc_name,
            "total_credits_used":    round(used_credits, 1),
            "predicted_total_points": round(total_points, 1),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _generate_reason(player: dict) -> str:
    """Generate a short human-readable reason for selecting this player."""
    role = player.get('role', 'BAT')
    if role in ('BAT', 'WK'):
        return f"Avg {player['recent_avg']} in recent matches, SR {player['strike_rate']}"
    elif role == 'BOWL':
        return f"Economy {player['economy']}, high wicket-taking form"
    else:
        return f"All-rounder value — contributes with both bat and ball"
