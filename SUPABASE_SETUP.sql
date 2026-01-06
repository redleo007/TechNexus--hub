-- TechNexus Event & Attendance Management System - Supabase Schema
-- This SQL script sets up all required tables for the system

-- Events Table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  location TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events(date DESC);

-- Participants Table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  is_blocklisted BOOLEAN DEFAULT FALSE,
  blocklist_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_participants_email ON participants(email);
CREATE INDEX idx_participants_blocklisted ON participants(is_blocklisted);

-- Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('attended', 'no_show')),
  marked_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attendance_event ON attendance(event_id);
CREATE INDEX idx_attendance_participant ON attendance(participant_id);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE UNIQUE INDEX idx_attendance_unique ON attendance(event_id, participant_id);

-- Blocklist Table
CREATE TABLE IF NOT EXISTS blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL UNIQUE REFERENCES participants(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_blocklist_participant ON blocklist(participant_id);

-- Volunteers Table
CREATE TABLE IF NOT EXISTS volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  comment TEXT NOT NULL,
  place TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  joined_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_volunteers_email ON volunteers(email);
CREATE INDEX idx_volunteers_joined_date ON volunteers(joined_date DESC);
CREATE INDEX idx_volunteers_is_active ON volunteers(is_active);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_show_limit INTEGER DEFAULT 2,
  auto_block_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_type ON activity_logs(type);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_participant ON activity_logs(participant_id);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all authenticated users full access
-- (In production, implement more restrictive policies)
CREATE POLICY "Allow all authenticated users" ON events FOR ALL USING (true);
CREATE POLICY "Allow all authenticated users" ON participants FOR ALL USING (true);
CREATE POLICY "Allow all authenticated users" ON attendance FOR ALL USING (true);
CREATE POLICY "Allow all authenticated users" ON blocklist FOR ALL USING (true);
CREATE POLICY "Allow all authenticated users" ON volunteers FOR ALL USING (true);
CREATE POLICY "Allow all authenticated users" ON settings FOR ALL USING (true);
CREATE POLICY "Allow all authenticated users" ON activity_logs FOR ALL USING (true);

-- Initialize default settings
INSERT INTO settings (no_show_limit, auto_block_enabled)
SELECT 2, true
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);
