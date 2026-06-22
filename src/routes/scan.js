const express = require('express');
const router = express.Router();
const { scanDirectory, getScanTarget } = require('../scanner/fileScanner');
const { calculateFileHash } = require('../hash/hashGenerator');
const { analyzeThreat, getThreatsForDatabase } = require('../security/threatAnalyzer');
const { calculateSecurityScore, getScoreLabel, getScoreColor } = require('../security/riskEngine');
const { generateReport } = require('../reports/reportGenerator');
const { shouldCheckWithVirusTotal, checkFileWithVirusTotal, formatVirusTotalResult } = require('../security/virusTotalService');
const { saveVirusTotalResult } = require('../database/db');
const { ScanManager } = require('../scanner/scanManager');
const { resolveAndValidate } = require('../utils/pathResolver');
const {
  saveScan,
  saveThreats,
  getLatestScan,
  getScanHistory,
  getThreatsByScanId,
  getAllThreats
} = require('../database/db');

const scanManager = new ScanManager();

let backgroundScanInterval = null;
let fileWatcher = null;

// Real-time file system watcher
function startFileWatcher(targetPath) {
  const chokidar = require('chokidar');
  
  const SYSTEM_DIRS = [
    '/dev', '/proc', '/sys', '/run', '/boot', '/snap', '/tmp',
    '/var', '/usr', '/sbin', '/bin', '/lib', '/lib64', '/etc',
    '/root', '/lost+found', '/mnt/wslg'
  ];
  
  const watcher = chokidar.watch([
    '/home',
    '/mnt/c/Users',
    '/mnt/d'
  ], {
    ignored: (path, stats) => {
      // Skip system directories
      const systemDirs = [
        '/dev', '/proc', '/sys', '/run', '/boot', '/snap', '/tmp',
        '/var', '/usr', '/sbin', '/bin', '/lib', '/lib64', '/etc',
        '/root', '/lost+found', '/mnt/wslg',
        'node_modules', '.git', '.hermes', '.cache', 'dist', 'build',
        'AppData', 'Windows', 'Program Files', 'Program Files (x86)',
        'ProgramData', 'Recovery', 'System Volume Information',
        '$Recycle.Bin', 'Config.Msi', 'MSOCache', 'inetpub'
      ];
      
      for (const dir of systemDirs) {
        if (path.includes('/' + dir + '/') || path.endsWith('/' + dir)) return true;
      }
      
      // Skip hidden files except in home
      if (path.includes('/.') && !path.startsWith('/home/paperclip')) return true;
      
      return false;
    },
    persistent: true,
    ignoreInitial: true,
    followSymlinks: false,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });
  
  watcher.on('add', async (filePath) => {
    console.log(`[${new Date().toISOString()}] New file detected: ${filePath}`);
    
    // Quick scan the new file
    const result = await quickScanFile(filePath);
    if (result && result.threats.length > 0) {
      console.log(`[${new Date().toISOString()}] THREAT DETECTED in new file: ${filePath}`);
      // Store the threat for immediate dashboard display
      await storeImmediateThreat(filePath, result);
    }
  });
  
  watcher.on('change', async (filePath) => {
    console.log(`[${new Date().toISOString()}] File modified: ${filePath}`);
    
    // Re-scan modified file
    const result = await quickScanFile(filePath);
    if (result && result.threats.length > 0) {
      console.log(`[${new Date().toISOString()}] THREAT DETECTED in modified file: ${filePath}`);
      await storeImmediateThreat(filePath, result);
    }
  });
  
  console.log(`[${new Date().toISOString()}] Real-time file watcher started for: ${targetPath}`);
  return watcher;
}

async function quickScanFile(filePath) {
  try {
    const fs = require('fs');
    const path = require('path');
    const { analyzeThreat } = require('../security/threatAnalyzer');
    
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) return null;
    
    const ext = path.extname(filePath);
    const fileInfo = {
      path: filePath,
      name: path.basename(filePath),
      extension: ext,
      size: stats.size,
      isHidden: path.basename(filePath).startsWith('.'),
      isDangerous: ['.exe', '.scr', '.msi', '.dll', '.bat', '.cmd', '.vbs', '.ps1', '.js', '.sh', '.py', '.php', '.pl'].includes(ext.toLowerCase()),
      hash: null
    };
    
    const threats = analyzeThreat(fileInfo);
    return { fileInfo, threats };
  } catch (e) {
    return null;
  }
}

async function storeImmediateThreat(filePath, result) {
  try {
    const db = require('../database/db');
    const threat = result.threats[0];
    
    await db.run(
      `INSERT INTO threats (file_name, file_path, file_hash, file_size, threat_type, risk_level, detected_at) 
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        result.fileInfo.name,
        filePath,
        result.fileInfo.hash || 'unknown',
        result.fileInfo.size,
        threat.type,
        threat.severity
      ]
    );
    
    console.log(`[${new Date().toISOString()}] Threat stored in database: ${threat.type} - ${threat.severity}`);
  } catch (e) {
    console.error('Failed to store immediate threat:', e);
  }
}

async function runBackgroundScan(targetPath) {
  try {
    await scanManager.startScan(targetPath, {
      scanMode: 'full',
      maxDepth: 15
    });
  } catch (error) {
    console.error('Background scan error:', error);
  }
}

function startBackgroundScanning(targetPath, intervalMinutes = 30) {
  if (backgroundScanInterval) clearInterval(backgroundScanInterval);
  
  // Start real-time file watcher for ENTIRE LAPTOP
  if (!fileWatcher) {
    fileWatcher = startFileWatcher('/');
  }

  // Run immediately on startup
  runBackgroundScan(targetPath);

  // Then every interval
  backgroundScanInterval = setInterval(async () => {
    // Get latest folder from config before each scan
    const { getScanConfig } = require('../database/db');
    const latestFolder = await getScanConfig();
    runBackgroundScan(latestFolder);
  }, intervalMinutes * 60 * 1000);
  
  console.log(`[${new Date().toISOString()}] Background scanning started: every ${intervalMinutes} minutes + real-time file watcher for ENTIRE LAPTOP`);
}

router.post('/start', async (req, res) => {
  try {
    const status = scanManager.getStatus();
    if (status.status === 'scanning') {
      return res.status(409).json({ error: 'Scan already in progress' });
    }

    // Get folder from request or config
    let targetPath = req.body.path;
    if (!targetPath) {
      const { getScanConfig } = require('../database/db');
      targetPath = await getScanConfig();
    }
    
    // Use path resolver to detect and normalize path
    const pathResult = resolveAndValidate(targetPath);
    
    if (!pathResult.isValid || !pathResult.validation.readable) {
      return res.status(400).json({
        error: pathResult.validation.message || 'Invalid path',
        details: {
          originalPath: pathResult.originalPath,
          normalizedPath: pathResult.normalizedPath,
          type: pathResult.type
        }
      });
    }
    
    const normalizedPath = pathResult.normalizedPath;
    const scanMode = req.body.mode || 'full';
    
    res.json({ 
      message: 'Scan started', 
      path: normalizedPath, 
      originalPath: pathResult.originalPath,
      type: pathResult.type,
      mode: scanMode 
    });

    // Start scan in background
    if (scanMode === 'quick') {
      await scanManager.quickScan();
    } else {
      await scanManager.startScan(normalizedPath, { scanMode: 'full' });
    }
  } catch (error) {
    console.error('Scan error:', error);
  }
});

router.post('/quick', async (req, res) => {
  try {
    const status = scanManager.getStatus();
    if (status.status === 'scanning') {
      return res.status(409).json({ error: 'Scan already in progress' });
    }

    res.json({ message: 'Quick scan started' });
    await scanManager.quickScan();
  } catch (error) {
    console.error('Quick scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', (req, res) => {
  res.json(scanManager.getStatus());
});

router.get('/last-scan', (req, res) => {
  const status = scanManager.getStatus();
  res.json({
    lastScanAt: status.status === 'completed' ? new Date().toISOString() : null,
    status: status.status,
    nextScanIn: status.status === 'scanning' ? 'running now' : '30 minutes'
  });
});

// New endpoint for informational files
router.get('/informational', async (req, res) => {
  try {
    const { getInformationalFiles } = require('../database/db');
    const files = await getInformationalFiles(100);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.startBackgroundScanning = startBackgroundScanning;
module.exports.latestReport = () => scanManager.latestReport;
