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
import { analyzeDebateImpact, generateAIResponse } from './services/openai.js';
import { setupDeepgramStream } from './services/deepgram.js';
import { saveMatchResult, saveMatchMessage, getRandomTopic, createUser, findUserByIdentifier, getActiveTopics, getPendingTopics, getAllTopics, getAllUsers, updateUserRole, submitTopic, updateTopicStatus, verifyUserCode, deleteUnverifiedUser, uploadImage } from './services/supabase.js';
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
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const apiRouter = express.Router();
app.use('/api', apiRouter);

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
  phase: 'Lobby' | 'Opening_P1' | 'Opening_P2' | 'Rebuttal_P1' | 'Rebuttal_P2' | 'Crossfire' | 'Closing_P1' | 'Closing_P2' | 'Results';
  timeLeft: number;
  leftPlayer?: { id: string, name: string };
  rightPlayer?: { id: string, name: string };
  transcripts: string[];
  topic: { title: string, description: string };
  mode: 'casual' | 'ai' | 'ranked';
  difficulty?: 'easy' | 'medium' | 'hard';
  inputMode: 'voice' | 'chat';
}

const matches: Record<string, MatchState> = {};
const rankedQueue: Array<{ socketId: string, userId: string, username: string, mmr: number, inputMode: 'voice' | 'chat' }> = [];

const PHASE_DURATIONS: Record<MatchState['phase'], number> = {
  Lobby: 15,
  Opening_P1: 45,
  Opening_P2: 45,
  Rebuttal_P1: 30,
  Rebuttal_P2: 30,
  Crossfire: 60,
  Closing_P1: 30,
  Closing_P2: 30,
  Results: 0
};

/**
 * Transitions a match to the next phase.
 */
const transitionPhase = async (matchId: string) => {
  const match = matches[matchId];
  if (!match) return;

  const phases: MatchState['phase'][] = [
    'Lobby', 
    'Opening_P1', 'Opening_P2', 
    'Rebuttal_P1', 'Rebuttal_P2', 
    'Crossfire', 
    'Closing_P1', 'Closing_P2', 
    'Results'
  ];
  const currentIndex = phases.indexOf(match.phase);

  if (currentIndex < phases.length - 1) {
    match.phase = phases[currentIndex + 1];
    match.timeLeft = PHASE_DURATIONS[match.phase];

    if (match.phase === 'Results') {
      await saveMatchResult(
        matchId, 
        match.momentum, 
        match.transcripts, 
        match.mode, 
        match.difficulty, 
        match.leftPlayer?.id, 
        match.rightPlayer?.id,
        match.inputMode
      );
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

    // AI Opponent Logic
    if (match.mode === 'ai') {
      const isAITurn = ['Opening_P2', 'Rebuttal_P2', 'Closing_P2'].includes(match.phase);
      const isCrossfire = match.phase === 'Crossfire';

      // On turn-based phases: AI responds once at the start (at timeLeft - 2s for realism)
      if (isAITurn && match.timeLeft === PHASE_DURATIONS[match.phase] - 2) {
        const aiResponse = await generateAIResponse(match.topic, match.transcripts, match.difficulty || 'medium', match.phase);
        match.transcripts.push(`[AI]: ${aiResponse}`);
        
        const delta = await analyzeDebateImpact(aiResponse, match.phase);
        match.momentum = Math.max(0, Math.min(100, match.momentum + delta));

        await saveMatchMessage(matchId, null, `[AI]: ${aiResponse}`, match.phase, delta);

        io.to(matchId).emit('game_update', {
          momentum: match.momentum,
          lastDelta: delta,
          transcript: `[AI]: ${aiResponse}`
        });
      }

      // During Crossfire: AI responds periodically (every 15s)
      if (isCrossfire && match.timeLeft > 0 && match.timeLeft % 15 === 0) {
        const aiResponse = await generateAIResponse(match.topic, match.transcripts, match.difficulty || 'medium', match.phase);
        match.transcripts.push(`[AI]: ${aiResponse}`);
        
        const delta = await analyzeDebateImpact(aiResponse, match.phase);
        match.momentum = Math.max(0, Math.min(100, match.momentum + delta));

        await saveMatchMessage(matchId, null, `[AI]: ${aiResponse}`, match.phase, delta);

        io.to(matchId).emit('game_update', {
          momentum: match.momentum,
          lastDelta: delta,
          transcript: `[AI]: ${aiResponse}`
        });
      }
    }

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
    version: '1.0.5'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.5',
    api: 'v1'
  });
});

apiRouter.get('/token', async (req, res) => {
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

apiRouter.post('/auth/signup', async (req, res) => {
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

apiRouter.post('/auth/verify', async (req, res) => {
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

apiRouter.post('/auth/login', async (req, res) => {
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

apiRouter.post('/upload', authenticateToken as any, (req: any, res: any, next: any) => {
  upload.single('image')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      console.warn('[UPLOAD] Multer error:', err);
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      console.error('[UPLOAD] General error:', err);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req: AuthRequest & { file?: Express.Multer.File }, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Clean filename: remove 'thumbnails/' prefix since the bucket is already 'thumbnails'
    const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    console.log(`[UPLOAD] Processing file: ${fileName}, size: ${req.file.size} bytes`);

    const publicUrl = await uploadImage('thumbnails', fileName, req.file.buffer, req.file.mimetype);

    res.json({ url: publicUrl });
  } catch (err: any) {
    console.error('[UPLOAD] Logic failed:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// --- Topic Routes ---

apiRouter.get('/topics', async (req, res) => {
  try {
    const { tag } = req.query;
    const topics = await getActiveTopics(tag as string);
    res.json(topics);
  } catch (err: any) {
    console.error('Fetch topics failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch topics' });
  }
});

apiRouter.post('/topics', authenticateToken as any, async (req: AuthRequest, res) => {
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

apiRouter.post('/admin/topics/:id/approve', authenticateToken as any, authorizeAdmin as any, async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await updateTopicStatus(id, 'active');
    res.json({ message: 'Topic approved', topic });
  } catch (err: any) {
    console.error('Approval failed:', err);
    res.status(500).json({ error: err.message || 'Failed to approve topic' });
  }
});

apiRouter.get('/admin/topics/pending', authenticateToken as any, authorizeAdmin as any, async (req, res) => {
  try {
    const topics = await getPendingTopics();
    res.json(topics);
  } catch (err: any) {
    console.error('Fetch pending topics failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch pending topics' });
  }
});

apiRouter.get('/admin/users', authenticateToken as any, authorizeAdmin as any, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err: any) {
    console.error('Fetch users failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch users' });
  }
});

apiRouter.put('/admin/users/:id/role', authenticateToken as any, authorizeAdmin as any, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await updateUserRole(id, role);
    res.json(user);
  } catch (err: any) {
    console.error('Update user role failed:', err);
    res.status(500).json({ error: err.message || 'Failed to update user role' });
  }
});

apiRouter.get('/admin/topics', authenticateToken as any, authorizeAdmin as any, async (req, res) => {
  try {
    const { status } = req.query;
    const topics = await getAllTopics(status as string);
    res.json(topics);
  } catch (err: any) {
    console.error('Fetch all topics failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch topics' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_match', async (data: { 
    matchId: string, 
    mode?: 'casual' | 'ai' | 'ranked', 
    difficulty?: 'easy' | 'medium' | 'hard',
    inputMode?: 'voice' | 'chat'
  }) => {
    const { 
      matchId, 
      mode = 'casual', 
      difficulty = 'medium', 
      inputMode = 'voice' 
    } = typeof data === 'string' ? { matchId: data } : data;
    
    socket.join(matchId);

    if (!matches[matchId]) {
      const topic = await getRandomTopic();
      matches[matchId] = {
        id: matchId,
        momentum: 50,
        phase: 'Lobby',
        timeLeft: PHASE_DURATIONS.Lobby,
        transcripts: [],
        topic: { title: topic.title, description: topic.description },
        mode,
        difficulty,
        inputMode
      };
      
      if (mode === 'ai') {
        matches[matchId].rightPlayer = { id: 'ai-bot', name: `AI Bot (${difficulty})` };
      }
    }

    console.log(`User ${socket.id} joined ${mode} match ${matchId} via ${inputMode}`);
    socket.emit('game_init', matches[matchId]);
  });

  socket.on('chat_message', async (data: { matchId: string, text: string }) => {
    const match = matches[data.matchId];
    if (!match || match.phase === 'Results' || match.phase === 'Lobby') return;

    // Logic: Only allow chat if inputMode matches OR during Crossfire
    // In AI mode, we allow it if it's the player's turn phase
    const isP1Turn = match.phase.includes('P1');
    const isCrossfire = match.phase === 'Crossfire';

    if (isP1Turn || isCrossfire) {
      match.transcripts.push(data.text);
      const delta = await analyzeDebateImpact(data.text, match.phase);
      match.momentum = Math.max(0, Math.min(100, match.momentum + delta));

      await saveMatchMessage(data.matchId, null, data.text, match.phase, delta); // user_id handling can be refined

      io.to(data.matchId).emit('game_update', {
        momentum: match.momentum,
        lastDelta: delta,
        transcript: data.text
      });
    }
  });

  socket.on('join_ranked_queue', async (data: { userId: string, username: string, inputMode: 'voice' | 'chat' }) => {
    const user = await findUserByIdentifier(data.userId);
    const mmr = user?.mmr || 1000;

    // Match by MMR AND inputMode
    const opponentIndex = rankedQueue.findIndex(p => 
      Math.abs(p.mmr - mmr) < 200 && p.inputMode === data.inputMode
    );

    if (opponentIndex > -1) {
      const opponent = rankedQueue.splice(opponentIndex, 1)[0];
      const matchId = `ranked-${Date.now()}`;
      
      io.to(socket.id).emit('match_found', { matchId, opponent: opponent.username, inputMode: data.inputMode });
      io.to(opponent.socketId).emit('match_found', { matchId, opponent: data.username, inputMode: data.inputMode });
    } else {
      rankedQueue.push({ socketId: socket.id, userId: data.userId, username: data.username, mmr, inputMode: data.inputMode });
      socket.emit('queue_joined');
    }
  });

  socket.on('leave_ranked_queue', () => {
    const idx = rankedQueue.findIndex(p => p.socketId === socket.id);
    if (idx > -1) rankedQueue.splice(idx, 1);
    socket.emit('queue_left');
  });

  // Handle Voice Transcripts
  socket.on('transcript_data', async (data: { matchId: string, text: string }) => {
    const match = matches[data.matchId];
    if (!match || match.phase === 'Results' || match.phase === 'Lobby') return;

    match.transcripts.push(data.text);
    const delta = await analyzeDebateImpact(data.text, match.phase);
    match.momentum = Math.max(0, Math.min(100, match.momentum + delta));

    await saveMatchMessage(data.matchId, null, data.text, match.phase, delta);

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

// 404 Handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.path
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Game engine running on port ${PORT}`);
});
