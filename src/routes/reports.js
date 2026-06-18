const express = require('express');
const router = express.Router();
const { getLatestScan, getScanHistory, getThreatsByScanId } = require('../database/db');
const { generateReport } = require('../reports/reportGenerator');

router.get('/latest', async (req, res) => {
  try {
    const scan = await getLatestScan();
    if (!scan) {
      return res.status(404).json({ error: 'No scans found' });
    }
    
    const threats = await getThreatsByScanId(scan.id);
    
    // Reconstruct minimal report from DB data
    const report = {
      summary: {
        scan_date: scan.scan_date,
        scan_duration_ms: scan.scan_duration_ms,
        total_files: scan.files_scanned,
        total_folders: scan.folders_scanned,
        security_score: scan.security_score,
        threats_found: scan.threats_found || threats.length
      },
      metrics: {
        files_scanned: scan.files_scanned,
        folders_scanned: scan.folders_scanned,
        hidden_files: scan.hidden_files,
        dangerous_files: scan.dangerous_files,
        duplicate_files: scan.duplicate_files,
        modified_files: scan.modified_files
      },
      threats: threats,
      status: scan.status
    };
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const history = await getScanHistory(50);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
