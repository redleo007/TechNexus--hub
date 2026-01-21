# Blocklist Implementation - Testing Guide

## Quick Start

### 1. Database Migration
Before testing, run the schema update:
```bash
# In your Supabase SQL editor or via migration tool:
# Run: database/BLOCKLIST_SCHEMA_UPDATE.sql
```

### 2. Verify Initial State
- Go to Dashboard → Should show "Blocklisted: 0"
- Go to Blocklist page → Should show "Total Blocklisted: 0"
- Go to No Shows page → Should show "Total No-Shows: 0"

## Test Scenarios

### Scenario 1: Auto-Block at 2 No-Shows
**Step 1:** Create or select a participant (e.g., "John Doe")
**Step 2:** Go to No Shows page → Add Entry
- Select John Doe
- Select any event
- Submit
**Expected:** John shows 1 no-show

**Step 3:** Add another no-show for John in same or different event
**Expected:**
- ✅ No Shows page shows John has 2 no-shows
- ✅ John's no-show count badge is RED (≥2)
- ✅ Dashboard shows "Blocklisted: 1"
- ✅ Blocklist page shows John with "🔄 Auto-Blocked" badge
- ✅ No-show reason says "Auto-blocked: 2 no-shows"

**Step 4:** Verify Blocklist page
**Expected:**
- John appears in blocklist
- Shows "Auto-Blocked" badge (orange, 🔄)
- Shows no-show count: 2
- Button says "Override"

### Scenario 2: Manual Block Override
**Step 1:** With John auto-blocked, go to Blocklist page
**Step 2:** Click "Override" button
**Expected:**
- ✅ John still shows in Blocklist
- ✅ Badge changes to "⛔ Manual" (red)
- ✅ Shows "✓ Override" badge
- ✅ Reason says "manually_unblocked"
- ✅ Button now says "Remove"

**Step 3:** Even if John gets a 3rd no-show
**Expected:**
- John stays in blocklist (override prevents auto-unblock)

### Scenario 3: Manual Add to Blocklist
**Step 1:** Go to Blocklist page → Add Entry
**Step 2:** Select a participant (not auto-blocked)
**Step 3:** Enter reason: "Disruptive behavior"
**Expected:**
- ✅ Participant added to blocklist
- ✅ Badge shows "⛔ Manual" (red)
- ✅ Reason shows "Disruptive behavior"
- ✅ No-show count shows 0 (if they have none)
- ✅ Dashboard count updates

### Scenario 4: Auto-Cleanup
**Step 1:** John has 2 no-shows and is auto-blocked
**Step 2:** Go to No Shows page → Delete one no-show record
**Expected:**
- ✅ John's no-show count drops to 1
- ✅ John's badge changes to ORANGE (1 no-show)
- ✅ John removed from blocklist automatically
- ✅ Dashboard count decreases

### Scenario 5: Manual Block Stays
**Step 1:** Participant manually blocklisted with 0 no-shows
**Step 2:** Add a no-show for them
**Expected:**
- ✅ Participant still in blocklist
- ✅ Still shows "⛔ Manual" badge
- ✅ No-show count shows 1
- ✅ Participant stays until manually removed

### Scenario 6: Dashboard = Blocklist Count
**Test:** 
- Dashboard blocklist count
- Blocklist page total count
**Expected:** Always match ✅

## API Testing with cURL/Postman

### Get Blocklist Count (for Dashboard)
```bash
curl http://localhost:5000/api/blocklist/count
```
Expected response:
```json
{ "data": { "count": 2 } }
```

### Get Full Blocklist
```bash
curl http://localhost:5000/api/blocklist
```
Expected response:
```json
{
  "data": [
    {
      "id": "xxx",
      "participant_id": "yyy",
      "reason": "Auto-blocked: 2 no-shows",
      "blocklist_type": "auto",
      "no_show_count": 2,
      "participants": { "name": "John", "email": "john@example.com" }
    }
  ]
}
```

### Get Blocklist Statistics
```bash
curl http://localhost:5000/api/blocklist/stats
```
Expected response:
```json
{
  "data": {
    "total": 3,
    "auto_blocked": 2,
    "manually_blocked": 1
  }
}
```

### Manually Add to Blocklist
```bash
curl -X POST http://localhost:5000/api/blocklist \
  -H "Content-Type: application/json" \
  -d '{"participant_id": "abc123", "reason": "Disruptive"}'
```

### Manually Remove from Blocklist
```bash
curl -X DELETE http://localhost:5000/api/blocklist/abc123
```

## Dashboard Stats Verification
```bash
curl http://localhost:5000/api/dashboard/stats
```
Expected: `blocklistedParticipants` field should match `GET /api/blocklist count`

## No-Shows Verification

### Total No-Shows
```bash
curl http://localhost:5000/api/attendance/no-shows
```
Count total records returned

### Per-Participant Count
Frontend aggregates in NoShows.tsx:
```typescript
const noShowsByParticipant = records.reduce((acc, r) => {
  acc[r.participant_id] = (acc[r.participant_id] || 0) + 1;
  return acc;
}, {});
```

## Manual Testing Checklist

- [ ] Initial state: 0 blocklisted
- [ ] 1st no-show: participant not blocked, badge shows 1
- [ ] 2nd no-show: participant auto-blocked, badge shows RED/2
- [ ] Dashboard count updates on auto-block
- [ ] Blocklist page shows auto-blocked participant
- [ ] Override button changes type to manual
- [ ] Manual unblock creates override entry
- [ ] Delete no-show removes auto-block
- [ ] Manual block persists even if no no-shows
- [ ] Manual add to blocklist works
- [ ] Delete participant removes from blocklist
- [ ] No-shows page shows all stats
- [ ] Badge colors accurate per no-show count
- [ ] Dashboard count = Blocklist page count (always)

## Debugging

### Check Participant Blocklist State
In browser console or via API:
```javascript
// Would show computed state
const state = await blocklistService.computeBlocklistState(participantId);
console.log(state);
// {
//   is_blocklisted: true,
//   auto_blocked: true,
//   manually_blocked: false,
//   manually_unblocked: false,
//   no_show_count: 2,
//   reason: "Auto-blocked: 2 no-shows"
// }
```

### Check Activity Logs
```bash
curl http://localhost:5000/api/dashboard/stats
# Look at recentActivities for blocklist operations
```

### Database Query
```sql
-- Check participants with is_blocklisted flag
SELECT id, name, email, is_blocklisted, blocklist_reason 
FROM participants 
WHERE is_blocklisted = true;

-- Check blocklist table
SELECT participant_id, reason, blocklist_type, created_at 
FROM blocklist 
ORDER BY created_at DESC;

-- Check attendance for no-shows
SELECT p.name, COUNT(*) as no_show_count
FROM attendance a
JOIN participants p ON a.participant_id = p.id
WHERE a.status = 'no_show' OR a.status IS NULL
GROUP BY p.id, p.name;
```

## Common Issues & Solutions

### Issue: Dashboard count doesn't match Blocklist page
**Cause:** Using old `getBlocklistedParticipantsCount()` instead of new unified function
**Solution:** Both endpoints now use `getBlocklistCount()` which calls `getBlocklist()`

### Issue: Participant stays blocklisted after removing all no-shows
**Cause:** Manually blocklisted (not auto-blocked)
**Solution:** Use "Remove" button on Blocklist page, not by deleting no-shows

### Issue: Auto-blocked participant doesn't show in blocklist
**Cause:** State not synced to database
**Solution:** `syncBlocklistState()` is called automatically after state changes

### Issue: Manual override doesn't prevent auto-block
**Cause:** Override entry was deleted
**Solution:** Keep entry with `reason = 'manually_unblocked'` and `type = 'manual'`

## Performance Notes

- `computeBlocklistState()` calculates in real-time
- For large datasets (1000+ participants), consider pagination
- `getBlocklist()` iterates through participants - see optimization if needed
- Activity logging is async and non-blocking

## Type Safety

All operations are fully typed:
```typescript
// Types available in blocklistService.ts
type BlocklistType = 'auto' | 'manual'
interface BlocklistEntry { ... }
interface BlocklistStats { ... }
interface ComputedBlocklistState { ... }
```
