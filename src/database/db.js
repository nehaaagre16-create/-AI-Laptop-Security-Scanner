const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../reports/scans.db');

let db = null;

function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) return reject(err);
      console.log('Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
}

function createTables() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS scan_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        files_scanned INTEGER DEFAULT 0,
        folders_scanned INTEGER DEFAULT 0,
        hidden_files INTEGER DEFAULT 0,
        dangerous_files INTEGER DEFAULT 0,
        duplicate_files INTEGER DEFAULT 0,
        modified_files INTEGER DEFAULT 0,
        security_score INTEGER DEFAULT 100,
        scan_duration_ms INTEGER DEFAULT 0,
        status TEXT DEFAULT 'completed'
      )
    `, (err) => {
      if (err) return reject(err);
      
      db.run(`
        CREATE TABLE IF NOT EXISTS threats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scan_id INTEGER,
          file_name TEXT,
          file_path TEXT,
          file_hash TEXT,
          file_size INTEGER,
          threat_type TEXT,
          risk_level TEXT,
          detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (scan_id) REFERENCES scan_history(id)
        )
      `, (err2) => {
        if (err2) return reject(err2);
        
        db.run(`
          CREATE TABLE IF NOT EXISTS virustotal_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path TEXT UNIQUE,
            file_hash TEXT,
            malicious INTEGER DEFAULT 0,
            suspicious INTEGER DEFAULT 0,
            harmless INTEGER DEFAULT 0,
            total INTEGER DEFAULT 0,
            verdict TEXT,
            checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            error TEXT
          )
        `, (err3) => {
          if (err3) return reject(err3);
          
          db.run(`
            CREATE TABLE IF NOT EXISTS file_hash_cache (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              file_path TEXT UNIQUE,
              hash TEXT,
              last_modified INTEGER,
              risk_level TEXT,
              last_checked DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err4) => {
            if (err4) return reject(err4);
            
            db.run(`
              CREATE TABLE IF NOT EXISTS scan_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                folder_path TEXT NOT NULL DEFAULT '/home/paperclip',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `, (err5) => {
              if (err5) return reject(err5);
              
              // Insert default config if not exists
              db.run(`
                INSERT OR IGNORE INTO scan_config (id, folder_path) VALUES (1, '/home/paperclip')
              `, (err6) => {
                if (err6) return reject(err6);
                resolve();
              });
            });
          });
        });
      });
    });
  });
}

function saveScan(scanData) {
  return new Promise((resolve, reject) => {
    const {
      files_scanned, folders_scanned, hidden_files, dangerous_files,
      duplicate_files, modified_files, security_score, scan_duration_ms
    } = scanData;
    
    db.run(
      `INSERT INTO scan_history 
       (files_scanned, folders_scanned, hidden_files, dangerous_files, 
        duplicate_files, modified_files, security_score, scan_duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [files_scanned, folders_scanned, hidden_files, dangerous_files,
       duplicate_files, modified_files, security_score, scan_duration_ms],
      function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

function saveThreats(scanId, threats) {
  return new Promise((resolve, reject) => {
    if (!threats || threats.length === 0) return resolve();
    
    const stmt = db.prepare(
      `INSERT INTO threats 
       (scan_id, file_name, file_path, file_hash, file_size, threat_type, risk_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    
    let completed = 0;
    let hasError = false;
    
    threats.forEach(threat => {
      stmt.run(
        [scanId, threat.file_name, threat.file_path, threat.file_hash,
         threat.file_size, threat.threat_type, threat.risk_level],
        (err) => {
          if (hasError) return;
          if (err) {
            hasError = true;
            return reject(err);
          }
          completed++;
          if (completed === threats.length) {
            stmt.finalize();
            resolve();
          }
        }
      );
    });
  });
}

function getScanHistory(limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM scan_history ORDER BY scan_date DESC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function getLatestScan() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM scan_history ORDER BY scan_date DESC LIMIT 1`,
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

function getThreatsByScanId(scanId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM threats WHERE scan_id = ? ORDER BY risk_level DESC`,
      [scanId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function getAllThreats(limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT t.*, s.scan_date 
       FROM threats t 
       JOIN scan_history s ON t.scan_id = s.id 
       WHERE t.risk_level IN ('critical', 'high', 'medium', 'low')
       ORDER BY t.detected_at DESC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function getInformationalFiles(limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT t.*, s.scan_date 
       FROM threats t 
       JOIN scan_history s ON t.scan_id = s.id 
       WHERE t.risk_level IN ('informational', 'suspicious', 'safe')
       ORDER BY t.detected_at DESC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function getDashboardStats() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as total_scans FROM scan_history`, (err, scans) => {
      if (err) return reject(err);
      // Only count actual threats (not informational/safe)
      db.get(`SELECT COUNT(*) as total_threats FROM threats WHERE risk_level IN ('critical', 'high', 'medium', 'low')`, (err2, threats) => {
        if (err2) return reject(err2);
        db.get(`SELECT COUNT(*) as informational_count FROM threats WHERE risk_level IN ('informational', 'suspicious', 'safe')`, (err2b, info) => {
          if (err2b) return reject(err2b);
          db.get(`SELECT AVG(security_score) as avg_score FROM scan_history`, (err3, score) => {
            if (err3) return reject(err3);
            db.get(`SELECT SUM(files_scanned) as total_files FROM scan_history`, (err4, files) => {
              if (err4) return reject(err4);
              db.get(`SELECT files_scanned, security_score FROM scan_history ORDER BY scan_date DESC LIMIT 1`, (err5, latest) => {
                if (err5) return reject(err5);
                resolve({
                  total_scans: scans.total_scans,
                  total_threats: threats.total_threats,
                  informational_count: info.informational_count,
                  avg_security_score: Math.round(score.avg_score || 100),
                  total_files_scanned: files.total_files || 0,
                  latest_files_scanned: latest ? latest.files_scanned : 0,
                  latest_security_score: latest ? latest.security_score : 100
                });
              });
            });
          });
        });
      });
    });
  });
}

function saveVirusTotalResult(result) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO virustotal_results 
       (file_path, file_hash, malicious, suspicious, harmless, total, verdict, checked_at, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [result.file_path, result.file_hash, result.malicious || 0, result.suspicious || 0,
       result.harmless || 0, result.total || 0, result.verdict || 'unknown', result.checked_at,
       result.error || null],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function getVirusTotalResult(filePath) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM virustotal_results WHERE file_path = ?`,
      [filePath],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

function getAllVirusTotalResults(limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM virustotal_results ORDER BY checked_at DESC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

// File hash cache functions
function getCachedHash(filePath) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM file_hash_cache WHERE file_path = ?`,
      [filePath],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

function saveHashCache(filePath, hash, lastModified, riskLevel) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO file_hash_cache 
       (file_path, hash, last_modified, risk_level, last_checked)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [filePath, hash, lastModified, riskLevel],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

// Scan config functions
function getScanConfig() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT folder_path FROM scan_config WHERE id = 1`,
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.folder_path : '/home/paperclip');
      }
    );
  });
}

function updateScanConfig(folderPath) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO scan_config (id, folder_path, updated_at) VALUES (1, ?, datetime('now'))`,
      [folderPath],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function getDatabase() {
  return db;
}

module.exports = {
  initDatabase,
  saveScan,
  saveThreats,
  getScanHistory,
  getLatestScan,
  getThreatsByScanId,
  getAllThreats,
  getInformationalFiles,
  getDashboardStats,
  saveVirusTotalResult,
  getAllVirusTotalResults,
  getCachedHash,
  saveHashCache,
  getScanConfig,
  updateScanConfig,
  getDatabase
};