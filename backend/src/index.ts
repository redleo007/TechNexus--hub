import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeSupabase } from './utils/supabase';
import { errorHandler, asyncHandler } from './middleware/errorHandler';

// Routes
import eventsRouter from './routes/events';
import participantsRouter from './routes/participants';
import attendanceRouter from './routes/attendance';
import blocklistRouter from './routes/blocklist';
import blocklistOptimized from './routes/blocklistOptimized';
import settingsRouter from './routes/settings';
import dashboardRouter from './routes/dashboard';
import dashboardSummary from './routes/dashboardSummary';
import noShowsRouter from './routes/noShows';
import eventParticipantsRouter from './routes/eventParticipants';

dotenv.config();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}));

// Routes
app.use('/api/events/:event_id/participants', eventParticipantsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/participants', participantsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/blocklist', blocklistOptimized); // NEW: Optimized blocklist API
app.use('/api/settings', settingsRouter);
app.use('/api/dashboard', dashboardSummary); // NEW: Optimized dashboard summary
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
