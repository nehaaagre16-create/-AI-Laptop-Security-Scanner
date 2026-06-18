const { THREAT_TYPES } = require('./threatAnalyzer');

function getSolution(threatType, fileInfo) {
  const solutions = {
    [THREAT_TYPES.DANGEROUS_EXTENSION]: {
      action: 'review',
      title: 'Review executable file',
      description: `This ${fileInfo.extension} file could be a script or program. Verify it is from a trusted source.`,
      steps: [
        'Check if you recognize this file',
        'Verify the source - did you download it?',
        'If unknown, consider deleting or quarantining',
        'Scan with antivirus if unsure'
      ],
      severity: fileInfo.extension === '.exe' || fileInfo.extension === '.scr' ? 'high' : 'medium'
    },
    [THREAT_TYPES.HIDDEN_FILE]: {
      action: 'review',
      title: 'Review hidden file',
      description: 'Hidden files start with a dot. Some are normal system files, others could be suspicious.',
      steps: [
        'Check if this is a known system config file (.bashrc, .gitignore are normal)',
        'If it is .env or contains credentials, ensure permissions are restricted',
        'Unknown hidden files in unusual locations should be investigated',
        'Use ls -la to see all hidden files in the folder'
      ],
      severity: 'low'
    },
    [THREAT_TYPES.LARGE_FILE]: {
      action: 'review',
      title: 'Review large file',
      description: `This file is ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB. Large files can be logs, databases, or media.`,
      steps: [
        'Identify what this file contains',
        'If it is a log file, consider rotating or clearing old logs',
        'If it is media, consider moving to external storage',
        'If unknown, open it safely to inspect contents'
      ],
      severity: 'low'
    },
    [THREAT_TYPES.DUPLICATE]: {
      action: 'cleanup',
      title: 'Remove duplicate file',
      description: 'This file has the same content as another file elsewhere. It is wasting disk space.',
      steps: [
        'Compare the duplicate files to confirm they are identical',
        'Keep the one in the correct location',
        'Delete the duplicate copy',
        'Use a duplicate finder tool for bulk cleanup'
      ],
      severity: 'low'
    },
    [THREAT_TYPES.SUSPICIOUS_NAME]: {
      action: 'investigate',
      title: 'Investigate suspicious filename',
      description: 'This filename contains keywords often used by malware or credential files.',
      steps: [
        'Check if this file contains actual passwords or secrets',
        'If it contains credentials, move to a secure password manager',
        'If it is a config file, ensure it is not committed to git',
        'Delete if it is an old backup or temp file'
      ],
      severity: 'medium'
    },
    [THREAT_TYPES.SYSTEM_FILE]: {
      action: 'review',
      title: 'Review system-related file',
      description: 'This file references system components. Verify it is legitimate.',
      steps: [
        'Check if this is part of an installed application',
        'Verify the file path is expected',
        'If in a temp or download folder, it may be leftover from an installer',
        'Research the filename if unknown'
      ],
      severity: 'low'
    }
  };

  return solutions[threatType] || {
    action: 'review',
    title: 'Review file',
    description: 'This file triggered a security alert. Review it manually.',
    steps: [
      'Check the file location - is it expected?',
      'Check the file contents if safe to open',
      'Verify with antivirus if unsure',
      'Delete if not recognized or needed'
    ],
    severity: 'medium'
  };
}

function generateSolutionsReport(threats, files) {
  const solutions = threats.map(threat => {
    const fileInfo = files.find(f => f.path === threat.file_path) || {
      name: threat.file_name,
      path: threat.file_path,
      size: threat.file_size,
      extension: threat.file_name.split('.').pop() || ''
    };
    
    const solution = getSolution(threat.threat_type, fileInfo);
    
    return {
      threat_id: threat.id || null,
      file_name: threat.file_name,
      file_path: threat.file_path,
      threat_type: threat.threat_type,
      risk_level: threat.risk_level,
      solution: solution
    };
  });

  const grouped = {
    cleanup: solutions.filter(s => s.solution.action === 'cleanup'),
    review: solutions.filter(s => s.solution.action === 'review'),
    investigate: solutions.filter(s => s.solution.action === 'investigate')
  };

  return {
    total_threats: threats.length,
    actionable_count: solutions.length,
    grouped: grouped,
    all: solutions
  };
}

module.exports = {
  getSolution,
  generateSolutionsReport
};
