// ============================================
// PredictionGame.jsx — Feature 6: Friend Group Prediction Game
//
// 6 SCREENS:
//   home     → Create Room / Join Room buttons
//   create   → Pick match, enter name, get room code
//   join     → Enter room code + name
//   lobby    → See players, share code, host starts
//   question → Current prediction + 20-second timer
//   reveal   → Correct answer + score update + leaderboard
//   final    → 🏆 Cricket Brain of the Match winner screen
//
// REALTIME: Supabase Broadcast channel syncs leaderboard
//           across all players' devices instantly
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { createGameChannel } from '../lib/supabase'

// ============================================
// CONSTANTS
// ============================================
const API = 'https://criciq-backend-8aoj.onrender.com/api/game'  // backend base URL
const QUESTION_TIMER = 20                      // seconds per question

// ============================================
// MAIN COMPONENT
// ============================================
function PredictionGame() {
  const navigate = useNavigate()

  // ---- SCREEN STATE ----
  const [screen, setScreen] = useState('home')

  // ---- MATCHES ----
  const [matches, setMatches] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)

  // ---- PLAYER INFO ----
  const [playerName, setPlayerName] = useState('')
  const [isHost, setIsHost] = useState(false)

  // ---- ROOM ----
  const [roomCode, setRoomCode] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState('')  // for join screen
  const [players, setPlayers] = useState([])

  // ---- QUESTION ----
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)   // index 0-3
  const [hasAnswered, setHasAnswered] = useState(false)
  const [timer, setTimer] = useState(QUESTION_TIMER)
  const timerRef = useRef(null)

  // ---- REVEAL ----
  const [revealData, setRevealData] = useState(null)    // {is_correct, explanation, leaderboard}

  // ---- FINAL ----
  const [finalData, setFinalData] = useState(null)      // {winner, leaderboard}

  // ---- UI STATE ----
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  // ---- SUPABASE CHANNEL ----
  const channelRef = useRef(null)    // keeps channel reference between renders

  // ============================================
  // FETCH MATCHES on page load
  // ============================================
  useEffect(() => {
    axios.get(`${API}/matches`)
      .then(res => {
        setMatches(res.data.matches)
        setSelectedMatch(res.data.matches[0])
      })
      .catch(() => {
        // Fallback mock if backend down
        const mock = [
          { id: 'mi-vs-csk',  title: 'Mumbai Indians vs Chennai Super Kings' },
          { id: 'rcb-vs-kkr', title: 'Royal Challengers Bangalore vs Kolkata Knight Riders' },
          { id: 'gt-vs-rr',   title: 'Gujarat Titans vs Rajasthan Royals' },
        ]
        setMatches(mock)
        setSelectedMatch(mock[0])
      })
  }, [])

  // ============================================
  // SUPABASE REALTIME SETUP
  // Called when entering lobby — subscribes to room channel
  // ============================================
  const setupRealtimeChannel = useCallback((code) => {
    // Clean up old channel if exists
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    // Create new channel for this room
    const channel = createGameChannel(code)

    // Listen for game_started event (host started game)
    channel.on('broadcast', { event: 'game_started' }, ({ payload }) => {
      setCurrentQuestion(payload.current_question)
      setHasAnswered(false)
      setSelectedAnswer(null)
      setTimer(QUESTION_TIMER)
      setScreen('question')
    })

    // Listen for leaderboard updates (after each answer)
    channel.on('broadcast', { event: 'leaderboard_update' }, ({ payload }) => {
      setPlayers(payload.leaderboard || [])
      if (payload.reveal) {
        setRevealData(payload.reveal)
        if (timerRef.current) clearInterval(timerRef.current)
        setScreen('reveal')
      }
    })

    // Listen for next_question event
    channel.on('broadcast', { event: 'next_question' }, ({ payload }) => {
      if (payload.status === 'finished') {
        setFinalData(payload)
        setScreen('final')
      } else {
        setCurrentQuestion(payload.current_question)
        setHasAnswered(false)
        setSelectedAnswer(null)
        setTimer(QUESTION_TIMER)
        setRevealData(null)
        setScreen('question')
      }
    })

    // Listen for player joined (lobby updates)
    channel.on('broadcast', { event: 'player_joined' }, ({ payload }) => {
      setPlayers(payload.players || [])
    })

    channel.subscribe()
    channelRef.current = channel
  }, [])

  // Cleanup channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) channelRef.current.unsubscribe()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ============================================
  // COUNTDOWN TIMER for questions
  // ============================================
  useEffect(() => {
    if (screen !== 'question') return
    if (timerRef.current) clearInterval(timerRef.current)

    setTimer(QUESTION_TIMER)

    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          // Auto-submit "no answer" when time runs out
          if (!hasAnswered) handleAnswer(-1)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [screen, currentQuestion])  // reset timer on new question

  // ============================================
  // CREATE ROOM
  // ============================================
  const createRoom = async () => {
    if (!playerName.trim() || !selectedMatch) return
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API}/create`, {
        match_id: selectedMatch.id,
        host_name: playerName.trim()
      })
      const code = res.data.room_code
      setRoomCode(code)
      setIsHost(true)
      setPlayers([{ name: playerName.trim(), score: 0, is_host: true }])
      setupRealtimeChannel(code)
      setScreen('lobby')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create room. Is backend running?')
    }
    setLoading(false)
  }

  // ============================================
  // JOIN ROOM
  // ============================================
  const joinRoom = async () => {
    if (!playerName.trim() || !roomCodeInput.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API}/join`, {
        room_code: roomCodeInput.trim().toUpperCase(),
        player_name: playerName.trim()
      })
      setRoomCode(res.data.room_code)
      setIsHost(res.data.is_host)
      setPlayers(res.data.players || [])
      setupRealtimeChannel(res.data.room_code)

      // Broadcast that we joined (lobby shows new player)
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast', event: 'player_joined',
          payload: { players: res.data.players }
        })
      }

      if (res.data.status === 'active') {
        // Game already started — fetch current question
        const roomRes = await axios.get(`${API}/room/${res.data.room_code}`)
        setCurrentQuestion(roomRes.data.current_question)
        setScreen('question')
      } else {
        setScreen('lobby')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Room not found! Check the code.')
    }
    setLoading(false)
  }

  // ============================================
  // START GAME (host only)
  // ============================================
  const startGame = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API}/start`, {
        room_code: roomCode,
        host_name: playerName
      })
      setCurrentQuestion(res.data.current_question)

      // Broadcast game_started to all players in channel
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast', event: 'game_started',
          payload: { current_question: res.data.current_question }
        })
      }

      setHasAnswered(false)
      setSelectedAnswer(null)
      setScreen('question')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start game!')
    }
    setLoading(false)
  }

  // ============================================
  // SUBMIT ANSWER
  // ============================================
  const handleAnswer = async (answerIndex) => {
    if (hasAnswered || !currentQuestion) return
    if (timerRef.current) clearInterval(timerRef.current)

    setSelectedAnswer(answerIndex)
    setHasAnswered(true)

    try {
      const res = await axios.post(`${API}/answer`, {
        room_code: roomCode,
        player_name: playerName,
        question_id: currentQuestion.id,
        answer_index: answerIndex
      })

      setRevealData(res.data)
      setPlayers(res.data.leaderboard || [])

      // Broadcast updated leaderboard + reveal to ALL players
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast', event: 'leaderboard_update',
          payload: {
            leaderboard: res.data.leaderboard,
            reveal: res.data   // so others also see the answer reveal
          }
        })
      }

      setScreen('reveal')
    } catch (err) {
      setError('Answer submission failed!')
    }
  }

  // ============================================
  // NEXT QUESTION (host only)
  // ============================================
  const nextQuestion = async () => {
    setLoading(true)
    try {
      const res = await axios.post(`${API}/next-question`, {
        room_code: roomCode,
        host_name: playerName
      })

      // Broadcast next_question event (includes finish state if game over)
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast', event: 'next_question',
          payload: res.data
        })
      }

      if (res.data.status === 'finished') {
        setFinalData(res.data)
        setScreen('final')
      } else {
        setCurrentQuestion(res.data.current_question)
        setHasAnswered(false)
        setSelectedAnswer(null)
        setRevealData(null)
        setScreen('question')
      }
    } catch (err) {
      setError('Could not advance to next question!')
    }
    setLoading(false)
  }

  // ============================================
  // COPY ROOM CODE to clipboard
  // ============================================
  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ============================================
  // RESET — back to home
  // ============================================
  const reset = () => {
    if (channelRef.current) channelRef.current.unsubscribe()
    if (timerRef.current) clearInterval(timerRef.current)
    setScreen('home')
    setRoomCode('')
    setRoomCodeInput('')
    setPlayerName('')
    setPlayers([])
    setCurrentQuestion(null)
    setRevealData(null)
    setFinalData(null)
    setError(null)
    setHasAnswered(false)
    setSelectedAnswer(null)
  }

  // ============================================
  // ---- SCREEN 1: HOME ----
  // ============================================
  if (screen === 'home') return (
    <div className="min-h-screen bg-gray-950 text-white p-5">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-white text-xl">←</button>
        <div>
          <h1 className="text-2xl font-bold">👥 Prediction Game</h1>
          <p className="text-gray-500 text-sm">Predict with friends · win Cricket Brain 🏆</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-8">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">How It Works</p>
        <div className="space-y-2">
          {['1️⃣  Host creates a room, shares 6-letter code', '2️⃣  Friends join from any device', '3️⃣  Answer 5 live cricket predictions', '4️⃣  Fastest + most correct wins 🏆'].map(s => (
            <p key={s} className="text-gray-300 text-sm">{s}</p>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <button onClick={() => setScreen('create')} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-5 rounded-2xl text-lg">
          🎯 Create Room
        </button>
        <button onClick={() => setScreen('join')} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-5 rounded-2xl text-lg border border-gray-700">
          🚪 Join Room
        </button>
      </div>
    </div>
  )

  // ============================================
  // ---- SCREEN 2a: CREATE ROOM ----
  // ============================================
  if (screen === 'create') return (
    <div className="min-h-screen bg-gray-950 text-white p-5">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setScreen('home')} className="text-gray-500 hover:text-white text-xl">←</button>
        <h1 className="text-xl font-bold">🎯 Create Room</h1>
      </div>

      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-gray-400 text-sm mb-2">Your Name</label>
          <input
            type="text" placeholder="e.g. Shansit"
            value={playerName} onChange={e => setPlayerName(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white"
          />
        </div>

        {/* Match selector */}
        <div>
          <label className="block text-gray-400 text-sm mb-2">Pick Match</label>
          <div className="space-y-2">
            {matches.map(m => (
              <button key={m.id} onClick={() => setSelectedMatch(m)}
                className={`w-full text-left rounded-xl p-4 border transition-all ${selectedMatch?.id === m.id ? 'bg-pink-950 border-pink-600 text-pink-200' : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'}`}>
                🏏 {m.title}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">⚠️ {error}</p>}

        <button onClick={createRoom} disabled={!playerName.trim() || !selectedMatch || loading}
          className="w-full bg-pink-600 hover:bg-pink-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-2xl">
          {loading ? '⏳ Creating...' : '🎯 Create Room'}
        </button>
      </div>
    </div>
  )

  // ============================================
  // ---- SCREEN 2b: JOIN ROOM ----
  // ============================================
  if (screen === 'join') return (
    <div className="min-h-screen bg-gray-950 text-white p-5">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setScreen('home')} className="text-gray-500 hover:text-white text-xl">←</button>
        <h1 className="text-xl font-bold">🚪 Join Room</h1>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-gray-400 text-sm mb-2">Room Code (6 letters)</label>
          <input
            type="text" placeholder="e.g. MI7X4K" maxLength={6}
            value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-widest uppercase"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-2">Your Name</label>
          <input
            type="text" placeholder="e.g. Rahul"
            value={playerName} onChange={e => setPlayerName(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white"
          />
        </div>

        {error && <p className="text-red-400 text-sm">⚠️ {error}</p>}

        <button onClick={joinRoom} disabled={!playerName.trim() || !roomCodeInput.trim() || loading}
          className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-2xl">
          {loading ? '⏳ Joining...' : '🚪 Join Room'}
        </button>
      </div>
    </div>
  )

  // ============================================
  // ---- SCREEN 3: LOBBY ----
  // ============================================
  if (screen === 'lobby') return (
    <div className="min-h-screen bg-gray-950 text-white p-5">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={reset} className="text-gray-500 hover:text-white text-xl">←</button>
        <div>
          <h1 className="text-xl font-bold">🎮 Lobby</h1>
          <p className="text-gray-500 text-xs">{selectedMatch?.title || 'CricIQ Prediction Game'}</p>
        </div>
      </div>

      {/* Room code — big and shareable */}
      <div className="bg-pink-950 border border-pink-700 rounded-2xl p-6 text-center mb-6">
        <p className="text-pink-400 text-xs font-semibold uppercase tracking-widest mb-2">Room Code</p>
        <p className="text-white text-5xl font-mono font-bold tracking-widest mb-4">{roomCode}</p>
        <button onClick={copyCode}
          className="bg-pink-700 hover:bg-pink-600 text-white text-sm font-bold px-6 py-2 rounded-xl">
          {copied ? '✅ Copied!' : '📋 Copy Code'}
        </button>
        <p className="text-pink-300 text-xs mt-3">Share this with friends to play together!</p>
      </div>

      {/* Players list */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
          Players in Room ({players.length})
        </p>
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
            <div className="w-8 h-8 rounded-full bg-pink-900 flex items-center justify-center text-sm font-bold text-pink-300">
              {p.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-white font-medium">{p.name}</span>
            {p.is_host && <span className="text-xs bg-yellow-900 text-yellow-400 px-2 py-0.5 rounded-full">Host</span>}
          </div>
        ))}
        <p className="text-gray-600 text-xs mt-3">Waiting for more friends to join...</p>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">⚠️ {error}</p>}

      {/* Start button — only for host */}
      {isHost ? (
        <button onClick={startGame} disabled={loading}
          className="w-full bg-pink-600 hover:bg-pink-500 disabled:bg-gray-800 text-white font-bold py-5 rounded-2xl text-lg">
          {loading ? '⏳ Starting...' : `🏏 Start Game (${players.length} player${players.length !== 1 ? 's' : ''})`}
        </button>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <p className="text-lg">⏳</p>
          <p>Waiting for host to start the game...</p>
        </div>
      )}
    </div>
  )

  // ============================================
  // ---- SCREEN 4: QUESTION ----
  // ============================================
  if (screen === 'question' && currentQuestion) return (
    <div className="min-h-screen bg-gray-950 text-white p-5">

      {/* Header: Q number + timer */}
      <div className="flex items-center justify-between mb-6">
        <span className="bg-gray-800 text-gray-300 text-sm font-bold px-4 py-2 rounded-full">
          Q{currentQuestion.question_num}/{currentQuestion.total}
        </span>
        {/* Timer ring — changes color when low */}
        <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-lg ${timer <= 5 ? 'border-red-500 text-red-400' : timer <= 10 ? 'border-orange-500 text-orange-400' : 'border-pink-500 text-pink-300'}`}>
          {timer}
        </div>
      </div>

      {/* Points badge */}
      <div className="text-center mb-2">
        <span className="bg-yellow-900 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">
          +{currentQuestion.points} pts for correct
        </span>
      </div>

      {/* Question text */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 text-center">
        <p className="text-white text-xl font-bold leading-relaxed">
          {currentQuestion.text}
        </p>
      </div>

      {/* Answer options */}
      <div className="space-y-3">
        {currentQuestion.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            disabled={hasAnswered}
            className={`
              w-full text-left p-4 rounded-2xl border font-medium transition-all
              ${hasAnswered
                ? selectedAnswer === i
                  ? 'bg-pink-900 border-pink-500 text-pink-200'   // selected
                  : 'bg-gray-900 border-gray-800 text-gray-600'   // not selected
                : 'bg-gray-900 border-gray-700 text-white hover:border-pink-500 hover:bg-pink-950 active:scale-95'
              }
            `}
          >
            <span className="text-gray-500 mr-3">{['A', 'B', 'C', 'D'][i]}.</span>
            {option}
          </button>
        ))}
      </div>

      {hasAnswered && (
        <div className="text-center mt-6 text-gray-500 animate-pulse">
          ⏳ Answer locked! Waiting for reveal...
        </div>
      )}
    </div>
  )

  // ============================================
  // ---- SCREEN 5: REVEAL ----
  // ============================================
  if (screen === 'reveal' && revealData) return (
    <div className="min-h-screen bg-gray-950 text-white p-5">

      {/* Result banner */}
      <div className={`rounded-2xl p-6 text-center mb-6 ${revealData.is_correct ? 'bg-green-950 border border-green-700' : 'bg-red-950 border border-red-700'}`}>
        <p className="text-5xl mb-3">{revealData.is_correct ? '✅' : '❌'}</p>
        <p className={`text-2xl font-bold ${revealData.is_correct ? 'text-green-400' : 'text-red-400'}`}>
          {revealData.is_correct ? `+${revealData.points_earned} points!` : 'Wrong answer'}
        </p>
        {revealData.already_answered && (
          <p className="text-gray-400 text-sm mt-1">You already answered this one!</p>
        )}
      </div>

      {/* Correct answer */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-4">
        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Correct Answer</p>
        <p className="text-white font-bold text-base">{revealData.correct_answer}</p>
        <p className="text-gray-400 text-sm mt-2 italic">{revealData.explanation}</p>
      </div>

      {/* Live Leaderboard */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
          📊 Leaderboard
        </p>
        {(revealData.leaderboard || []).map((p, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
            <div className="flex items-center gap-3">
              <span className={`text-lg ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}
              </span>
              <span className={`font-medium ${p.name === playerName ? 'text-pink-300' : 'text-white'}`}>
                {p.name} {p.name === playerName ? '(you)' : ''}
              </span>
            </div>
            <span className="text-yellow-400 font-bold">{p.score} pts</span>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-3">⚠️ {error}</p>}

      {/* Next question — host only */}
      {isHost ? (
        <button onClick={nextQuestion} disabled={loading}
          className="w-full bg-pink-600 hover:bg-pink-500 disabled:bg-gray-800 text-white font-bold py-4 rounded-2xl">
          {loading ? '⏳...' : `Next Question →`}
        </button>
      ) : (
        <div className="text-center text-gray-500 py-4">⏳ Waiting for host to continue...</div>
      )}
    </div>
  )

  // ============================================
  // ---- SCREEN 6: FINAL — 🏆 WINNER ----
  // ============================================
  if (screen === 'final' && finalData) {
    const winner = finalData.winner
    const isWinner = winner?.name === playerName

    return (
      <div className="min-h-screen bg-gray-950 text-white p-5">

        {/* Trophy header */}
        <div className="text-center mb-8 mt-4">
          <p className="text-7xl mb-4">{isWinner ? '🏆' : '🎉'}</p>
          <h1 className="text-2xl font-bold text-yellow-400 mb-2">Cricket Brain of the Match!</h1>
          {winner && (
            <div className="bg-yellow-950 border border-yellow-700 rounded-2xl p-4 mt-4">
              <p className="text-yellow-300 text-3xl font-bold">{winner.name}</p>
              <p className="text-yellow-500 text-sm mt-1">{winner.score} points · {winner.correct} correct</p>
            </div>
          )}
          {isWinner && (
            <p className="text-green-400 font-bold mt-3 text-lg">🎊 That's YOU! Congratulations!</p>
          )}
        </div>

        {/* Final leaderboard */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">Final Standings</p>
          {(finalData.leaderboard || []).map((p, i) => (
            <div key={i} className={`flex items-center justify-between py-3 border-b border-gray-800 last:border-0 ${p.name === playerName ? 'bg-gray-800 rounded-xl px-3' : ''}`}>
              <div className="flex items-center gap-3">
                <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                <span className={`font-medium ${p.name === playerName ? 'text-pink-300' : 'text-white'}`}>
                  {p.name} {p.name === playerName ? '(you)' : ''}
                </span>
              </div>
              <div className="text-right">
                <p className="text-yellow-400 font-bold">{p.score} pts</p>
                <p className="text-gray-500 text-xs">{p.correct}/5 correct</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={reset}
          className="w-full bg-pink-700 hover:bg-pink-600 text-white font-bold py-4 rounded-2xl">
          🔄 Play Again
        </button>
      </div>
    )
  }

  // Fallback
  return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>
}

export default PredictionGame
