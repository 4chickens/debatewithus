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
import { saveMatchResult, getRandomTopic, createUser, findUserByIdentifier, getActiveTopics, submitTopic, updateTopicStatus, verifyUserCode, deleteUnverifiedUser, uploadImage } from './services/supabase.js';
import { sendVerificationEmail } from './services/mail.js';
import { authenticateToken, authorizeAdmin, generateUserToken, AuthRequest } from './middleware/auth.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';

const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://debatewithus.vercel.app';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    const isAllowed =
      origin === allowedOrigin ||
      origin.startsWith('http://localhost') ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV === 'development';

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost') || origin.endsWith('.vercel.app') || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
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
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.4'
  });
});

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

// --- Auth Routes ---

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await findUserByIdentifier(email);
    if (existing) {
      if (existing.is_verified) {
        // Already verified — block duplicate signup
        return res.status(400).json({ error: 'User already exists' });
      }
      // Not verified — delete old record so they can re-signup with a fresh code
      console.log(`[AUTH] Removing unverified user ${email} for re-signup`);
      await deleteUnverifiedUser(email);
    }

    const user = await createUser(username, email, password);

    // SEND SECURE VERIFICATION CODE
    const emailSent = await sendVerificationEmail(email, user.verification_code);

    res.status(201).json({
      message: emailSent
        ? 'Verification code sent to your email'
        : 'Account created. Check your email or contact support for your code.',
      email: user.email
    });
  } catch (err: any) {
    console.error('Signup failed:', err);
    res.status(500).json({ error: err.message || 'Signup failed' });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    await verifyUserCode(email, code);

    // Once verified, we could return a token here or ask them to login
    // Let's return the user data so the frontend can auto-login
    const user = await findUserByIdentifier(email);
    const token = generateUserToken({ id: user.id, username: user.username, role: user.role });

    res.json({
      message: 'Email verified successfully',
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err: any) {
    console.error('Verification failed:', err);
    res.status(400).json({ error: err.message || 'Verification failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await findUserByIdentifier(identifier);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        error: 'Email not verified',
        email: user.email,
        requiresVerification: true
      });
    }

    const token = generateUserToken({ id: user.id, username: user.username, role: user.role });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err: any) {
    console.error('Login failed:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// --- Upload Routes ---

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.'));
    }
  }
});

app.post('/api/upload', authenticateToken as any, upload.single('image'), async (req: AuthRequest & { file?: Express.Multer.File }, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = `thumbnails/${Date.now()}-${req.file.originalname}`;
    const publicUrl = await uploadImage('thumbnails', fileName, req.file.buffer, req.file.mimetype);

    res.json({ url: publicUrl });
  } catch (err: any) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// --- Topic Routes ---

app.get('/api/topics', async (req, res) => {
  try {
    const { tag } = req.query;
    const topics = await getActiveTopics(tag as string);
    res.json(topics);
  } catch (err: any) {
    console.error('Fetch topics failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch topics' });
  }
});

app.post('/api/topics', authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { title, description, tags, thumbnail_url } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const topic = await submitTopic(title, description, req.user!.id, tags, thumbnail_url);
    res.status(201).json(topic);
  } catch (err: any) {
    console.error('Topic submission failed:', err);
    res.status(500).json({ error: err.message || 'Failed to submit topic' });
  }
});

// --- Admin Routes ---

app.post('/api/admin/topics/:id/approve', authenticateToken as any, authorizeAdmin as any, async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await updateTopicStatus(id, 'active');
    res.json({ message: 'Topic approved', topic });
  } catch (err: any) {
    console.error('Approval failed:', err);
    res.status(500).json({ error: err.message || 'Failed to approve topic' });
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
