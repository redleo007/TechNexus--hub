# Blocklist Logic Implementation

## Overview

This document describes the comprehensive blocklist logic implementation for the TechNexus Community volunteer management system.

## Requirements Met

✅ **Initial blocklist count = 0** - System starts with no blocklisted participants
✅ **AUTO block** - Participants with no-shows >= 2 automatically blocklisted
✅ **MANUAL block** - Admin can add/remove from blocklist
✅ **Final blocklist** = auto block + manual block (no duplicates)
✅ **Manual override** - Manual unblock overrides auto block
✅ **Auto cleanup** - If no-shows < 2 and not manually blocked → auto remove
✅ **Unified function** - Same backend function for Dashboard + Blocklist page
✅ **Consistent counts** - Dashboard count equals Blocklist page count
✅ **Source of truth** - Attendance table is the single source of truth
✅ **Type-safe** - Full TypeScript implementation
✅ **No-show counts** - Displayed on NoShows page with per-participant tracking

## Architecture

### Database Schema

Extended `blocklist` table with:
```sql
ALTER TABLE blocklist
ADD COLUMN blocklist_type TEXT DEFAULT 'manual' CHECK (blocklist_type IN ('auto', 'manual'));
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
```

### Backend Components

#### Service: `blocklistService.ts`

**Core Types:**
- `BlocklistType` - 'auto' | 'manual'
- `BlocklistEntry` - Blocklist entry with type
- `BlocklistStats` - Statistics (total, auto, manual counts)
- `ComputedBlocklistState` - Computed state for a participant

**Key Functions:**

1. **`computeBlocklistState(participantId)`**
   - Computes the final blocklist state for a participant
   - Implements all business logic rules
   - Returns: `ComputedBlocklistState` with:
     - `is_blocklisted` - Final blocklist status
     - `auto_blocked` - Eligible for auto-block
     - `manually_blocked` - Manually added to blocklist
     - `manually_unblocked` - Manually overridden
     - `no_show_count` - Current no-show count
     - `reason` - Blocklist reason

2. **`syncBlocklistState(participantId)`**
   - Syncs participant record with computed state
   - Updates `participants.is_blocklisted` flag

3. **`checkAndAutoBlock(participantId)`**
   - Called after attendance updates
   - Automatically creates/removes auto-block entries
   - Returns: `true` if state changed

4. **`addToBlocklist(participantId, reason)`**
   - Manually add participant to blocklist
   - Type: 'manual'
   - Requires non-empty reason
   - Syncs state after operation

5. **`removeFromBlocklist(participantId)`**
   - Manually remove from blocklist
   - If still eligible for auto-block: creates manual override
   - Otherwise: deletes blocklist entry
   - Syncs state after operation

6. **`getBlocklist()`** ⭐ UNIFIED ENDPOINT
   - Returns all blocklisted participants with computed states
   - Calculates states on-the-fly for consistency
   - Used by both Dashboard and Blocklist page
   - Ensures count consistency across UI

7. **`getBlocklistCount()`**
   - Quick count endpoint for Dashboard stats
   - Uses unified `getBlocklist()` internally

8. **`getBlocklistStats()`**
   - Returns: `{ total, auto_blocked, manually_blocked }`
   - For dashboard analytics

### API Routes

#### Dashboard Route (`routes/dashboard.ts`)
```typescript
GET /api/dashboard/stats
- Uses: getBlocklistCount() [unified function]
- Returns: blocklisted participant count
```

#### Blocklist Routes (`routes/blocklist.ts`)
```typescript
POST /api/blocklist
- Add manual blocklist entry
- Body: { participant_id, reason }

GET /api/blocklist
- Get all blocklisted participants [unified endpoint]
- Returns: full blocklist with computed states

GET /api/blocklist/count
- Get blocklist count only
- Quick endpoint for dashboard

GET /api/blocklist/stats
- Get blocklist statistics
- Returns: { total, auto_blocked, manually_blocked }

DELETE /api/blocklist/:participantId
- Remove from blocklist (manual unblock)
```

### Frontend Components

#### NoShows Page (`pages/NoShows.tsx`)
**New Features:**
- Total no-shows count
- Per-participant no-show counts
- High-risk indicator (≥2 no-shows)
- Highest no-shows count
- Table shows no-show badge per record
- Color-coded badges:
  - Red/Magenta: ≥2 no-shows (high risk)
  - Orange: 1 no-show (warning)

#### Blocklist Page (`pages/Blocklist.tsx`)
**Enhanced Display:**
- Shows blocklist type badge:
  - 🔄 Auto-Blocked (orange)
  - ⛔ Manual (red)
- Shows override badge for manual unblocks
- Shows no-show count for each participant
- Button labels change based on type:
  - Auto-blocked: "Override" button
  - Manual: "Remove" button

## Business Logic Rules

### Rule 1: Auto-Block Eligibility
```typescript
auto_blocked = 
  noShowCount >= settings.no_show_limit &&
  !manually_unblocked &&
  auto_block_enabled
```

### Rule 2: Final Blocklist Status
```typescript
if (manually_unblocked) {
  is_blocklisted = false;  // Manual override wins
} else if (manually_blocked) {
  is_blocklisted = true;   // Always block if manual
} else if (auto_blocked) {
  is_blocklisted = true;   // Auto-block
} else {
  is_blocklisted = false;  // Not blocked
}
```

### Rule 3: Auto-Cleanup
When no-shows count is reduced:
- If `no_show_count < no_show_limit`:
  - If `blocklist_type === 'auto'`: DELETE entry
  - If `manually_unblocked`: Keep override (already not blocking)
  - If `manually_blocked`: Keep (admin decision)

### Rule 4: Manual Unblock Override
When removing manually blocklisted participant:
- If still eligible for auto-block (no-shows >= 2):
  - Update entry: `reason = 'manually_unblocked'`, `type = 'manual'`
  - This creates an override that prevents auto-block
- Otherwise:
  - Delete entry

## Unified Function Design

The key to consistency is using **one function** for blocklist retrieval:

```typescript
// Same function used by:
// 1. Dashboard - for count display
// 2. Blocklist page - for full list
// 3. Any other blocklist queries

getBlocklist(): Promise<BlocklistEntry[]>
  - Fetches all participants
  - Computes state for each
  - Filters to only blocked participants
  - Returns consistent list
```

**Benefits:**
✅ Single source of truth
✅ No count mismatches between pages
✅ Real-time state computation
✅ Reflects attendance changes immediately

## No-Show Tracking

### Per-Participant No-Shows
The system tracks no-shows in the `attendance` table:
- Status: 'no_show' = counted as no-show
- Status: 'attended' = not counted
- NULL status = counted as no-show (legacy support)

### Display in NoShows Page
- **Total No-Shows**: Sum of all no-show records
- **Participants with No-Shows**: Count of unique participants with ≥1 no-show
- **High Risk (≥2)**: Participants eligible for auto-block
- **Highest No-Shows**: Maximum no-shows for single participant

### Table Badge
Shows individual participant no-show count:
- 🔴 Red (≥2): High risk, will auto-block
- 🟠 Orange (1): Warning, one more makes auto-block

## Settings

Default settings in `settings` table:
```
no_show_limit: 2 (participants blocklisted at 2+ no-shows)
auto_block_enabled: true (auto-block feature active)
```

Can be updated via settings API.

## Workflow Examples

### Scenario 1: Participant Reaches No-Show Limit
1. Attendance marked as 'no_show'
2. `checkAndAutoBlock()` called
3. No-show count = 2
4. Auto-block entry created: `{ type: 'auto', reason: 'Auto-blocked: 2 no-shows' }`
5. Participant added to Dashboard blocklist
6. Participant added to Blocklist page

### Scenario 2: Manual Override of Auto-Block
1. Participant auto-blocked with 2 no-shows
2. Admin removes from blocklist
3. `removeFromBlocklist()` called
4. Entry updated: `{ type: 'manual', reason: 'manually_unblocked' }`
5. Participant removed from blocklist display
6. Future auto-block prevented even if no-shows increase

### Scenario 3: Attendance Record Deleted
1. No-show attendance deleted
2. `checkAndAutoBlock()` called
3. No-show count drops below threshold
4. Auto-block entry deleted (if auto-type)
5. Participant auto-removed from blocklist
6. If manually blocked: stays in blocklist

### Scenario 4: Manual Block Added
1. Admin adds participant manually
2. `addToBlocklist()` called
3. Entry created: `{ type: 'manual', reason: 'Admin provided reason' }`
4. Participant added to blocklist
5. Stays in blocklist regardless of no-shows
6. Must be manually removed

## Implementation Status

### Backend
- ✅ `blocklistService.ts` - Full implementation with unified logic
- ✅ `attendanceService.ts` - Integration with no-show tracking
- ✅ `dashboard.ts` route - Using unified blocklist count
- ✅ `blocklist.ts` routes - All CRUD operations
- ✅ Database schema - Extended with blocklist_type and updated_at
- ✅ Migration script - BLOCKLIST_SCHEMA_UPDATE.sql

### Frontend
- ✅ `NoShows.tsx` - Total and per-participant no-show counts
- ✅ `Blocklist.tsx` - Enhanced display with badges and info
- ✅ `NoShows.css` - Badge styling
- ✅ `Blocklist.css` - Badge and item styling

## Testing Checklist

- [ ] Dashboard blocklist count = Blocklist page count
- [ ] Creating no-show record auto-blocks at count = 2
- [ ] Deleting no-show record removes auto-block if count < 2
- [ ] Manual block always blocks regardless of no-shows
- [ ] Manual override prevents auto-block
- [ ] NoShows page shows correct total and per-participant counts
- [ ] Blocklist page shows correct type badges
- [ ] Removing auto-blocked shows "Override" button
- [ ] Removing manually blocked shows "Remove" button

## Database Migration

Run the schema update:
```sql
-- File: database/BLOCKLIST_SCHEMA_UPDATE.sql
-- Adds blocklist_type and updated_at columns
-- Creates index on blocklist_type
-- Migrates existing auto-blocked entries
```

## Notes

- The attendance table is the **single source of truth** for no-shows
- Blocklist state is **computed on-demand** from attendance records
- All state syncs happen in `syncBlocklistState()`
- Activity logs track all blocklist changes for audit trail
- System is fully type-safe with TypeScript interfaces
