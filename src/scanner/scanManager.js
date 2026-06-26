const { scanDirectory } = require('./fileScanner');
const { calculateFileHash } = require('../hash/hashGenerator');
const { analyzeThreat, getThreatsForDatabase } = require('../security/threatAnalyzer');
const { calculateSecurityScore, getScoreLabel, getScoreColor } = require('../security/riskEngine');
const { generateReport } = require('../reports/reportGenerator');
const { ProgressTracker } = require('./progressTracker');
const { getCachedHash, saveHashCache, saveScan, saveThreats } = require('../database/db');

class ScanManager {
  constructor() {
    this.scanStatus = { status: 'idle', progress: 0 };
    this.latestReport = null;
    this.progressTracker = new ProgressTracker();
    this.currentScanId = null;
  }

  getStatus() {
    if (this.progressTracker.isScanning) {
      const progress = this.progressTracker.getProgress();
      return {
        status: 'scanning',
        progress: progress.percentage,
        path: this.scanStatus.path,
        currentFile: progress.currentFile,
        currentAction: progress.currentAction,
        filesFound: progress.totalFiles,
        filesProcessed: progress.processedFiles,
        threatsFound: progress.threatsFound,
        activity: progress.activity,
        scanMode: this.scanStatus.scanMode
      };
    }
    return this.scanStatus;
  }

  async startScan(targetPath, options = {}) {
    if (this.progressTracker.isScanning) {
      throw new Error('Scan already in progress');
    }

    const { 
      scanMode = 'full',
      maxDepth = 15,
      includeHidden = true,
      onProgress = null
    } = options;

    this.scanStatus = { 
      status: 'scanning', 
      progress: 0, 
      path: targetPath,
      scanMode 
    };

    const startTime = Date.now();
    this.progressTracker.start();

    try {
      // Phase 1: Discover files (0-30%)
      this.progressTracker.currentAction = 'Discovering files...';
      const scanResult = await scanDirectory(targetPath, {
        maxDepth,
        includeHidden,
        onFileFound: (fileInfo) => {
          // Update progress for each file found
          if (this.progressTracker.totalFiles === 0) {
            // First file discovered, we don't know total yet
          }
        }
      });

      // Now we know total files
      this.progressTracker.setTotalFiles(scanResult.files.length);
      this.scanStatus.progress = 30;

      // Phase 2: Analyze files with hash caching (30-80%)
      this.progressTracker.currentAction = 'Analyzing files...';
      const threats = [];
      const processedFiles = [];

      for (let i = 0; i < scanResult.files.length; i++) {
        const file = scanResult.files[i];
        
        // Update progress tracker
        this.progressTracker.updateFile(file.path, `Analyzing ${file.name}...`);
        
        // Check hash cache for modified files
        if (file.isDangerous || file.isHidden) {
          const cached = await getCachedHash(file.path);
          const modifiedTime = file.modified.getTime();
          
          if (cached && cached.last_modified === modifiedTime) {
            // Use cached hash
            file.hash = cached.hash;
            file.risk_level = cached.risk_level;
            this.progressTracker.addActivity(`Cached: ${file.name}`);
          } else {
            // Generate new hash
            try {
              file.hash = await calculateFileHash(file.path);
      // Analyze threat
      const fileThreats = analyzeThreat(file);
      const dbThreat = getThreatsForDatabase(file, fileThreats.threats, fileThreats.informational);
              
              if (dbThreat) {
                threats.push(dbThreat);
                this.progressTracker.addThreat(file.name);
              }
              
              // Save to cache
              await saveHashCache(
                file.path,
                file.hash,
                modifiedTime,
                dbThreat ? dbThreat.risk_level : 'safe'
              );
            } catch (e) {
              this.progressTracker.addActivity(`Error hashing ${file.name}: ${e.message}`);
            }
          }
        } else {
          // For safe files, just analyze without hashing
          const fileThreats = analyzeThreat(file);
          const dbThreat = getThreatsForDatabase(file, fileThreats.threats, fileThreats.informational);
          if (dbThreat) {
            threats.push(dbThreat);
            this.progressTracker.addThreat(file.name);
          }
        }

        // Update progress percentage (30-80% range)
        const analysisProgress = Math.round(((i + 1) / scanResult.files.length) * 50);
        this.scanStatus.progress = 30 + analysisProgress;
        
        // Call progress callback if provided
        if (onProgress && i % 50 === 0) {
          onProgress(this.progressTracker.getProgress());
        }
      }

      // Phase 3: Generate report (80-100%)
      this.progressTracker.currentAction = 'Generating report...';
      this.scanStatus.progress = 80;

      // Filter out informational/safe items before scoring and saving
      // Actual threats = critical/high/medium/low ONLY
      // Suspicious = tracked separately, NOT saved to threats table
      const actualThreats = threats.filter(t => ['critical', 'high', 'medium', 'low'].includes(t.risk_level));
      const suspiciousItems = threats.filter(t => t.risk_level === 'suspicious');
      const informationalItems = threats.filter(t => ['informational', 'safe'].includes(t.risk_level));

      const securityScore = calculateSecurityScore(scanResult.files, actualThreats);
      const scanDuration = Date.now() - startTime;

      const scanId = await saveScan({
        files_scanned: scanResult.files.length,
        folders_scanned: scanResult.folders,
        hidden_files: scanResult.files.filter(f => f.isHidden).length,
        dangerous_files: actualThreats.length, // Actual threats, not extension-based count
        duplicate_files: scanResult.files.filter(f => f.isDuplicate).length,
        modified_files: 0,
        security_score: securityScore,
        scan_duration_ms: scanDuration,
        scan_path: targetPath
      });

      // Only save actual threats to threats table
      await saveThreats(scanId, actualThreats);

      const report = generateReport({
        files: scanResult.files,
        threats: actualThreats,
        suspicious: suspiciousItems,
        informational: informationalItems,
        scanDuration: scanDuration,
        scanPath: targetPath,
        folders: scanResult.folders
      });

      this.scanStatus.progress = 100;
      this.progressTracker.complete();

      this.latestReport = report;
      this.scanStatus = {
        status: 'completed',
        progress: 100,
        scanId: scanId,
        report: report,
        path: targetPath,
        scanMode: scanMode
      };

      console.log(`[${new Date().toISOString()}] Scan complete: ${scanResult.files.length} files, ${threats.length} threats, score ${securityScore}`);
      
      return report;

    } catch (error) {
      this.progressTracker.error(error.message);
      this.scanStatus = { status: 'error', error: error.message };
      throw error;
    }
  }

  // Quick scan specific locations
  async quickScan() {
    const quickPaths = [
      '/home/paperclip/Desktop',
      '/home/paperclip/Downloads',
      '/home/paperclip/.config/autostart'
    ].filter(p => {
      const fs = require('fs');
      return fs.existsSync(p);
    });

    const allResults = {
      files: [],
      folders: 0,
      threats: []
    };

    for (const quickPath of quickPaths) {
      try {
        const result = await this.startScan(quickPath, { 
          scanMode: 'quick',
          maxDepth: 3 
        });
        if (result) {
          allResults.files.push(...(result.summary?.total_files || 0));
          allResults.threats.push(...(result.threats || []));
        }
      } catch (e) {
        console.error(`Quick scan failed for ${quickPath}:`, e.message);
      }
    }

    return allResults;
  }
}

module.exports = { ScanManager };