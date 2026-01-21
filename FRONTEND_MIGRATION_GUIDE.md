# FRONTEND MIGRATION GUIDE - PERFORMANCE REFACTOR

## 🎯 Overview

All frontend pages (Dashboard, NoShows, Blocklist) must update to:
1. Use new backend APIs (no more old multi-endpoint calls)
2. Consume pre-calculated counts (no frontend aggregation)
3. Single source of truth: Backend

---

## 📱 Components to Update

### 1. Dashboard.tsx

**OLD CODE (Remove):**
```typescript
// SLOW - Multiple calls + frontend aggregation
const events = await fetch('/api/events').then(r => r.json());
const attendanceStats = await fetch('/api/attendance/stats').then(r => r.json());
const blocklist = await fetch('/api/blocklist').then(r => r.json());

// Frontend calculation (WRONG)
const noShowCount = attendanceStats.noShow;
const blocklistCount = blocklist.length; // Manual count
```

**NEW CODE (Replace with):**
```typescript
// FAST - Single lightweight endpoint
const summary = await fetch('/api/dashboard/summary').then(r => r.json());

// Use backend-calculated values directly
const { events, participants, noShows, blocklisted } = summary;

// Display directly - NO frontend calculations
```

**API Response:**
```json
{
  "events": 15,
  "participants": 42,
  "noShows": 8,
  "blocklisted": 3,
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

### 2. NoShows.tsx

**OLD CODE (Remove):**
```typescript
// SLOW - Fetch all attendance records + frontend filtering
const allAttendance = await fetch('/api/attendance').then(r => r.json());
const noShows = allAttendance.filter(a => a.status === 'no_show');
const count = noShows.length; // Manual count
```

**NEW CODE (Replace with):**
```typescript
// FAST - Dedicated no-shows endpoint
const response = await fetch('/api/no-shows').then(r => r.json());

const { total, uniqueParticipants, data: noShows } = response;

// Use backend totals
console.log(`Total: ${total}, Unique: ${uniqueParticipants}`);
```

**API Response:**
```json
{
  "total": 12,
  "uniqueParticipants": 5,
  "data": [
    {
      "id": "...",
      "participant_id": "...",
      "event_id": "...",
      "status": "not_attended",
      "marked_at": "2024-01-15T10:00:00Z",
      "participants": { "id": "...", "name": "John" },
      "events": { "id": "...", "name": "Event 1" }
    }
  ]
}
```

**Features:**
- GET `/api/no-shows` - List all
- GET `/api/no-shows/count` - Just count (lightweight)
- GET `/api/no-shows/export/csv` - Download CSV
- POST `/api/no-shows` - Mark as no-show
- DELETE `/api/no-shows/:id` - Remove no-show

### 3. Blocklist.tsx

**OLD CODE (Remove):**
```typescript
// SLOW - Multiple calls + frontend logic
const blocklist = await fetch('/api/blocklist').then(r => r.json());
const stats = await fetch('/api/blocklist/stats').then(r => r.json());

const autoBlocked = blocklist.filter(b => b.type === 'auto');
const manualBlocked = blocklist.filter(b => b.type === 'manual');
```

**NEW CODE (Replace with):**
```typescript
// FAST - Single endpoint
const { total, data: blocklist } = await fetch('/api/blocklist').then(r => r.json());

// Data already includes reason: 'auto_no_show' or 'manual'
blocklist.forEach(entry => {
  console.log(`${entry.participants.name} - Reason: ${entry.reason}`);
});
```

**API Response:**
```json
{
  "total": 5,
  "count": 5,
  "data": [
    {
      "id": "...",
      "participant_id": "...",
      "reason": "auto_no_show",
      "created_at": "2024-01-15T09:00:00Z",
      "participants": { "id": "...", "name": "Jane", "email": "jane@example.com" }
    }
  ]
}
```

---

## 🔗 Complete API Reference

### Dashboard
```
GET /api/dashboard/summary
→ { events, participants, noShows, blocklisted, lastUpdated }

GET /api/dashboard/stats
→ { total, attended, noShows: { total, uniqueParticipants, byParticipant } }

GET /api/dashboard/overview
→ { summary, recentActivities }
```

### No-Shows
```
GET /api/no-shows
→ { total, uniqueParticipants, count, data }

GET /api/no-shows/count
→ { total, uniqueParticipants }

GET /api/no-shows/export/csv
→ CSV file download

GET /api/no-shows/participant/:id
→ { total, data: [...] }

POST /api/no-shows
Body: { participant_id, event_id }
→ { success, data: attendance }

DELETE /api/no-shows/:id
→ { success, message }
```

### Blocklist
```
GET /api/blocklist
→ { total, count, data }

GET /api/blocklist/count
→ { count, total }

GET /api/blocklist/:participant_id
→ { participant_id, is_blocklisted }

POST /api/blocklist
Body: { participant_id }
→ { success, data: entry }

DELETE /api/blocklist/:participant_id
→ { success, message }

POST /api/blocklist/sync (ADMIN)
→ { success, added, removed, message }
```

---

## ⚡ Performance Expectations

| Page | Old Load Time | New Load Time | Improvement |
|------|---------------|---------------|-------------|
| Dashboard | 200-500ms | ~50-100ms | **4-10x faster** |
| No-Shows | 300-800ms | ~50-150ms | **3-16x faster** |
| Blocklist | 400-700ms | ~20-100ms | **4-35x faster** |

---

## 🚨 Common Mistakes to AVOID

❌ **DON'T:** Loop through data on frontend
```typescript
// WRONG
const count = data.map(item => /* ... */);
```

✅ **DO:** Use backend totals
```typescript
// RIGHT
const { total } = await fetch('/api/no-shows/count');
```

---

❌ **DON'T:** Make multiple API calls
```typescript
// WRONG
const dashboard = await fetch('/api/events');
const stats = await fetch('/api/attendance/stats');
const blocklist = await fetch('/api/blocklist');
```

✅ **DO:** Use single endpoint
```typescript
// RIGHT
const summary = await fetch('/api/dashboard/summary');
```

---

❌ **DON'T:** Filter data on frontend
```typescript
// WRONG
const noShows = allAttendance.filter(a => a.status === 'no_show');
```

✅ **DO:** Use filtered endpoint
```typescript
// RIGHT
const { data: noShows } = await fetch('/api/no-shows');
```

---

## 📋 Update Checklist

- [ ] Dashboard.tsx - Use `/api/dashboard/summary`
- [ ] NoShows.tsx - Use `/api/no-shows`
- [ ] Blocklist.tsx - Use `/api/blocklist`
- [ ] Remove all frontend count aggregations
- [ ] Remove all frontend filter operations
- [ ] Test: All pages load <200ms
- [ ] Test: Dashboard/NoShows/Blocklist show same counts
- [ ] Test: Add/remove works correctly
- [ ] Test: CSV export works
- [ ] Test: Auto-blocklist syncs at 2+ no-shows

---

## 🧪 Testing the APIs

```bash
# Dashboard summary (should load in <100ms)
curl http://localhost:5000/api/dashboard/summary

# No-shows list (should load in <150ms)
curl http://localhost:5000/api/no-shows

# Blocklist (should load in <100ms)
curl http://localhost:5000/api/blocklist

# CSV export
curl http://localhost:5000/api/no-shows/export/csv > no-shows.csv
```

---

## 🎯 Key Principles

1. **Backend is the source of truth** - All counts calculated there
2. **Single API calls** - No multiple endpoints per page
3. **No frontend loops** - No aggregation or filtering on frontend
4. **Type safety** - All responses have defined interfaces
5. **Performance first** - Target <100ms response times

---

## ✅ SUCCESS CRITERIA

- [ ] Dashboard, NoShows, Blocklist load in <200ms
- [ ] All pages show identical count numbers
- [ ] Zero frontend count calculations
- [ ] Zero frontend filtering/mapping operations
- [ ] All CRUD operations (add/remove/export) work
- [ ] No console errors or warnings
- [ ] No N+1 queries in backend logs

**Status:** Ready for integration
