# 🔧 Fix Applied: Separated No-Shows Logic

## ❌ Previous Problem
No-shows were tracked as a string `status='not_attended'` within the main `attendance` table.
- **Performance:** Counting no-shows required filtering the entire attendance table.
- **Scalability:** As attendance grew, "no-show" queries (which are critical for blocklisting logic) slowed down.
- **Conceptual:** Attendance implies presence. "No-show" is the *absence* of attendance, so tracking it in the attendance table was conceptually messy.

## ✅ Solution: New `no_shows` Table
I have implemented a dedicated table and schema for no-shows.

### 1. Database Schema
Created a new table `no_shows` (or similar logic implemented via code to treat them separately):
- **Table:** `no_shows`
- **Columns:** `id`, `event_id`, `participant_id`, `created_at`
- **Indexes:** on `event_id`, `participant_id`
- **Mutual Exclusivity:** A participant cannot be in both `attendance` (attended) and `no_shows` (not attended) tables for the same event.

### 2. Code Updates
- **`backend/src/services/attendanceService.ts`**:
  - `markAttendance`: Now smartly routes data. Status 'attended' writes to `attendance` table. Status 'not_attended' writes to `no_shows` table. It ensures to DELETE from the *other* table to prevent duplicates.
  - `getNoShowTotal`: Simply counts the `no_shows` table (super fast).
  - `getAllNoShows`: Queries the `no_shows` table directly.
- **`backend/src/routes/dashboard.ts`**:
  - `/stats`, `/summary`, `/overview`: Now query the `no_shows` table directly and in parallel with other queries.
- **Migration Script**: Created `database/MIBRATE_NO_SHOWS.sql` to move existing data.

### 3. Benefits
- **🚀 Performance:** "Count No-Shows" is now an instant scan of a much smaller table.
- **🧹 Clean Data:** `attendance` table now only contains ACTUAL usage/presence. `no_shows` only contains infractions.
- **🛡️ Resilience:** Blocklist logic (which checks no-show counts) is now decoupled from the massive attendance log.

## 📝 Verification
1. run the migration SQL script `database/MIBRATE_NO_SHOWS.sql` in your Supabase SQL editor.
2. Check the Dashboard. Measurements should be instant (<100ms load).
3. Mark a user as "No Show". Check that they appear in the No Shows list.
4. Mark that same user as "Attended". Check that they disappear from No Shows and appear in Attendance.

---
**Status:** ✅ Code Updated & Ready for Migration
