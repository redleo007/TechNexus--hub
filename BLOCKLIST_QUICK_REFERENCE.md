# Blocklist Logic - Quick Reference Card

## Core Rules

### Auto-Block Rule
```
IF no_show_count ≥ 2 AND auto_block_enabled = true
  THEN auto_blocked = true
  CREATE blocklist entry WITH type = 'auto'
```

### Manual Block Rule
```
IF admin adds participant to blocklist
  THEN is_blocklisted = true
  CREATE blocklist entry WITH type = 'manual'
```

### Final Status Rule
```
IF manually_unblocked
  THEN is_blocklisted = FALSE              ← Override wins!
ELSE IF manually_blocked  
  THEN is_blocklisted = TRUE               ← Always block
ELSE IF auto_blocked
  THEN is_blocklisted = TRUE               ← Auto-block
ELSE
  THEN is_blocklisted = FALSE              ← Not blocked
```

### Auto-Cleanup Rule
```
WHEN no_show_count < 2 AND blocklist_type = 'auto'
  DELETE blocklist entry
WHEN no_show_count ≥ 2 AND removing manually blocked
  CREATE override with reason = 'manually_unblocked'
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/blocklist` | GET | Get all blocklisted participants |
| `/api/blocklist` | POST | Add to blocklist (manual) |
| `/api/blocklist/:id` | DELETE | Remove from blocklist |
| `/api/blocklist/count` | GET | Get count only |
| `/api/blocklist/stats` | GET | Get statistics |
| `/api/dashboard/stats` | GET | Dashboard stats (includes blocklist) |

## Key Functions

```typescript
// Compute state for a participant
computeBlocklistState(participantId): ComputedBlocklistState

// Sync participant record with state
syncBlocklistState(participantId): void

// Check and auto-block if conditions met
checkAndAutoBlock(participantId): boolean

// Manually add to blocklist
addToBlocklist(participantId, reason): BlocklistEntry

// Manually remove from blocklist
removeFromBlocklist(participantId): void

// Get all blocklisted participants (unified)
getBlocklist(): Promise<BlocklistEntry[]>

// Get count only
getBlocklistCount(): Promise<number>

// Get statistics
getBlocklistStats(): Promise<BlocklistStats>
```

## Data Flow

### Creating No-Show Record
```
1. User marks attendance as 'no_show'
2. checkAndAutoBlock() called
3. noShowCount = 2? → YES
4. Create blocklist entry { type: 'auto' }
5. syncBlocklistState() → is_blocklisted = true
6. Participant appears in blocklist
```

### Deleting No-Show Record
```
1. User deletes attendance record
2. checkAndAutoBlock() called
3. noShowCount drops below 2
4. blocklist_type = 'auto'? → YES
5. DELETE blocklist entry
6. syncBlocklistState() → is_blocklisted = false
7. Participant removed from blocklist
```

### Manual Override of Auto-Block
```
1. User clicks "Override" on auto-blocked participant
2. removeFromBlocklist() called
3. noShowCount ≥ 2? → YES
4. UPDATE entry { type: 'manual', reason: 'manually_unblocked' }
5. syncBlocklistState() → is_blocklisted = false
6. Participant removed from blocklist
7. Future auto-blocks prevented
```

## Display Elements

### No-Shows Page
- **Total No-Shows**: Sum of all records
- **Participants with No-Shows**: Count of unique people
- **High Risk (≥2)**: Auto-blocklist candidates
- **Highest No-Shows**: Maximum for one person

### No-Shows Table Badge
```
🔴 RED (≥2 no-shows)      → High risk, will auto-block
🟠 ORANGE (1 no-show)     → Warning, one more triggers block
```

### Blocklist Page Display
```
🔄 Auto-Blocked (orange)  → Automatic, based on no-shows
⛔ Manual (red)           → Added by admin
✓ Override                → Manual unblock prevents auto-block
```

## Settings

```
no_show_limit: 2 (default)
auto_block_enabled: true (default)
```

Configurable via `/api/settings` endpoint.

## Database Schema

### Blocklist Table
```sql
CREATE TABLE blocklist (
  id UUID PRIMARY KEY,
  participant_id UUID NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocklist_type TEXT ('auto' | 'manual'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Participants Table
```sql
-- Existing columns:
is_blocklisted BOOLEAN DEFAULT FALSE
blocklist_reason TEXT

-- Updated by syncBlocklistState()
```

### Attendance Table
```sql
-- Source of truth for no-shows
status: 'attended' | 'no_show' | NULL
-- NULL = counted as no_show (legacy)
```

## Unified Function

**The Key to Consistency:**
```typescript
getBlocklist(): Promise<BlocklistEntry[]>
  ├─ Fetch all participants
  ├─ For each: computeBlocklistState()
  ├─ Filter: only is_blocklisted = true
  └─ Return: consistent list

// Used by:
// - Dashboard (for count)
// - Blocklist page (for list)
// - Any blocklist query

// Result:
// ✅ Single source of truth
// ✅ No count mismatches
// ✅ Real-time computation
```

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Count mismatch | Using old function | Use `getBlocklistCount()` |
| Person stays after block | Manual block | Use "Remove" button |
| Override not working | Entry deleted | Keep override entry |
| Auto-block not triggering | Type mismatch | Verify `blocklist_type = 'auto'` |
| State not syncing | sync not called | Ensure `syncBlocklistState()` called |

## Activity Logging

All operations logged:
```
type: 'participant_auto_blocked'
type: 'participant_auto_unblocked'
type: 'participant_blocked'
type: 'participant_unblocked'

Activity includes:
- timestamp
- participant_id
- operation type
- details/reason
```

## Testing Quick Checks

✅ Add 2 no-shows → Person auto-blocks
✅ Delete 1 no-show → Person unblocks
✅ Click override → Manual entry created
✅ Delete no-show with override → Stays blocked
✅ Dashboard count = Blocklist page count

---

**Reference for:** Blocklist Feature Implementation
**Type:** Type-Safe, Production Ready
**Unified:** Yes - Single source of truth
