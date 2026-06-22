const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { isHiddenFile } = require('../scanner/fileScanner');

const THREAT_TYPES = {
  MALWARE: 'malware',
  CRYPTOMINER: 'cryptominer',
  RANSOMWARE: 'ransomware',
  KEYLOGGER: 'keylogger',
  BACKDOOR: 'backdoor',
  ROOTKIT: 'rootkit',
  TROJAN: 'trojan',
  WORM: 'worm',
  SPYWARE: 'spyware',
  ADWARE: 'adware',
  SUSPICIOUS_PERMISSIONS: 'suspicious_permissions'
};

// REAL malware detection patterns — only flag actual malicious files
const REAL_MALWARE_PATTERNS = [
  {
    name: 'XMRig_Miner',
    pattern: /xmrig.*--donate-level|--cpu-priority|--max-cpu-usage|stratum\+tcp:\/\/.*:3333/i,
    type: THREAT_TYPES.CRYPTOMINER,
    severity: 'critical',
    description: 'Active cryptocurrency miner detected — will use your CPU/GPU to mine crypto for attackers'
  },
  {
    name: 'Ransomware_Encryptor',
    pattern: /encrypt.*aes.*rsa|your.*files.*have.*been.*encrypted|bitcoin.*address.*send|decrypt.*instructions/i,
    type: THREAT_TYPES.RANSOMWARE,
    severity: 'critical',
    description: 'Ransomware detected — will encrypt all your files and demand payment'
  },
  {
    name: 'Keylogger_Active',
    pattern: /SetWindowsHookEx.*WH_KEYBOARD_LL|GetAsyncKeyState.*loop|keylog.*send.*email|keystroke.*capture.*logfile/i,
    type: THREAT_TYPES.KEYLOGGER,
    severity: 'critical',
    description: 'Keylogger detected — will record every password and credit card you type'
  },
  {
    name: 'Reverse_Shell_Active',
    pattern: /socket\.connect\(.*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}.*\d{4,5}|subprocess\.call\(\['nc', '-e', '\/bin\/sh'|os\.system\('bash -i >& \/dev\/tcp/i,
    type: THREAT_TYPES.BACKDOOR,
    severity: 'critical',
    description: 'Backdoor detected — gives attackers remote control of your computer'
  },
  {
    name: 'Trojan_Downloader',
    pattern: /urllib\.request\.urlopen\(.*\.exe|wget.*-O.*\/tmp\/.*\.sh.*&&.*chmod.*\+x|curl.*-o.*\/tmp\/.*\.bin/i,
    type: THREAT_TYPES.TROJAN,
    severity: 'critical',
    description: 'Trojan downloader detected — will install more malware on your system'
  },
  {
    name: 'Network_Worm',
    pattern: /scan.*port.*22.*23.*445|smb.*brute.*force|ssh.*connect.*range.*192\.168|spread.*network.*infect/i,
    type: THREAT_TYPES.WORM,
    severity: 'critical',
    description: 'Network worm detected — will infect other computers on your network'
  },
  {
    name: 'Spyware_Stealer',
    pattern: /steal.*cookie.*chrome|grab.*password.*firefox|copy.*wallet.*dat|upload.*file.*ftp.*password/i,
    type: THREAT_TYPES.SPYWARE,
    severity: 'critical',
    description: 'Spyware detected — will steal your passwords, cookies, and cryptocurrency wallets'
  },
  {
    name: 'Rootkit_Hider',
    pattern: /hide.*process.*taskmgr|unhook.*ntdll|direct.*kernel.*object|ssdt.*hook.*hide/i,
    type: THREAT_TYPES.ROOTKIT,
    severity: 'critical',
    description: 'Rootkit detected — will hide itself and other malware from security software'
  }
];

// Suspicious patterns — not malicious on their own but worth noting
const SUSPICIOUS_PATTERNS = [
  {
    name: 'Encoded_Command',
    pattern: /base64_decode|gzinflate|str_rot13|eval\s*\(|exec\s*\(/i,
    type: 'encoded_command',
    severity: 'suspicious',
    description: 'Contains encoded or obfuscated commands — may hide malicious intent'
  },
  {
    name: 'Network_Connection',
    pattern: /socket\.connect|urllib\.request|wget\s|curl\s|fetch\s*\(/i,
    type: 'network_activity',
    severity: 'suspicious',
    description: 'Makes network connections — review destination addresses'
  },
  {
    name: 'System_Modification',
    pattern: /os\.system|subprocess\.call|child_process|CreateObject\s*\(/i,
    type: 'system_modification',
    severity: 'suspicious',
    description: 'Modifies or executes system commands — verify legitimacy'
  }
];

// Files that are NEVER threats — project source files
const PROJECT_FILES = [
  'threatAnalyzer.js', 'scan.js', 'fileScanner.js', 'hashGenerator.js',
  'riskEngine.js', 'reportGenerator.js', 'solutions.js', 'db.js',
  'server.js', 'dashboard.js', 'reports.js', 'app.js', 'style.css',
  'index.html', 'package.json', 'package-lock.json', '.gitignore',
  '.dockerignore', '.env.example', 'README.md', 'AGENTS.md',
  'block-dangerous-commands.sh'
];

function isProjectFile(filePath) {
  const basename = require('path').basename(filePath);
  if (PROJECT_FILES.includes(basename)) return true;
  const projectDirs = ['AI-Laptop-Security-Scanner'];
  for (const projDir of projectDirs) {
    const regex = new RegExp(`[\\/]${projDir}[\\/]`);
    if (regex.test(filePath)) return true;
  }
  return false;
}

function analyzeThreat(fileInfo) {
  const threats = [];
  const informational = [];

  // Skip specific project source files
  if (isProjectFile(fileInfo.path)) {
    return { threats: [], informational: [] };
  }

  // Hidden files → informational (not a threat by itself)
  if (fileInfo.isHidden) {
    informational.push({
      type: 'hidden_file',
      description: 'Hidden file — not visible in normal directory listings',
      severity: 'informational'
    });
  }

  // Script/executable extensions → informational (not auto-threat)
  const scriptExts = ['.js', '.py', '.sh', '.php', '.pl', '.rb', '.go', '.ts', '.jsx', '.tsx', '.vue'];
  const execExts = ['.exe', '.scr', '.msi', '.dll', '.bin', '.elf'];
  const highRiskExts = ['.bat', '.cmd', '.vbs', '.ps1', '.wsf', '.hta'];

  const ext = fileInfo.extension.toLowerCase();

  if (scriptExts.includes(ext)) {
    informational.push({
      type: 'script_file',
      description: `Script file (${ext}) — can execute code, review if from trusted source`,
      severity: 'informational'
    });
  } else if (execExts.includes(ext)) {
    // Executables are higher risk but still informational unless malware patterns match
    informational.push({
      type: 'executable_file',
      description: `Executable file (${ext}) — can run arbitrary code, verify source`,
      severity: 'informational'
    });
  } else if (highRiskExts.includes(ext)) {
    informational.push({
      type: 'high_risk_executable',
      description: `High-risk executable (${ext}) — can execute system commands directly`,
      severity: 'informational'
    });
  }

  // Only check content for real malware patterns on script/executable files
  const dangerousExts = ['.exe', '.scr', '.msi', '.dll', '.bat', '.cmd', '.vbs', '.ps1', '.js', '.sh', '.py', '.php', '.pl'];
  if (dangerousExts.includes(ext)) {
    const content = readFileContent(fileInfo.path, 100000);
    if (content) {
      // Check for REAL malware patterns → actual threats
      for (const pattern of REAL_MALWARE_PATTERNS) {
        if (pattern.pattern.test(content)) {
          threats.push({
            type: pattern.type,
            description: pattern.description,
            severity: pattern.severity,
            pattern: pattern.name
          });
        }
      }

      // Check for suspicious patterns → upgrade informational to suspicious
      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.pattern.test(content)) {
          // Replace informational script_file with suspicious version
          const scriptIdx = informational.findIndex(i => i.type === 'script_file');
          if (scriptIdx !== -1) {
            informational[scriptIdx] = {
              type: pattern.type,
              description: pattern.description,
              severity: 'suspicious'
            };
          }
        }
      }
    }
  }

  return { threats, informational };
}

// Store threat and notify dashboard
async function storeAndNotifyThreat(filePath, result) {
  try {
    const db = require('../database/db');
    const threat = result.threats[0];

    if (!threat) return;

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

    const { emitThreatAlert } = require('../server');
    if (emitThreatAlert) {
      emitThreatAlert({
        file: result.fileInfo.name,
        path: filePath,
        type: threat.type,
        severity: threat.severity,
        description: threat.description,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[${new Date().toISOString()}] THREAT ALERT: ${threat.type} in ${filePath}`);
  } catch (e) {
    console.error('Failed to store/notify threat:', e);
  }
}

function readFileContent(filePath, maxBytes = 10000) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(maxBytes);
    const bytesRead = fs.readSync(fd, buffer, 0, maxBytes, 0);
    fs.closeSync(fd);
    return buffer.toString('utf8', 0, bytesRead);
  } catch (e) {
    return null;
  }
}

function getExtensionSeverity(ext) {
  const critical = ['.exe', '.scr', '.msi', '.dll', '.bin', '.elf'];
  const high = ['.bat', '.cmd', '.vbs', '.ps1', '.wsf', '.hta'];
  const medium = ['.js', '.sh', '.php', '.pl', '.py', '.rb', '.go'];

  if (critical.includes(ext.toLowerCase())) return 'critical';
  if (high.includes(ext.toLowerCase())) return 'high';
  if (medium.includes(ext.toLowerCase())) return 'medium';
  return 'low';
}

function classifyRiskLevel(threats, informational = []) {
  if (threats.length === 0) {
    // No real threats — check if anything is suspicious
    const hasSuspicious = informational.some(i => i.severity === 'suspicious');
    return hasSuspicious ? 'suspicious' : 'safe';
  }

  const severities = threats.map(t => t.severity);

  if (severities.includes('critical')) return 'critical';
  if (severities.includes('high')) return 'high';
  if (severities.includes('medium')) return 'medium';
  return 'low';
}

function getThreatsForDatabase(fileInfo, threats, informational = []) {
  const allItems = [...threats, ...informational];
  if (allItems.length === 0) return null;

  // Primary item: real threat first, then suspicious, then informational
  const primary = threats[0] || informational[0];
  return {
    file_name: fileInfo.name,
    file_path: fileInfo.path,
    file_hash: fileInfo.hash || 'unknown',
    file_size: fileInfo.size,
    threat_type: primary.type,
    risk_level: classifyRiskLevel(threats, informational)
  };
}

module.exports = {
  analyzeThreat,
  classifyRiskLevel,
  getThreatsForDatabase,
  storeAndNotifyThreat,
  THREAT_TYPES
};
