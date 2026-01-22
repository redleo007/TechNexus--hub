const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Mock dashboard summary endpoint - matches backend response format
app.get('/api/dashboard/summary', (req, res) => {
  console.log('GET /api/dashboard/summary called');
  res.json({
    events: 42,
    participants: 156,
    noShows: 8,
    blocklisted: 3,
    lastUpdated: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Mock backend running on http://localhost:${PORT}`);
});
