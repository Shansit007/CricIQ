// ============================================
// socket.ts — WebSocket connection manager
// Handles connecting to the live match socket
// ============================================

// io is the Socket.io client — it connects to our FastAPI socket server
import { io, Socket } from 'socket.io-client';

// The WebSocket server URL from .env
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8000';

// We keep one socket instance per match in this map
// Key: match_id, Value: the socket connection
const sockets: Map<string, Socket> = new Map();

// ---- Connect to a live match ----
// Call this when user opens the LiveMatch page
// Returns the socket object so you can listen for events
export function connectToMatch(matchId: string): Socket {
  // Don't create a duplicate connection for same match
  if (sockets.has(matchId)) {
    return sockets.get(matchId)!;
  }

  // Create a new Socket.io connection
  const socket = io(WS_URL, {
    path: '/ws/socket.io',           // backend socket path
    query: { match_id: matchId },    // tell server which match we want
    transports: ['websocket'],       // use WebSocket, not long-polling
    reconnectionAttempts: 5,         // retry up to 5 times if connection drops
    reconnectionDelay: 2000,         // wait 2 seconds between retries
  });

  // Log connection events (helpful for debugging)
  socket.on('connect',    () => console.log(`[Socket] Connected to match ${matchId}`));
  socket.on('disconnect', () => console.log(`[Socket] Disconnected from match ${matchId}`));
  socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));

  // Save socket so we can reuse or disconnect it later
  sockets.set(matchId, socket);
  return socket;
}

// ---- Disconnect from a match ----
// Call this when user leaves the LiveMatch page (component unmounts)
export function disconnectFromMatch(matchId: string): void {
  const socket = sockets.get(matchId);
  if (socket) {
    socket.disconnect();           // close the connection
    sockets.delete(matchId);       // remove from our map
    console.log(`[Socket] Cleaned up match ${matchId}`);
  }
}

// ---- Get existing socket ----
// Use this if you need the socket in a component that didn't create it
export function getMatchSocket(matchId: string): Socket | undefined {
  return sockets.get(matchId);
}
