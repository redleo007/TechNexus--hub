-- Create No-Shows Table and Migrate Data

-- 1. Create table
CREATE TABLE IF NOT EXISTS no_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, participant_id)
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_no_shows_event ON no_shows(event_id);
CREATE INDEX IF NOT EXISTS idx_no_shows_participant ON no_shows(participant_id);
CREATE INDEX IF NOT EXISTS idx_no_shows_created ON no_shows(created_at DESC);

-- 3. Migrate existing no-shows from attendance table
INSERT INTO no_shows (event_id, participant_id, created_at)
SELECT event_id, participant_id, marked_at
FROM attendance
WHERE status = 'not_attended'
ON CONFLICT (event_id, participant_id) DO NOTHING;

-- 4. Clean up attendance table (remove no-shows, keep only 'attended')
-- Logic: Attendance table now strictly tracks PRESENCE. No-shows are tracked in no_shows table.
DELETE FROM attendance WHERE status = 'not_attended';

-- 5. Enable RLS (optional but recommended)
ALTER TABLE no_shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users" ON no_shows FOR ALL USING (true);
