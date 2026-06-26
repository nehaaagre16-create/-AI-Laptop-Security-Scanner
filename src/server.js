const express = require('express');
const path = require('path');
require('dotenv').config();
const { initDatabase } = require('./database/db');
const scanRoutes = require('./routes/scan');
const reportRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');
const { getAllThreats, getDatabase } = require('./database/db');
const { generateSolutionsReport } = require('./security/solutions');
const { resolveAndValidate } = require('./utils/pathResolver');

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
app.use(express.static(path.join(__dirname, '../dashboard'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Serve SPA - fallback to index.html for React Router
app.get('/dashboard*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});
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

// VirusTotal on-demand check endpoint
app.post('/virustotal/check', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath required' });
    }
    const { calculateFileHash } = require('./hash/hashGenerator');
    const { checkHash } = require('./security/virusTotal');
    const hash = await calculateFileHash(filePath);
    const result = await checkHash(hash);
    res.json({ hash, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scan folder configuration endpoints
app.get('/api/config/folder', async (req, res) => {
  try {
    const { getScanConfig } = require('./database/db');
    const folderPath = await getScanConfig();
    res.json({ folderPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/folder', async (req, res) => {
  try {
    const { folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ error: 'folderPath required' });
    }
    
    // Use path resolver to detect and normalize path
    const result = resolveAndValidate(folderPath);
    
    if (!result.isValid || !result.validation.readable) {
      return res.status(400).json({ 
        error: result.validation.message || 'Invalid path',
        details: {
          originalPath: result.originalPath,
          normalizedPath: result.normalizedPath,
          type: result.type
        }
      });
    }
    
    const { updateScanConfig } = require('./database/db');
    await updateScanConfig(result.normalizedPath);
    res.json({
      message: 'Folder updated',
      folderPath: result.normalizedPath,
      userPath: result.originalPath,
      resolvedPath: result.normalizedPath,
      type: result.type,
      validation: result.validation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notification preferences endpoints
app.get('/api/notifications', async (req, res) => {
  try {
    const { getUserPreferences } = require('./database/db');
    const prefs = await getUserPreferences(1);
    res.json({ notificationsEnabled: prefs.notifications_enabled === 1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled boolean required' });
    }
    const { updateUserPreferences } = require('./database/db');
    await updateUserPreferences(1, { notifications_enabled: enabled });
    res.json({ success: true, notificationsEnabled: enabled });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});

async function startServer() {
  try {
    await initDatabase();
    
    // Get initial folder from config before starting server
    const { getScanConfig } = require('./database/db');
    const initialFolder = await getScanConfig();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Dashboard: http://localhost:${PORT}`);
      console.log(`WSL IP: http://172.30.77.104:${PORT}`);
      
      // Start background scanning loop (every 30 minutes)
      const { startBackgroundScanning } = require('./routes/scan');
      startBackgroundScanning(initialFolder, 30);
      console.log('Background scanning started:', initialFolder);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, emitThreatAlert };
