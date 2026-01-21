-- Add blocklist_type and updated_at columns to blocklist table
-- This migration adds support for tracking auto vs manual blocks

-- Add blocklist_type column if it doesn't exist
ALTER TABLE blocklist
ADD COLUMN IF NOT EXISTS blocklist_type TEXT DEFAULT 'manual' CHECK (blocklist_type IN ('auto', 'manual'));

-- Add updated_at column if it doesn't exist
ALTER TABLE blocklist
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Update existing records to be 'auto' if they contain 'Auto-blocked' in the reason
UPDATE blocklist
SET blocklist_type = 'auto'
WHERE blocklist_type = 'manual' AND reason LIKE 'Auto-blocked:%';

-- Create index on blocklist_type for efficient queries
CREATE INDEX IF NOT EXISTS idx_blocklist_type ON blocklist(blocklist_type);

-- Log this migration
INSERT INTO activity_logs (type, details, created_at)
VALUES ('migration', 'Added blocklist_type and updated_at columns to blocklist table', NOW());
