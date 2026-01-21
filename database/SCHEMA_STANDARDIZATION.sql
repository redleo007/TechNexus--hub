/**
 * SCHEMA STANDARDIZATION MIGRATION
 * Updates attendance table to use 'not_attended' instead of 'no_show'
 * Also allows NULL status for flexible handling
 */

-- Step 1: Alter table to allow 'not_attended' value
ALTER TABLE attendance
DROP CONSTRAINT IF EXISTS attendance_status_check,
ADD CONSTRAINT attendance_status_check CHECK (status IN ('attended', 'not_attended'));

-- Step 2: Migrate existing 'no_show' values to 'not_attended'
UPDATE attendance
SET status = 'not_attended'
WHERE status = 'no_show' OR status IS NULL;

-- Step 3: Create index on status for performance
CREATE INDEX IF NOT EXISTS idx_attendance_status_optimized ON attendance(status)
WHERE status = 'not_attended';

-- Verification query
SELECT 
  status,
  COUNT(*) as count
FROM attendance
GROUP BY status;
