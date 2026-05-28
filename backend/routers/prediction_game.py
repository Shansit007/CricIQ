# ============================================
# prediction_game.py — Feature 6: Friend Group Prediction Game
#
# FLOW:
#   Host creates room → gets 6-char code like "MI7X4K"
#   Friends join with code → enter name
#   Host starts game → 5 prediction questions appear
#   Players pick answers → scores update → leaderboard
#   After 5 questions → "Cricket Brain of the Match" crowned!
#
# ARCHITECTURE:
#   - FastAPI: all game logic + scoring (in-memory)
#   - Frontend: broadcasts score updates via Supabase Realtime
#   - No database needed — sessions live in memory
# ============================================

import os           # read environment variables
import random       # generate room codes
import string       # letters + digits for room codes
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel              # request body validation
from dotenv import load_dotenv

load_dotenv()

# All routes start with /api/game
router = APIRouter(
    prefix="/api/game",
    tags=["Prediction Game"]
)

# ============================================
# IN-MEMORY GAME STORAGE
# {room_code: room_data_dict}
# Lives in memory — resets on server restart (fine for demo)
# ============================================
game_rooms = {}

# ============================================
# PREDICTION QUESTIONS — 5 per match
# correct_index = which option (0-3) is the right answer
# points = how many points for getting it right
# explanation = shown after answer is revealed
# ============================================
MATCH_QUESTIONS = {

    # ---- MI vs CSK ----
    "mi-vs-csk": [
        {
            "id": 1,
            "text": "🏏 Will MI score 160+ in their innings?",
            "options": [
                "Yes, they'll smash it! 💥",
                "No, CSK will keep them under 160",
                "Exactly 160 🎯",
                "MI collapse under 130! 💀"
            ],
            "correct_index": 0,   # Yes — MI scored 178
            "points": 100,
            "explanation": "MI posted 178/5 — Rohit, Hardik and Tim David made sure of it! 🔥"
        },
        {
            "id": 2,
            "text": "♟️ Will CSK drop a catch in this innings?",
            "options": [
                "Yes — CSK butter fingers! 🙌",
                "No, CSK will be clinical",
                "Multiple drops! 😱",
                "No catches offered"
            ],
            "correct_index": 0,   # Yes — dropped Rohit on 38
            "points": 150,
            "explanation": "CSK dropped Rohit Sharma on 38 at square leg — that reprieve cost them the match! 🙌"
        },
        {
            "id": 3,
            "text": "🔥 Who will be MI's top scorer?",
            "options": [
                "Rohit Sharma 🌊",
                "Suryakumar Yadav ⚡",
                "Hardik Pandya 💪",
                "Tim David 🇸🇬"
            ],
            "correct_index": 0,   # Rohit — scored 41
            "points": 200,
            "explanation": "Rohit Sharma top scored with 41! The drop chance on 38 gave him extra life."
        },
        {
            "id": 4,
            "text": "📊 Predict MI's final score range:",
            "options": [
                "140–159",
                "160–179 🎯",
                "180–199",
                "200+ Carnage! 🚀"
            ],
            "correct_index": 1,   # 160-179 (scored 178)
            "points": 150,
            "explanation": "MI finished at 178/5 — right in the 160-179 range. Nicely called! 🎯"
        },
        {
            "id": 5,
            "text": "🏆 Who wins the match?",
            "options": [
                "Mumbai Indians 🔵",
                "Chennai Super Kings 🟡",
                "Super Over! ⚡",
                "Rain stops play 🌧️"
            ],
            "correct_index": 0,   # MI won by 23 runs
            "points": 100,
            "explanation": "MI won by 23 runs! Bumrah's 4 overs of brilliance sealed the game. 🏆"
        }
    ],

    # ---- RCB vs KKR ----
    "rcb-vs-kkr": [
        {
            "id": 1,
            "text": "👑 Will Virat Kohli score a fifty?",
            "options": [
                "Yes — King Kohli delivers! 👑",
                "No, Starc will get him early",
                "He'll get out on 49 😤",
                "Kohli hits a century! 🎆"
            ],
            "correct_index": 0,   # Yes — scored 72
            "points": 150,
            "explanation": "Kohli was magnificent — 72 off 49 balls! A Chinnaswamy classic. 👑"
        },
        {
            "id": 2,
            "text": "💥 Will RCB lose 3+ wickets in overs 15-18?",
            "options": [
                "Yes — the collapse is coming! 📉",
                "No, they'll hold on",
                "Exactly 2 wickets",
                "No wickets — RCB dominate"
            ],
            "correct_index": 0,   # Yes — 3 wickets in 2 overs
            "points": 200,
            "explanation": "RCB collapsed spectacularly — 3 wickets in 2 overs as Ferguson ran riot! 📉"
        },
        {
            "id": 3,
            "text": "📊 RCB's final score range:",
            "options": [
                "140–149",
                "150–159",
                "160–169 🎯",
                "170+"
            ],
            "correct_index": 2,   # 160-169 (scored 163)
            "points": 150,
            "explanation": "RCB finished at 163/6 — a decent but chaseable total on this surface."
        },
        {
            "id": 4,
            "text": "⚡ Will KKR's Phil Salt score 20+ in the chase?",
            "options": [
                "Yes — Salt will explode! 💥",
                "No, RCB will get him cheap",
                "Salt hits a fifty! 🚀",
                "Salt out first ball 😬"
            ],
            "correct_index": 0,   # Yes — Salt scored 22+
            "points": 100,
            "explanation": "Phil Salt smashed 22+ in the powerplay — the chase was effectively over by over 5!"
        },
        {
            "id": 5,
            "text": "🏆 Who wins?",
            "options": [
                "Royal Challengers Bangalore 🔴",
                "Kolkata Knight Riders 🟣",
                "Super Over! ⚡",
                "No result 😴"
            ],
            "correct_index": 1,   # KKR won by 6 wickets
            "points": 100,
            "explanation": "KKR won by 6 wickets! Salt + Narine's powerplay assault was completely unplayable. 🟣"
        }
    ],

    # ---- GT vs RR ----
    "gt-vs-rr": [
        {
            "id": 1,
            "text": "🌟 Will Shubman Gill score a fifty?",
            "options": [
                "Yes — Gill is in god mode! 🌟",
                "No, Boult will get him early",
                "He'll fall on 49 😤",
                "Gill smashes a century! 🎆"
            ],
            "correct_index": 0,   # Yes — scored 89
            "points": 150,
            "explanation": "Gill was breathtaking — 89 off 58 balls. One of the great IPL innings! 🌟"
        },
        {
            "id": 2,
            "text": "📊 GT's final total range:",
            "options": [
                "140–154",
                "155–169",
                "170–184 🎯",
                "185+"
            ],
            "correct_index": 2,   # 170-184 (scored 171)
            "points": 150,
            "explanation": "GT posted 171/6 — right in the 170-184 range. Gill's innings carried them there!"
        },
        {
            "id": 3,
            "text": "💀 Will both RR openers fail (under 15 runs each)?",
            "options": [
                "Yes — GT will strike early! ⚡",
                "No, at least one will fire",
                "Both will score fifties! 🚀",
                "One out first ball"
            ],
            "correct_index": 0,   # Yes — Jaiswal duck, Buttler 14
            "points": 200,
            "explanation": "Both openers failed! Jaiswal golden duck, Buttler out for 14 — Shami was unplayable! ⚡"
        },
        {
            "id": 4,
            "text": "🏏 Will Sanju Samson score 30+ trying to rescue RR?",
            "options": [
                "Yes — Captain stands up! 💪",
                "No, Shami gets him cheap",
                "Samson smashes a match-winning 70! 🔥",
                "Samson retired hurt"
            ],
            "correct_index": 0,   # Yes — Samson scored 26+ with sixes
            "points": 100,
            "explanation": "Samson fought hard with 26+ and two big sixes, but it wasn't enough against GT's total!"
        },
        {
            "id": 5,
            "text": "🏆 Who wins?",
            "options": [
                "Gujarat Titans 🔵",
                "Rajasthan Royals 🩷",
                "Super Over! ⚡",
                "Rain stops play 🌧️"
            ],
            "correct_index": 0,   # GT won by 18 runs
            "points": 100,
            "explanation": "GT won by 18 runs! Gill's masterclass + Shami's death bowling = perfect team performance. 🏆"
        }
    ]
}

# Match titles for display
MATCH_TITLES = {
    "mi-vs-csk":  "Mumbai Indians vs Chennai Super Kings",
    "rcb-vs-kkr": "Royal Challengers Bangalore vs Kolkata Knight Riders",
    "gt-vs-rr":   "Gujarat Titans vs Rajasthan Royals"
}

# ============================================
# HELPER: generate room code
# Returns 6-char string like "MI7X4K"
# ============================================
def generate_room_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

# ============================================
# REQUEST BODY MODELS
# ============================================
class CreateRoomRequest(BaseModel):
    match_id: str    # e.g. "mi-vs-csk"
    host_name: str   # e.g. "Shansit"

class JoinRoomRequest(BaseModel):
    room_code: str   # e.g. "MI7X4K"
    player_name: str

class StartGameRequest(BaseModel):
    room_code: str
    host_name: str   # only host can start

class AnswerRequest(BaseModel):
    room_code: str
    player_name: str
    question_id: int       # 1-5
    answer_index: int      # 0-3 (which option they picked)

class NextQuestionRequest(BaseModel):
    room_code: str
    host_name: str

# ============================================
# ROUTE 1: GET /api/game/matches
# Returns available matches for game creation
# ============================================
@router.get("/matches")
def get_matches():
    """Returns list of matches available for the prediction game"""
    return {
        "matches": [
            {"id": mid, "title": title}
            for mid, title in MATCH_TITLES.items()
        ]
    }

# ============================================
# ROUTE 2: POST /api/game/create
# Host creates a new room — gets back a room code
# ============================================
@router.post("/create")
def create_room(req: CreateRoomRequest):
    """Creates a new game room, returns a shareable room code"""

    # Check match exists
    if req.match_id not in MATCH_QUESTIONS:
        raise HTTPException(status_code=404, detail="Match not found!")

    # Generate unique room code
    room_code = generate_room_code()
    while room_code in game_rooms:      # make sure it's unique
        room_code = generate_room_code()

    # Create the room in memory
    game_rooms[room_code] = {
        "room_code": room_code,
        "match_id": req.match_id,
        "match_title": MATCH_TITLES[req.match_id],
        "host": req.host_name,
        "status": "waiting",            # waiting → active → finished
        "current_question": 0,          # index into questions list
        "players": {                     # dict: name → player data
            req.host_name: {
                "name": req.host_name,
                "score": 0,
                "correct": 0,
                "is_host": True,
                "answers": []            # list of answered question IDs
            }
        },
        "questions": MATCH_QUESTIONS[req.match_id],
        "created_at": datetime.now().isoformat()
    }

    return {
        "room_code": room_code,
        "match_title": MATCH_TITLES[req.match_id],
        "player_name": req.host_name,
        "is_host": True,
        "message": f"Room created! Share code: {room_code}"
    }

# ============================================
# ROUTE 3: POST /api/game/join
# Player joins an existing room with a code
# ============================================
@router.post("/join")
def join_room(req: JoinRoomRequest):
    """Player joins room with the shared code"""

    room_code = req.room_code.upper().strip()
    room = game_rooms.get(room_code)

    if not room:
        raise HTTPException(status_code=404, detail="Room not found! Check the code and try again.")
    if room["status"] == "finished":
        raise HTTPException(status_code=400, detail="This game is already finished!")

    # Add player if not already in room (handle page refresh = rejoin)
    if req.player_name not in room["players"]:
        room["players"][req.player_name] = {
            "name": req.player_name,
            "score": 0,
            "correct": 0,
            "is_host": False,
            "answers": []
        }

    # Return current room state (safe — no correct answers exposed)
    return {
        "room_code": room_code,
        "match_title": room["match_title"],
        "player_name": req.player_name,
        "is_host": room["host"] == req.player_name,
        "status": room["status"],
        "players": [
            {"name": p["name"], "score": p["score"], "is_host": p["is_host"]}
            for p in room["players"].values()
        ],
        "host": room["host"],
        "message": f"Joined room {room_code}! 🏏"
    }

# ============================================
# ROUTE 4: GET /api/game/room/{room_code}
# Returns current room state (for polling / page refresh)
# ============================================
@router.get("/room/{room_code}")
def get_room(room_code: str):
    """Returns full room state — used for polling and rejoining"""
    room = game_rooms.get(room_code.upper())
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    q_index = room["current_question"]
    questions = room["questions"]

    # Only send question text + options — NOT the correct_index
    current_q = None
    if room["status"] == "active" and q_index < len(questions):
        q = questions[q_index]
        current_q = {
            "id": q["id"],
            "text": q["text"],
            "options": q["options"],
            "points": q["points"],
            "question_num": q_index + 1,
            "total": len(questions)
        }

    return {
        "room_code": room_code.upper(),
        "match_title": room["match_title"],
        "host": room["host"],
        "status": room["status"],
        "current_question": current_q,
        "players": sorted(
            [{"name": p["name"], "score": p["score"], "correct": p["correct"], "is_host": p["is_host"]}
             for p in room["players"].values()],
            key=lambda p: p["score"],
            reverse=True    # highest score first
        )
    }

# ============================================
# ROUTE 5: POST /api/game/start
# Host starts the game — all players move to question screen
# ============================================
@router.post("/start")
def start_game(req: StartGameRequest):
    """Host clicks Start — game moves from lobby to first question"""
    room_code = req.room_code.upper()
    room = game_rooms.get(room_code)

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["host"] != req.host_name:
        raise HTTPException(status_code=403, detail="Only the host can start the game!")
    if len(room["players"]) < 1:
        raise HTTPException(status_code=400, detail="Need at least 1 player!")

    room["status"] = "active"

    # Return first question (safe — no correct_index)
    q = room["questions"][0]
    return {
        "status": "active",
        "current_question": {
            "id": q["id"],
            "text": q["text"],
            "options": q["options"],
            "points": q["points"],
            "question_num": 1,
            "total": len(room["questions"])
        },
        "players": list(room["players"].keys()),
        "message": "Game started! First question incoming 🏏"
    }

# ============================================
# ROUTE 6: POST /api/game/answer
# Player submits their answer — returns result + leaderboard
# ============================================
@router.post("/answer")
def submit_answer(req: AnswerRequest):
    """
    Player submits answer for current question.
    Returns: correct/wrong, points earned, explanation, leaderboard.
    Frontend then broadcasts leaderboard to Supabase channel.
    """
    room_code = req.room_code.upper()
    room = game_rooms.get(room_code)

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["status"] != "active":
        raise HTTPException(status_code=400, detail="Game is not active!")

    player = room["players"].get(req.player_name)
    if not player:
        raise HTTPException(status_code=404, detail="You're not in this room!")

    q_index = room["current_question"]
    if q_index >= len(room["questions"]):
        raise HTTPException(status_code=400, detail="All questions done!")

    question = room["questions"][q_index]

    # Check if player already answered this question
    already_answered = req.question_id in player["answers"]
    if already_answered:
        # Return current state without re-scoring
        leaderboard = sorted(
            [{"name": p["name"], "score": p["score"], "correct": p["correct"]}
             for p in room["players"].values()],
            key=lambda x: x["score"], reverse=True
        )
        return {
            "already_answered": True,
            "is_correct": False,
            "points_earned": 0,
            "correct_answer": question["options"][question["correct_index"]],
            "explanation": question["explanation"],
            "leaderboard": leaderboard,
            "all_answered": _all_answered(room, req.question_id)
        }

    # ---- Score the answer ----
    is_correct = (req.answer_index == question["correct_index"])
    points = question["points"] if is_correct else 0

    # Update player's score
    player["score"] += points
    if is_correct:
        player["correct"] += 1
    player["answers"].append(req.question_id)   # mark as answered

    # Build current leaderboard
    leaderboard = sorted(
        [{"name": p["name"], "score": p["score"], "correct": p["correct"]}
         for p in room["players"].values()],
        key=lambda x: x["score"], reverse=True
    )

    return {
        "already_answered": False,
        "is_correct": is_correct,
        "points_earned": points,
        "correct_answer": question["options"][question["correct_index"]],
        "explanation": question["explanation"],
        "leaderboard": leaderboard,
        "all_answered": _all_answered(room, req.question_id)
    }

# ============================================
# ROUTE 7: POST /api/game/next-question
# Host advances to next question (or ends game)
# ============================================
@router.post("/next-question")
def next_question(req: NextQuestionRequest):
    """Host advances to the next question after everyone has answered"""
    room_code = req.room_code.upper()
    room = game_rooms.get(room_code)

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    room["current_question"] += 1

    # Check if all questions done
    if room["current_question"] >= len(room["questions"]):
        room["status"] = "finished"
        leaderboard = sorted(
            [{"name": p["name"], "score": p["score"], "correct": p["correct"]}
             for p in room["players"].values()],
            key=lambda x: x["score"], reverse=True
        )
        winner = leaderboard[0] if leaderboard else None
        return {
            "status": "finished",
            "leaderboard": leaderboard,
            "winner": winner,
            "trophy_message": f"🏆 {winner['name']} is the Cricket Brain of the Match!" if winner else "Game over!"
        }

    # Return next question (safe — no correct_index)
    q = room["questions"][room["current_question"]]
    return {
        "status": "active",
        "current_question": {
            "id": q["id"],
            "text": q["text"],
            "options": q["options"],
            "points": q["points"],
            "question_num": room["current_question"] + 1,
            "total": len(room["questions"])
        }
    }

# ============================================
# HELPER: check if all players answered this question
# ============================================
def _all_answered(room: dict, question_id: int) -> bool:
    """Returns True if every player has answered this question"""
    return all(
        question_id in p["answers"]
        for p in room["players"].values()
    )
