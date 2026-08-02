import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { initializeSupabase } from './utils/supabase';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import { authenticateToken, restrictWritesToAdmins } from './middleware/auth';

// Routes
import authRouter from './routes/auth';
import eventsRouter from './routes/events';
import participantsRouter from './routes/participants';
import attendanceRouter from './routes/attendance';
import blocklistRouter from './routes/blocklist';
import blocklistOptimized from './routes/blocklistOptimized';
import settingsRouter from './routes/settings';
import dashboardRouter from './routes/dashboard';

import noShowsRouter from './routes/noShows';
import eventParticipantsRouter from './routes/eventParticipants';

// Load environment variables from the nearest available .env file (backend root or repo root)
const envCandidates = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
];

const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
if (envPath) {
  dotenv.config({ path: envPath });
  console.log(`[config] Loaded environment from ${envPath}`);
} else {
  dotenv.config();
  console.warn('[config] No .env file found; relying on existing environment variables');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Supabase
try {
  initializeSupabase();
  console.log('✅ Supabase initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Supabase:', error);
  process.exit(1);
}

// Middleware
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || undefined;

const corsOptions = {
  origin: FRONTEND_URL || true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204,
} as any;

app.use(cors(corsOptions));
// Ensure preflight requests are handled for all routes
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}));

// Public auth routes
app.use('/api/auth', authRouter);

// Authenticated routes (JWT + role-aware write protection)
app.use('/api', authenticateToken, restrictWritesToAdmins);

// Routes
app.use('/api/events/:event_id/participants', eventParticipantsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/participants', participantsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/blocklist', blocklistOptimized); // NEW: Optimized blocklist API
app.use('/api/settings', settingsRouter);
app.use('/api/dashboard', dashboardRouter); // Dashboard /stats endpoint
app.use('/api/no-shows', noShowsRouter); // NEW: No-shows API

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 API Documentation:`);
  console.log(`   - Events: GET/POST /api/events`);
  console.log(`   - Participants: GET/POST /api/participants`);
  console.log(`   - Attendance: GET/POST /api/attendance`);
  console.log(`   - Blocklist: GET/POST /api/blocklist`);
  console.log(`   - Settings: GET/PUT /api/settings`);
  console.log(`   - Dashboard: GET /api/dashboard/stats`);
});
