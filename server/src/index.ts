import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { generateToken } from './services/livekit.js';
import { analyzeDebateImpact } from './services/openai.js';
import { setupDeepgramStream } from './services/deepgram.js';
import { saveMatchResult, getRandomTopic } from './services/supabase.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

interface MatchState {
  id: string;
  momentum: number;
  phase: 'Lobby' | 'Opening' | 'Crossfire' | 'Closing' | 'SuddenDeath' | 'Results';
  timeLeft: number;
  leftPlayer?: { id: string, name: string };
  rightPlayer?: { id: string, name: string };
  transcripts: string[];
  topic: { title: string, description: string };
}

const matches: Record<string, MatchState> = {};

const PHASE_DURATIONS = {
  Lobby: 15,
  Opening: 60,
  Crossfire: 90,
  Closing: 60,
  SuddenDeath: 30,
  Results: 0
};

/**
 * Transitions a match to the next phase.
 */
const transitionPhase = async (matchId: string) => {
  const match = matches[matchId];
  if (!match) return;

  const phases: MatchState['phase'][] = ['Lobby', 'Opening', 'Crossfire', 'Closing', 'Results'];
  const currentIndex = phases.indexOf(match.phase);

  if (currentIndex < phases.length - 1) {
    match.phase = phases[currentIndex + 1];
    match.timeLeft = PHASE_DURATIONS[match.phase];

    if (match.phase === 'Results') {
      await saveMatchResult(matchId, match.momentum, match.transcripts);
    }

    io.to(matchId).emit('phase_transition', { phase: match.phase, timeLeft: match.timeLeft });
  }
};

/**
 * Global game tick (1s).
 */
setInterval(() => {
  Object.keys(matches).forEach(async (matchId) => {
    const match = matches[matchId];
    if (match.phase === 'Results') return;

    match.timeLeft -= 1;

    if (match.timeLeft <= 0) {
      await transitionPhase(matchId);
    }

    io.to(matchId).emit('game_update', {
      momentum: match.momentum,
      phase: match.phase,
      timeLeft: match.timeLeft,
      topic: match.topic
    });
  });
}, 1000);

// Endpoints
app.get('/token', async (req, res) => {
  try {
    const { room, identity, host } = req.query;
    if (!room || !identity) {
      return res.status(400).json({ error: 'Room and identity are required' });
    }
    const token = await generateToken(room as string, identity as string, host === 'true');
    res.json({ token });
  } catch (err) {
    console.error('Token generation failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_match', async (matchId: string) => {
    socket.join(matchId);

    if (!matches[matchId]) {
      const topic = await getRandomTopic();
      matches[matchId] = {
        id: matchId,
        momentum: 50,
        phase: 'Lobby',
        timeLeft: PHASE_DURATIONS.Lobby,
        transcripts: [],
        topic: { title: topic.title, description: topic.description }
      };
    }

    console.log(`User ${socket.id} joined match ${matchId}`);
    socket.emit('game_init', matches[matchId]);
  });

  // Handle Voice Transcripts
  socket.on('transcript_data', async (data: { matchId: string, text: string }) => {
    const match = matches[data.matchId];
    if (!match || match.phase === 'Results' || match.phase === 'Lobby') return;

    match.transcripts.push(data.text);
    const delta = await analyzeDebateImpact(data.text, match.phase);
    match.momentum = Math.max(0, Math.min(100, match.momentum + delta));

    io.to(data.matchId).emit('game_update', {
      momentum: match.momentum,
      lastDelta: delta,
      transcript: data.text
    });
  });

  // Crowd Voting
  socket.on('crowd_vote', (data: { matchId: string, side: 'left' | 'right' }) => {
    const match = matches[data.matchId];
    if (!match || match.phase === 'Results') return;

    const delta = data.side === 'left' ? -1 : 1;
    match.momentum = Math.max(0, Math.min(100, match.momentum + delta));
    io.to(data.matchId).emit('game_update', { momentum: match.momentum });
  });

  const dgConnections: Record<string, any> = {};

  socket.on('audio_chunk', (data: { matchId: string, chunk: Buffer, volume: number }) => {
    io.to(data.matchId).emit('voice_activity', { side: 'left', volume: data.volume });

    if (!dgConnections[socket.id]) {
      dgConnections[socket.id] = setupDeepgramStream((transcript) => {
        socket.emit('transcript_data', { matchId: data.matchId, text: transcript });
      });
    }

    const dg = dgConnections[socket.id];
    if (dg && dg.getReadyState() === 1) {
      dg.send(data.chunk);
    }
  });

  socket.on('disconnect', () => {
    if (dgConnections[socket.id]) {
      delete dgConnections[socket.id];
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Game engine running on port ${PORT}`);
});
