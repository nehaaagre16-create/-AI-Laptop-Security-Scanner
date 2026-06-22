const { classifyRiskLevel } = require('./threatAnalyzer');

function calculateSecurityScore(files, threats) {
  if (files.length === 0) return 100;

  let score = 100;

  // Count actual threats by severity (suspicious/informational = 0 penalty)
  const criticalCount = threats.filter(t => t.risk_level === 'critical').length;
  const highCount = threats.filter(t => t.risk_level === 'high').length;
  const mediumCount = threats.filter(t => t.risk_level === 'medium').length;
  const lowCount = threats.filter(t => t.risk_level === 'low').length;

  // Apply severity-based penalties
  score -= criticalCount * 30;  // -30 per critical
  score -= highCount * 15;      // -15 per high
  score -= mediumCount * 5;     // -5 per medium
  score -= lowCount * 1;        // -1 per low
  // suspicious = 0 penalty (tracked separately)
  // informational = 0 penalty

  // Cap between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return Math.round(score);
}

function getScoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Warning';
  return 'Dangerous';
}

function getScoreColor(score) {
  if (score >= 90) return '#22c55e';  // Green
  if (score >= 70) return '#3b82f6';  // Blue
  if (score >= 40) return '#f59e0b';  // Orange
  return '#ef4444';                   // Red
}

function getRiskDistribution(threats, totalFiles) {
  const distribution = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    safe: 0
  };
  
  threats.forEach(threat => {
    const level = threat.risk_level || classifyRiskLevel(threat.threats || []);
    if (distribution[level] !== undefined) {
      distribution[level]++;
    }
  });
  
  // Safe files = total files - files with threats
  const threatenedFiles = new Set(threats.map(t => t.file_path)).size;
  distribution.safe = totalFiles - threatenedFiles;
  
  return distribution;
}

function getRecommendations(score, threats, files) {
  const recommendations = [];
  
  const critical = threats.filter(t => t.risk_level === 'critical');
  const high = threats.filter(t => t.risk_level === 'high');
  const medium = threats.filter(t => t.risk_level === 'medium');
  const low = threats.filter(t => t.risk_level === 'low');
  
  // Critical threats first
  if (critical.length > 0) {
    recommendations.push(`CRITICAL: ${critical.length} malware-like files found. Immediate action required.`);
  }
  
  // High threats
  if (high.length > 0) {
    recommendations.push(`WARNING: ${high.length} suspicious executables detected. Review before running.`);
  }
  
  // Medium threats
  if (medium.length > 0) {
    recommendations.push(`Review ${medium.length} unknown scripts. Verify they are from trusted sources.`);
  }
  
  // Low threats
  if (low.length > 0) {
    recommendations.push(`${low.length} hidden files found. Review if they are necessary.`);
  }
  
  // Score-based
  if (score < 40) {
    recommendations.push('Security score is critical. Run full scan and review all threats immediately.');
  } else if (score < 70) {
    recommendations.push('Security score is low. Remove unnecessary executables and review scripts.');
  } else if (score >= 90) {
    recommendations.push('System is secure. Continue regular scans.');
  }
  
  // Large files
  const largeFiles = files.filter(f => f.size > 100 * 1024 * 1024);
  if (largeFiles.length > 0) {
    recommendations.push(`Found ${largeFiles.length} large file(s) over 100MB. Review if needed.`);
  }
  
  return recommendations;
}

module.exports = {
  calculateSecurityScore,
  getScoreLabel,
  getScoreColor,
  getRiskDistribution,
  getRecommendations
};