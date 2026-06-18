const express = require('express');
const path = require('path');
const { initDatabase } = require('./database/db');
const scanRoutes = require('./routes/scan');
const reportRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');
const { getAllThreats, getDatabase } = require('./database/db');
const { generateSolutionsReport } = require('./security/solutions');

const app = express();
const PORT = process.env.PORT || 3000;

// Store SSE clients for real-time notifications
const sseClients = new Set();

// Function to emit threat alerts to all connected clients
function emitThreatAlert(threatData) {
  const data = JSON.stringify(threatData);
  sseClients.forEach(client => {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (e) {
      // Client disconnected
    }
  });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, '../dashboard')));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SSE endpoint for real-time threat alerts
app.get('/alerts', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial connection message
  res.write('data: {"type":"connected","message":"Real-time alerts active"}\n\n');
  
  // Add client to set
  sseClients.add(res);
  
  // Remove client on disconnect
  req.on('close', () => {
    sseClients.delete(res);
  });
});

app.get('/threats', async (req, res) => {
  try {
    const threats = await getAllThreats(200);
    res.json(threats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/solutions', async (req, res) => {
  try {
    const threats = await getAllThreats(200);
    const report = generateSolutionsReport(threats, []);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/clear', async (req, res) => {
  try {
    const db = getDatabase();
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM threats', (err) => {
        if (err) return reject(err);
        db.run('DELETE FROM scan_history', (err2) => {
          if (err2) return reject(err2);
          resolve();
        });
      });
    });
    res.json({ message: 'All scan data cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/scan', scanRoutes);
app.use('/reports', reportRoutes);
app.use('/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Dashboard: http://localhost:${PORT}`);
      
    // Start background scanning loop (every 30 minutes) - MONITOR ENTIRE LAPTOP
    const { startBackgroundScanning } = require('./routes/scan');
    startBackgroundScanning('/home', 30);
    console.log('Background scanning started: every 30 minutes for ENTIRE LAPTOP');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, emitThreatAlert };
