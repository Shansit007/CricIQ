# ============================================
# match_socket.py — Socket.io WebSocket server
# Simulates ball-by-ball events between real score polls
# ============================================

import asyncio
import random
import time
from typing import Optional

# python-socketio for WebSocket server — pip install python-socketio
import socketio

# Import our services
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.cricapi_service import get_upcoming_matches
from services.groq_service import get_commentary
from services.ml_service import predict

# ---- Create the Socket.io server ----
# async_mode='asgi' works with FastAPI (ASGI framework)
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',    # allow any origin (tighten in production)
    logger=False,                # disable verbose logging
    engineio_logger=False,
)

# ---- In-memory match state store ----
# key: match_id → value: current match state dict
match_states: dict = {}

# Tracks which simulations are currently running
active_simulations: set = set()


# ---- Socket event handlers ----

@sio.event
async def connect(sid: str, environ: dict):
    """Called when a client connects."""
    print(f"[Socket] Client {sid} connected")
    await sio.emit('connected', {'message': 'Connected to CricIQ live match!'}, to=sid)


@sio.event
async def disconnect(sid: str):
    """Called when a client disconnects."""
    print(f"[Socket] Client {sid} disconnected")


@sio.event
async def join_match(sid: str, data: dict):
    """
    Client joins a match room.
    Data: {"match_id": "abc123"}
    We start the simulation loop for this match if not already running.
    """
    match_id = data.get('match_id', '')
    if not match_id:
        await sio.emit('error', {'message': 'match_id required'}, to=sid)
        return

    # Join the room for this match (rooms = broadcast groups)
    await sio.enter_room(sid, f'match_{match_id}')
    print(f"[Socket] {sid} joined match {match_id}")

    # Initialize match state if first viewer
    if match_id not in match_states:
        match_states[match_id] = _initial_state(match_id)

    # Send current state immediately to the joining client
    await sio.emit('match_state', match_states[match_id], to=sid)

    # Start the simulation loop for this match (if not already running)
    if match_id not in active_simulations:
        asyncio.create_task(simulate_match(match_id))


async def simulate_match(match_id: str):
    """
    Main simulation loop.
    - Every 3 seconds: emit a simulated ball event
    - Every 60 seconds: poll real CricAPI score and sync
    """
    active_simulations.add(match_id)
    last_real_sync = 0.0   # timestamp of last real score sync

    print(f"[Socket] Starting simulation for match {match_id}")

    try:
        while match_id in match_states:
            now = time.time()

            # ---- Real score sync every 60 seconds ----
            if now - last_real_sync > 60:
                await sio.emit('syncing', {}, room=f'match_{match_id}')
                await _sync_real_score(match_id)
                last_real_sync = now
                await sio.emit('sync_complete', {}, room=f'match_{match_id}')

            # ---- Simulate next ball ----
            state = match_states[match_id]
            ball_event = await _simulate_ball(match_id, state)

            # Update stored state
            match_states[match_id].update({
                'over':          ball_event['over'],
                'ball':          ball_event['ball'],
                'total_runs':    ball_event['total_runs'],
                'wickets':       ball_event['wickets'],
                'win_probability': ball_event['win_probability'],
            })

            # Broadcast to all viewers of this match
            await sio.emit('ball_event', ball_event, room=f'match_{match_id}')

            # Wait 3 seconds before next ball
            await asyncio.sleep(3)

    except Exception as e:
        print(f"[Socket] Simulation error for {match_id}: {e}")
    finally:
        active_simulations.discard(match_id)
        print(f"[Socket] Simulation ended for {match_id}")


async def _simulate_ball(match_id: str, state: dict) -> dict:
    """
    Generate one simulated ball event.
    Probabilities are weighted by match situation.
    """
    total_runs    = state.get('total_runs', 0)
    wickets       = state.get('wickets', 0)
    over          = state.get('over', 0)
    ball_in_over  = state.get('ball', 0) + 1   # next ball

    # Move to next over if we've done 6 balls
    if ball_in_over > 6:
        over += 1
        ball_in_over = 1

    wickets_in_hand = 10 - wickets
    target         = state.get('target', 180)
    runs_needed    = target - total_runs
    format_        = state.get('format', 'T20')
    total_balls    = 120 if format_ in ('T20', 'IPL', 'T20I') else 300
    balls_bowled   = over * 6 + ball_in_over
    balls_remaining = total_balls - balls_bowled
    crr            = round(total_runs / max(balls_bowled / 6, 0.1), 2)
    rrr            = round((runs_needed / max(balls_remaining, 1)) * 6, 2)

    # ---- Weighted outcome probabilities ----
    # Adjust weights based on match situation
    # If required rate is very high — increase boundary probability
    pressure = rrr / max(crr, 0.1)

    weights = {
        'dot':    0.35,
        'single': 0.25,
        'two':    0.08,
        'three':  0.02,
        'four':   max(0.08, min(0.20, 0.08 + (pressure - 1) * 0.05)),
        'six':    max(0.05, min(0.15, 0.05 + (pressure - 1) * 0.03)),
        'wicket': max(0.03, min(0.10, 0.07 - wickets_in_hand * 0.003)),
    }

    # Normalize weights so they sum to 1.0
    total_w = sum(weights.values())
    weights = {k: v / total_w for k, v in weights.items()}

    # Pick outcome
    outcomes     = list(weights.keys())
    probabilities = list(weights.values())
    outcome      = random.choices(outcomes, weights=probabilities)[0]

    # Map outcome to runs / wicket
    runs_map = {'dot': 0, 'single': 1, 'two': 2, 'three': 3, 'four': 4, 'six': 6, 'wicket': 0}
    runs_this_ball = runs_map[outcome]
    is_wicket      = (outcome == 'wicket')

    # Update totals
    new_total   = total_runs + runs_this_ball
    new_wickets = wickets + (1 if is_wicket else 0)

    # Get win probability from ML model
    try:
        pred = predict(
            batting_team=state.get('batting_team', 'Team A'),
            bowling_team=state.get('bowling_team', 'Team B'),
            format=format_,
            venue=state.get('venue', 'Unknown'),
            target=target,
            current_score=new_total,
            wickets=new_wickets,
            overs=round(over + ball_in_over / 6, 2),
        )
        new_win_prob = pred['win_probability']
    except Exception:
        new_win_prob = 0.5

    prev_win_prob = state.get('win_probability', 0.5)
    momentum      = round(new_win_prob - prev_win_prob, 4)

    # Track last 3 balls for Groq context
    last_3 = state.get('last_3_balls', [])
    ball_code = 'W' if is_wicket else str(runs_this_ball)
    last_3    = (last_3 + [ball_code])[-3:]   # keep only last 3

    # Get commentary
    commentary_result = await get_commentary(
        match_id      = match_id,
        batting_team  = state.get('batting_team', 'Team A'),
        bowling_team  = state.get('bowling_team', 'Team B'),
        over          = over,
        ball          = ball_in_over,
        runs_needed   = max(runs_needed, 0),
        wickets_left  = wickets_in_hand,
        current_rr    = crr,
        required_rr   = rrr,
        last_3_balls  = last_3,
        win_probability = new_win_prob,
        ball_result   = ball_code,
    )

    # Update last_3 in state
    match_states[match_id]['last_3_balls'] = last_3

    return {
        "over":            over,
        "ball":            ball_in_over,
        "runs_this_ball":  runs_this_ball,
        "is_wicket":       is_wicket,
        "total_runs":      new_total,
        "wickets":         new_wickets,
        "win_probability": new_win_prob,
        "momentum":        momentum,
        "commentary":      commentary_result["commentary"],
        "ball_type":       outcome,
        "is_ai_commentary": commentary_result["is_ai"],
    }


async def _sync_real_score(match_id: str):
    """
    Poll real CricAPI score and update match state.
    If real score diverges from simulation by >5 runs, fast-forward.
    """
    try:
        matches = await get_upcoming_matches()
        real_match = next((m for m in matches if m.get('match_id') == match_id), None)

        if not real_match or not real_match.get('live_score'):
            return

        real_score = real_match['live_score']
        sim_score  = match_states[match_id].get('total_runs', 0)
        real_runs  = real_score.get('current_score', sim_score)

        # If simulation has drifted by more than 5 runs, snap to real score
        if abs(real_runs - sim_score) > 5:
            match_states[match_id]['total_runs'] = real_runs
            match_states[match_id]['wickets']    = real_score.get('wickets', 0)
            print(f"[Socket] Snapped {match_id} to real score: {real_runs}")

    except Exception as e:
        print(f"[Socket] Real score sync failed: {e}")


def _initial_state(match_id: str) -> dict:
    """
    Default initial state for a new match simulation.
    """
    return {
        "match_id":      match_id,
        "batting_team":  "Team A",
        "bowling_team":  "Team B",
        "format":        "T20",
        "venue":         "Unknown",
        "target":        180,
        "total_runs":    0,
        "wickets":       0,
        "over":          0,
        "ball":          0,
        "win_probability": 0.5,
        "last_3_balls":  [],
    }
