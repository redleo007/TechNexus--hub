-- Volunteer Work Assignments Table
-- Tracks tasks assigned to volunteers for specific events

CREATE TABLE IF NOT EXISTS volunteer_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  task_status TEXT NOT NULL CHECK (task_status IN ('assigned', 'in_progress', 'completed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_volunteer_work_volunteer ON volunteer_work(volunteer_id);
CREATE INDEX idx_volunteer_work_event ON volunteer_work(event_id);
CREATE INDEX idx_volunteer_work_status ON volunteer_work(task_status);
CREATE INDEX idx_volunteer_work_created ON volunteer_work(created_at DESC);

-- Enable Row Level Security
ALTER TABLE volunteer_work ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users full access
CREATE POLICY "Allow all authenticated users" ON volunteer_work FOR ALL USING (true);
