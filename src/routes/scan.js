const express = require('express');
const router = express.Router();
const { scanDirectory, getScanTarget } = require('../scanner/fileScanner');
const { hashFiles } = require('../hash/hashGenerator');
const { analyzeThreat, getThreatsForDatabase } = require('../security/threatAnalyzer');
const { calculateSecurityScore } = require('../security/riskEngine');
const { generateReport } = require('../reports/reportGenerator');
const {
  saveScan,
  saveThreats,
  getLatestScan,
  getScanHistory,
  getThreatsByScanId,
  getAllThreats
} = require('../database/db');

let scanStatus = { status: 'idle', progress: 0 };
let latestReport = null;
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
  if (scanStatus.status === 'scanning') return;

  scanStatus = { status: 'scanning', progress: 0, path: targetPath };
  console.log(`[${new Date().toISOString()}] Background scan started: ${targetPath}`);

  const startTime = Date.now();

  try {
    const scanResult = await scanDirectory(targetPath, {
      maxDepth: 15,
      includeHidden: true,
      excludeDirs: [
        'dev', 'proc', 'sys', 'run', 'boot', 'snap', 'tmp',
        'var', 'usr', 'sbin', 'bin', 'lib', 'lib64', 'etc',
        'root', 'lost+found', 'node_modules', '.git', '.hermes',
        '.cache', 'dist', 'build', '.vscode', '.idea'
      ]
    });

    scanStatus.progress = 30;

    const hashedFiles = await hashFiles(scanResult.files);
    scanStatus.progress = 60;

    const threats = [];
    for (const file of hashedFiles) {
      const fileThreats = analyzeThreat(file);
      const dbThreat = getThreatsForDatabase(file, fileThreats);
      if (dbThreat) {
        threats.push(dbThreat);
      }
    }

    const securityScore = calculateSecurityScore(hashedFiles, threats);
    const scanDuration = Date.now() - startTime;

    const scanId = await saveScan({
      files_scanned: hashedFiles.length,
      folders_scanned: scanResult.folders,
      hidden_files: hashedFiles.filter(f => f.isHidden).length,
      dangerous_files: hashedFiles.filter(f => f.isDangerous).length,
      duplicate_files: hashedFiles.filter(f => f.isDuplicate).length,
      modified_files: 0,
      security_score: securityScore,
      scan_duration_ms: scanDuration
    });

    await saveThreats(scanId, threats);

    const report = generateReport({
      files: hashedFiles,
      threats: threats,
      scanDuration: scanDuration,
      scanPath: targetPath,
      folders: scanResult.folders
    });

    latestReport = report;
    scanStatus = {
      status: 'completed',
      progress: 100,
      scanId: scanId,
      report: report
    };

    console.log(`[${new Date().toISOString()}] Background scan complete: ${hashedFiles.length} files, ${threats.length} threats, score ${securityScore}`);
  } catch (error) {
    scanStatus = { status: 'error', error: error.message };
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
  backgroundScanInterval = setInterval(() => {
    runBackgroundScan(targetPath);
  }, intervalMinutes * 60 * 1000);
  
  console.log(`[${new Date().toISOString()}] Background scanning started: every ${intervalMinutes} minutes + real-time file watcher for ENTIRE LAPTOP`);
}

router.post('/start', async (req, res) => {
  try {
    if (scanStatus.status === 'scanning') {
      return res.status(409).json({ error: 'Scan already in progress' });
    }

    const targetPath = req.body.path || getScanTarget();
    res.json({ message: 'Scan started', path: targetPath });

    await runBackgroundScan(targetPath);
  } catch (error) {
    scanStatus = { status: 'error', error: error.message };
    console.error('Scan error:', error);
  }
});

router.get('/status', (req, res) => {
  res.json(scanStatus);
});

router.get('/last-scan', (req, res) => {
  res.json({
    lastScanAt: scanStatus.status === 'completed' ? new Date().toISOString() : null,
    status: scanStatus.status,
    nextScanIn: scanStatus.status === 'scanning' ? 'running now' : '30 minutes'
  });
});

module.exports = router;
module.exports.startBackgroundScanning = startBackgroundScanning;
module.exports.latestReport = latestReport;
