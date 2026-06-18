const { classifyRiskLevel } = require('./threatAnalyzer');

function calculateSecurityScore(files, threats) {
  if (files.length === 0) return 100;
  
  const totalFiles = files.length;
  const threatCount = threats.length;
  
  let score = 100;
  
  // Deduct for threats
  score -= (threatCount / totalFiles) * 40;
  
  // Deduct for hidden files
  const hiddenCount = files.filter(f => f.isHidden).length;
  score -= (hiddenCount / totalFiles) * 15;
  
  // Deduct for dangerous extensions
  const dangerousCount = files.filter(f => f.isDangerous).length;
  score -= (dangerousCount / totalFiles) * 25;
  
  // Deduct for duplicates
  const duplicateCount = files.filter(f => f.isDuplicate).length;
  score -= (duplicateCount / totalFiles) * 10;
  
  // Deduct for large files
  const largeCount = files.filter(f => f.size > 100 * 1024 * 1024).length;
  score -= (largeCount / totalFiles) * 5;
  
  return Math.max(0, Math.round(score));
}

function getRiskDistribution(threats) {
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
  
  return distribution;
}

function getRecommendations(score, threats, files) {
  const recommendations = [];
  
  if (score < 50) {
    recommendations.push('Critical: Immediate action required. Review all high-risk files.');
  } else if (score < 70) {
    recommendations.push('High risk detected. Review suspicious files and remove unnecessary executables.');
  } else if (score < 85) {
    recommendations.push('Medium risk. Clean up hidden files and review file extensions.');
  } else {
    recommendations.push('System is relatively secure. Continue regular scans.');
  }
  // Dangerous extensions - only mention if they are actual threats
  // We no longer count dangerous extensions as threats, only real malware
  // This prevents false positives from normal .exe, .dll files
  
  // Hidden files - not a threat, just informational
  // const hiddenFiles = files.filter(f => f.isHidden);
  // if (hiddenFiles.length > 0) {
  //   recommendations.push(`Found ${hiddenFiles.length} hidden file(s). Review if they are necessary.`);
  // }
  
  // Large files - not a threat, just informational
  // const largeFiles = files.filter(f => f.size > 100 * 1024 * 1024);
  // if (largeFiles.length > 0) {
  //   recommendations.push(`Found ${largeFiles.length} large file(s) over 100MB. Review if needed.`);
  // }
  
  // Only show recommendations for actual threats or security issues
  if (threats.length === 0) {
    recommendations.push('No threats detected. Your system is secure.');
  }
  
  const largeFiles = files.filter(f => f.size > 100 * 1024 * 1024);
  if (largeFiles.length > 0) {
    recommendations.push(`Found ${largeFiles.length} large file(s) over 100MB. Review if needed.`);
  }
  
  return recommendations;
}

module.exports = {
  calculateSecurityScore,
  getRiskDistribution,
  getRecommendations
};
