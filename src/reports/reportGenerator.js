const { calculateSecurityScore, getRiskDistribution, getRecommendations } = require('../security/riskEngine');
const { classifyRiskLevel } = require('../security/threatAnalyzer');

function generateReport(scanData) {
  const { files, threats, scanDuration, scanPath } = scanData;
  
  const securityScore = calculateSecurityScore(files, threats);
  const riskDistribution = getRiskDistribution(threats);
  const recommendations = getRecommendations(securityScore, threats, files);
  
  const dangerousFiles = files.filter(f => f.isDangerous);
  const hiddenFiles = files.filter(f => f.isHidden);
  const duplicateFiles = files.filter(f => f.isDuplicate);
  const largeFiles = files.filter(f => f.size > 100 * 1024 * 1024);
  
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  
  return {
    summary: {
      scan_path: scanPath,
      scan_date: new Date().toISOString(),
      scan_duration_ms: scanDuration,
      total_files: files.length,
      total_folders: scanData.folders || 0,
      total_size_bytes: totalSize,
      total_size_formatted: formatBytes(totalSize),
      security_score: securityScore,
      threats_found: threats.length
    },
    metrics: {
      files_scanned: files.length,
      folders_scanned: scanData.folders || 0,
      hidden_files: hiddenFiles.length,
      dangerous_files: dangerousFiles.length,
      duplicate_files: duplicateFiles.length,
      large_files: largeFiles.length,
      modified_files: 0
    },
    risk_distribution: riskDistribution,
    threats: threats.map(t => ({
      file_name: t.file_name,
      file_path: t.file_path,
      file_hash: t.file_hash,
      file_size: t.file_size,
      file_size_formatted: formatBytes(t.file_size),
      threat_type: t.threat_type,
      risk_level: t.risk_level
    })),
    suspicious_files: files
      .filter(f => f.isDangerous || f.isHidden || f.isDuplicate)
      .map(f => ({
        name: f.name,
        path: f.path,
        extension: f.extension,
        size: formatBytes(f.size),
        is_hidden: f.isHidden,
        is_dangerous: f.isDangerous,
        is_duplicate: f.isDuplicate,
        hash: f.hash
      })),
    recommendations: recommendations,
    status: 'completed'
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  generateReport,
  formatBytes
};
