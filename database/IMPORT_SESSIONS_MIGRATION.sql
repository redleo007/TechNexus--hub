-- Import Sessions Table for tracking and rollback
CREATE TABLE IF NOT EXISTS import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL CHECK (import_type IN ('participants', 'attendance', 'volunteer_attendance')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'rolled_back')),
  record_count INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  rolled_back_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_import_sessions_event ON import_sessions(event_id);
CREATE INDEX idx_import_sessions_type ON import_sessions(import_type);
CREATE INDEX idx_import_sessions_status ON import_sessions(status);
CREATE INDEX idx_import_sessions_created ON import_sessions(created_at DESC);

-- Add import_session_id to participants
ALTER TABLE participants ADD COLUMN import_session_id UUID REFERENCES import_sessions(id) ON DELETE SET NULL;
CREATE INDEX idx_participants_import_session ON participants(import_session_id);

-- Add import_session_id to attendance
ALTER TABLE attendance ADD COLUMN import_session_id UUID REFERENCES import_sessions(id) ON DELETE SET NULL;
CREATE INDEX idx_attendance_import_session ON attendance(import_session_id);

-- Import audit log table for tracking all delete/rollback actions
CREATE TABLE IF NOT EXISTS import_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'deleted', 'rolled_back')),
  details JSONB,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_import_audit_logs_session ON import_audit_logs(import_session_id);
CREATE INDEX idx_import_audit_logs_action ON import_audit_logs(action);
CREATE INDEX idx_import_audit_logs_created ON import_audit_logs(created_at DESC);

-- Snapshot table to store previous attendance state before import
CREATE TABLE IF NOT EXISTS attendance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  previous_status TEXT,
  previous_blocklist_status BOOLEAN,
  is_new_participant BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attendance_snapshots_session ON attendance_snapshots(import_session_id);
CREATE INDEX idx_attendance_snapshots_participant ON attendance_snapshots(participant_id);
CREATE INDEX idx_attendance_snapshots_event ON attendance_snapshots(event_id);

-- Add import_session_id to volunteer_attendance
ALTER TABLE volunteer_attendance ADD COLUMN import_session_id UUID REFERENCES import_sessions(id) ON DELETE SET NULL;
CREATE INDEX idx_volunteer_attendance_import_session ON volunteer_attendance(import_session_id);
