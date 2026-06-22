const { calculateSecurityScore, getScoreLabel, getScoreColor, getRiskDistribution, getRecommendations } = require('../security/riskEngine');
const { classifyRiskLevel } = require('../security/threatAnalyzer');

function generateReport(scanData) {
  const { files, threats, suspicious, informational, scanDuration, scanPath } = scanData;
  
  const securityScore = calculateSecurityScore(files, threats);
  const scoreLabel = getScoreLabel(securityScore);
  const scoreColor = getScoreColor(securityScore);
  const riskDistribution = getRiskDistribution(threats, files.length);
  const recommendations = getRecommendations(securityScore, threats, files);
  
  const dangerousFiles = files.filter(f => f.isDangerous);
  const hiddenFiles = files.filter(f => f.isHidden);
  const duplicateFiles = files.filter(f => f.isDuplicate);
  const largeFiles = files.filter(f => f.size > 100 * 1024 * 1024);
  
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  
  // Single source of truth calculations
  const actualThreats = threats.length;
  const suspiciousCount = suspicious ? suspicious.length : 0;
  const informationalCount = informational ? informational.length : 0;
  const safeFiles = Math.max(0, files.length - actualThreats - suspiciousCount - informationalCount);
  
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
      score_label: scoreLabel,
      score_color: scoreColor,
      threats_found: actualThreats,
      suspicious_count: suspiciousCount,
      informational_count: informationalCount,
      safe_files: safeFiles
    },
    metrics: {
      files_scanned: files.length,
      folders_scanned: scanData.folders || 0,
      hidden_files: hiddenFiles.length,
      dangerous_files: dangerousFiles.length,
      duplicate_files: duplicateFiles.length,
      large_files: largeFiles.length,
      modified_files: 0,
      safe_files: safeFiles,
      threats_found: actualThreats,
      suspicious_count: suspiciousCount,
      informational_count: informationalCount
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
    suspicious_files: suspicious ? suspicious.map(s => ({
      file_name: s.file_name,
      file_path: s.file_path,
      file_hash: s.file_hash,
      file_size: s.file_size,
      file_size_formatted: formatBytes(s.file_size),
      threat_type: s.threat_type,
      risk_level: s.risk_level
    })) : [],
    informational_files: informational ? informational.map(i => ({
      file_name: i.file_name,
      file_path: i.file_path,
      file_hash: i.file_hash,
      file_size: i.file_size,
      file_size_formatted: formatBytes(i.file_size),
      threat_type: i.threat_type,
      risk_level: i.risk_level
    })) : [],
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
