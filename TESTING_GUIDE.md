# BATCH IMPORT TESTING GUIDE

## Quick Start Test (5 minutes)

### Prerequisites
- ✅ Backend running: `npm run dev` in `/backend`
- ✅ Frontend running: Accessible at `http://localhost:5173` (or configured port)
- ✅ CSV files available: See `sample_participants.csv` and `sample_attendance.csv`

---

## Test 1: Participant Batch Import

### Setup
1. Open frontend application
2. Navigate to "Import" page
3. Click "Import Participants" tab

### Execute
1. **Upload CSV**
   - Click file input
   - Select `sample_participants.csv` (280 rows)
   - Observe: File loads and shows preview

2. **Select Event**
   - Choose an event from dropdown
   - (Create one if needed: Events → Add New Event)

3. **Start Import**
   - Click "Import" button
   - Observe: Button shows loading state
   - **TIME MEASUREMENT**: Note start time

4. **Monitor Progress**
   - Open DevTools (F12)
   - Network tab
   - Filter by "XHR"
   - Should see: Single POST request to `/bulk-import-batch`
   - Not 280 individual requests ✨

### Expected Results
- ✅ Import completes in **5-10 seconds** (not 2-3 minutes)
- ✅ Success message: "280 participants imported"
- ✅ Single POST request in network tab
- ✅ CSV preview clears after import
- ✅ No errors in browser console

### Verification
1. **Go to Participants page**
   - All 280 should be listed
   - Status: "Active"
   - No blocklist flag

2. **Go to Events page**
   - Click event name
   - Participants count: 280
   - No attendance records yet

---

## Test 2: Attendance Batch Import

### Setup
1. From Import page
2. Click "Import Attendance" tab

### Execute
1. **Upload CSV**
   - Click file input
   - Select `sample_attendance.csv` (280 rows)
   - Should have columns: Name, Email, Status
   - Observe: Preview shows validation (green/red rows)

2. **Select Event**
   - Choose same event as participant import
   - Ensures attendance records link correctly

3. **Start Import**
   - Click "Import" button
   - **TIME MEASUREMENT**: Note start time

4. **Monitor Progress**
   - DevTools → Network tab
   - Should see: Single POST to `/attendance/bulk-import-batch`
   - Response: `{ imported: count, failed: 0, errors: [] }`

### Expected Results
- ✅ Import completes in **5-10 seconds**
- ✅ Success message shows import stats
- ✅ Single POST request visible
- ✅ CSV preview clears after import
- ✅ No errors in console

### Verification
1. **Go to Dashboard**
   - Attendance stats updated
   - Shows 280 records marked

2. **Go to Events page**
   - Click event
   - Attendance records visible
   - Status breakdown shown

3. **Go to Blocklist** (if no-shows present)
   - Participants with 2+ no-shows appear
   - Auto-blocklist reason shown

---

## Test 3: Error Handling

### Test 3A: Missing Required Fields

**Setup**
1. Create invalid CSV with columns: Name, (missing Email)
2. Try to import attendance

**Expected**
- ✅ Error message: "All records must have required fields"
- ✅ No data imported
- ✅ Clear indication of what's missing

### Test 3B: Invalid Email Format

**Setup**
1. Use CSV with email without "@" symbol
2. Rows preview shows red for invalid

**Expected**
- ✅ Invalid rows highlighted in red
- ✅ Can still import valid rows
- ✅ Error details specific

### Test 3C: Duplicate Emails

**Setup**
1. Attend same event twice with same email
2. Import attendance CSV with duplicate

**Expected**
- ✅ Second import updates first record
- ✅ No duplicate records created
- ✅ Attendance status updated correctly

---

## Test 4: Auto-Blocklist Logic

### Setup
1. Import attendance with multiple "no-show" entries for same participant
2. Ensure at least one participant has 2+ no-shows

### Execute
1. Check Blocklist page after import
2. Filter by auto-blocklisted

### Expected Results
- ✅ Participants with 2+ no-shows appear
- ✅ Blocklist reason shown: "Auto-blocklisted: X no-shows"
- ✅ Status updates immediately after import

---

## Test 5: Large File Performance

### Setup
1. Create CSV with 500 rows (or duplicate existing CSV)
2. Prepare to measure timing

### Execute
1. Import larger file
2. Note time from click to completion
3. Should still be reasonable (under 30 seconds)

### Expected
- ✅ Still uses batch endpoint (single request)
- ✅ Linear scaling (not exponential)
- ✅ No timeout errors

---

## Test 6: Network Verification

### DevTools Network Tab Analysis

**Single Request Test**
```
Method: POST
URL: /api/participants/bulk-import-batch
Status: 201 Created
Size: ~50-100 KB (entire CSV data)
Time: 1-5 seconds

Response:
{
  "success": true,
  "data": [
    { id: "...", name: "...", email: "..." },
    { id: "...", name: "...", email: "..." },
    ...280 items total...
  ]
}
```

**Expected Pattern**
- ✅ NOT 280 individual requests
- ✅ Single POST with array payload
- ✅ Response time <5 seconds
- ✅ Status 201 (created)

### Network Tab Checklist
- [ ] Only ONE POST request per import
- [ ] Request URL includes "/bulk-import-batch"
- [ ] Request body contains array of items
- [ ] Response status is 201
- [ ] Response includes success flag
- [ ] Request completes in <5 seconds

---

## Test 7: Concurrent Imports

### Setup
1. Open two browser tabs
2. Both on Import page

### Execute
1. Tab 1: Start participant import
2. Tab 2: Start attendance import
3. Both simultaneously

### Expected
- ✅ Both requests processed independently
- ✅ No conflicts or data corruption
- ✅ Both complete successfully

---

## Test 8: UI State Management

### Setup
1. Start import
2. While importing, try to interact

### Execute
1. Click Import button while already importing
   - Should be disabled or show loading
2. Try to navigate away
   - Should warn if incomplete
3. Check button state

### Expected
- ✅ Button disabled during import
- ✅ Loading indicator visible
- ✅ No duplicate submissions
- ✅ Clear completion message

---

## Performance Benchmarking

### Baseline Measurements

Create benchmark file: `BENCHMARK_RESULTS.md`

```
## Test Environment
- Browser: [Your Browser]
- OS: [Your OS]
- Network: [Connection Type]
- Backend Server: Local/Remote

## Results

### Test 1: 280 Participant Import
- Duration: __ seconds
- Network Requests: __ (should be 1)
- HTTP Status: __ (should be 201)
- Success: ✓

### Test 2: 280 Attendance Import
- Duration: __ seconds
- Network Requests: __ (should be 1)
- HTTP Status: __ (should be 201)
- Success: ✓

### Test 3: 500 Record Import
- Duration: __ seconds
- Network Requests: __ (should be 1)
- Success: ✓

### Improvement vs Previous
- Before: 2-3 minutes
- After: __ seconds
- Improvement: __x faster
```

---

## Troubleshooting Common Issues

### Issue: "Import completed: 0 successful, 280 failed"

**Cause**: Backend route not registered

**Solution**:
1. Stop backend: `Ctrl+C`
2. Restart backend: `npm run dev`
3. Wait for "Server running" message
4. Try import again

### Issue: Single rows import fine, batch fails

**Cause**: Array validation issue

**Solution**:
1. Check CSV column names match expected format
2. Verify all rows have required fields
3. Check for special characters in data
4. See error details in response

### Issue: Import hangs or times out

**Cause**: Server overloaded or network issue

**Solution**:
1. Check network tab for active requests
2. Verify backend is responsive
3. Try with smaller file (50 rows)
4. Check server logs in terminal

### Issue: "Route not found" error

**Cause**: Backend not running latest code

**Solution**:
1. Verify backend running: `npm run dev`
2. Check port 5000 is accessible
3. Test with curl:
   ```bash
   curl -X POST http://localhost:5000/api/participants/bulk-import-batch \
     -H "Content-Type: application/json" \
     -d '{"participants":[]}'
   ```

### Issue: Records imported but attendance missing

**Cause**: Separate import didn't run

**Solution**:
1. For participants: Only creates participants, no attendance
2. Must separately import attendance CSV
3. Use "Import Attendance" tab for attendance records

---

## Success Checklist

Before marking as complete:
- [ ] Participant batch import works (280 rows in <10 sec)
- [ ] Attendance batch import works (280 rows in <10 sec)
- [ ] Network shows single POST request per import
- [ ] Error handling works for invalid data
- [ ] Auto-blocklist triggered for 2+ no-shows
- [ ] Large files (500+) still use batch endpoint
- [ ] UI shows loading state during import
- [ ] Success/error messages clear and helpful
- [ ] No duplicate records created
- [ ] Data integrity verified in database

---

## Performance Expectations

### ✅ Expected (Optimal)
- Import 280 rows: 5-10 seconds
- Import 500 rows: 10-20 seconds
- Network: Single POST request
- Database: 2 batch operations

### ⚠️ Acceptable (Degraded)
- Import 280 rows: 10-30 seconds
- Import 500 rows: 20-60 seconds
- Network: Still single request, slower
- Database: Still batch operations

### ❌ Problematic (Issue)
- Import 280 rows: >60 seconds
- Multiple HTTP requests (280+ for old code)
- Individual database inserts observed
- Timeout errors

---

## Final Validation

**Run this checklist after each deployment:**

1. **Frontend Deployed**
   - [ ] App loads without errors
   - [ ] Import tab visible
   - [ ] CSV file input works

2. **Backend Deployed**
   - [ ] Server starts: `npm run dev`
   - [ ] Endpoints respond: `curl http://localhost:5000/api/events`
   - [ ] Database connected: Supabase initialized message

3. **Integration Working**
   - [ ] CSV parses correctly
   - [ ] Validation highlights invalid rows
   - [ ] Import button enabled when ready
   - [ ] Success message appears

4. **Performance Verified**
   - [ ] Import <15 seconds for 280 rows
   - [ ] Single batch request in network tab
   - [ ] Response includes all data

5. **Data Correct**
   - [ ] All rows imported successfully
   - [ ] No duplicates created
   - [ ] Events associated correctly
   - [ ] Status accurate

**If all checkboxes pass: ✅ BATCH IMPORT OPTIMIZATION COMPLETE**
