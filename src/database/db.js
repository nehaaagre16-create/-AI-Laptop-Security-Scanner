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
        resolve();
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
      db.get(`SELECT COUNT(*) as total_threats FROM threats`, (err2, threats) => {
        if (err2) return reject(err2);
        db.get(`SELECT AVG(security_score) as avg_score FROM scan_history`, (err3, score) => {
          if (err3) return reject(err3);
          db.get(`SELECT SUM(files_scanned) as total_files FROM scan_history`, (err4, files) => {
            if (err4) return reject(err4);
            resolve({
              total_scans: scans.total_scans,
              total_threats: threats.total_threats,
              avg_security_score: Math.round(score.avg_score || 100),
              total_files_scanned: files.total_files || 0
            });
          });
        });
      });
    });
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
  getDashboardStats,
  getDatabase
};
