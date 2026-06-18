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

// REAL malware detection patterns - only flag actual malicious files
// These patterns indicate files that can ACTUALLY harm your system
const REAL_MALWARE_PATTERNS = [
  // Actual cryptominer code that would run on your system
  { 
    name: 'XMRig_Miner', 
    pattern: /xmrig.*--donate-level|--cpu-priority|--max-cpu-usage|stratum\+tcp:\/\/.*:3333/i, 
    type: THREAT_TYPES.CRYPTOMINER,
    severity: 'critical',
    description: 'Active cryptocurrency miner detected - will use your CPU/GPU to mine crypto for attackers'
  },
  // Actual ransomware that would encrypt your files
  { 
    name: 'Ransomware_Encryptor', 
    pattern: /encrypt.*aes.*rsa|your.*files.*have.*been.*encrypted|bitcoin.*address.*send|decrypt.*instructions/i, 
    type: THREAT_TYPES.RANSOMWARE,
    severity: 'critical',
    description: 'Ransomware detected - will encrypt all your files and demand payment'
  },
  // Actual keylogger that would steal your passwords
  { 
    name: 'Keylogger_Active', 
    pattern: /SetWindowsHookEx.*WH_KEYBOARD_LL|GetAsyncKeyState.*loop|keylog.*send.*email|keystroke.*capture.*logfile/i, 
    type: THREAT_TYPES.KEYLOGGER,
    severity: 'critical',
    description: 'Keylogger detected - will record every password and credit card you type'
  },
  // Actual backdoor that would give remote access
  { 
    name: 'Reverse_Shell_Active', 
    pattern: /socket\.connect\(.*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}.*\d{4,5}|subprocess\.call\(\['nc', '-e', '\/bin\/sh'|os\.system\('bash -i >& \/dev\/tcp/i, 
    type: THREAT_TYPES.BACKDOOR,
    severity: 'critical',
    description: 'Backdoor detected - gives attackers remote control of your computer'
  },
  // Actual trojan that would download more malware
  { 
    name: 'Trojan_Downloader', 
    pattern: /urllib\.request\.urlopen\(.*\.exe|wget.*-O.*\/tmp\/.*\.sh.*&&.*chmod.*\+x|curl.*-o.*\/tmp\/.*\.bin/i, 
    type: THREAT_TYPES.TROJAN,
    severity: 'critical',
    description: 'Trojan downloader detected - will install more malware on your system'
  },
  // Actual worm that would spread
  { 
    name: 'Network_Worm', 
    pattern: /scan.*port.*22.*23.*445|smb.*brute.*force|ssh.*connect.*range.*192\.168|spread.*network.*infect/i, 
    type: THREAT_TYPES.WORM,
    severity: 'critical',
    description: 'Network worm detected - will infect other computers on your network'
  },
  // Actual spyware that would steal data
  { 
    name: 'Spyware_Stealer', 
    pattern: /steal.*cookie.*chrome|grab.*password.*firefox|copy.*wallet.*dat|upload.*file.*ftp.*password/i, 
    type: THREAT_TYPES.SPYWARE,
    severity: 'critical',
    description: 'Spyware detected - will steal your passwords, cookies, and cryptocurrency wallets'
  },
  // Actual rootkit that would hide from antivirus
  { 
    name: 'Rootkit_Hider', 
    pattern: /hide.*process.*taskmgr|unhook.*ntdll|direct.*kernel.*object|ssdt.*hook.*hide/i, 
    type: THREAT_TYPES.ROOTKIT,
    severity: 'critical',
    description: 'Rootkit detected - will hide itself and other malware from security software'
  }
];

// Files that are NEVER threats - part of your security scanner project
const PROJECT_FILES = [
  'AI-Laptop-Security-Scanner',
  'threatAnalyzer.js',
  'scan.js',
  'fileScanner.js',
  'hashGenerator.js',
  'riskEngine.js',
  'reportGenerator.js',
  'solutions.js',
  'db.js',
  'server.js',
  'dashboard.js',
  'reports.js',
  'app.js',
  'style.css',
  'index.html',
  'package.json',
  'package-lock.json',
  '.gitignore',
  '.dockerignore',
  '.env.example',
  'README.md',
  'AGENTS.md',
  'block-dangerous-commands.sh',
  'Levi',
  'paperclip',
  '.hermes',
  '.bashrc',
  '.bash_profile',
  '.bash_logout',
  '.profile',
  '.zshrc',
  '.vimrc',
  '.gitconfig'
];

function isProjectFile(filePath) {
  for (const projFile of PROJECT_FILES) {
    if (filePath.includes(projFile)) {
      return true;
    }
  }
  return false;
}

function analyzeThreat(fileInfo) {
  const threats = [];

  // Skip ALL project files - these are your own code, not malware
  if (isProjectFile(fileInfo.path)) {
    return [];
  }

  // Only check files that are NOT part of your project
  // and are actual executable scripts that could run
  const dangerousExts = ['.exe', '.scr', '.msi', '.dll', '.bat', '.cmd', '.vbs', '.ps1', '.js', '.sh', '.py', '.php', '.pl'];
  if (!dangerousExts.includes(fileInfo.extension.toLowerCase())) {
    return [];
  }

  // Read file content
  const content = readFileContent(fileInfo.path, 100000); // Read first 100KB
  if (!content) {
    return [];
  }

  // Check for REAL malware patterns - only flag if it matches actual malicious code
  for (const pattern of REAL_MALWARE_PATTERNS) {
    if (pattern.pattern.test(content)) {
      threats.push({
        type: pattern.type,
        description: pattern.description,
        severity: pattern.severity
      });
    }
  }

  return threats;
}

// Store threat and notify dashboard
async function storeAndNotifyThreat(filePath, result) {
  try {
    const db = require('../database/db');
    const threat = result.threats[0];
    
    // Store in database
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
    
    // Send real-time notification to dashboard via WebSocket/SSE
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

function isExecutableFile(ext) {
  const execExts = ['.exe', '.dll', '.bat', '.cmd', '.vbs', '.ps1', '.js', '.sh', '.php', '.pl', '.py', '.rb', '.go', '.jar', '.war', '.ear', '.elf', '.bin'];
  return execExts.includes(ext.toLowerCase()) || ext === '';
}

function isScriptFile(ext) {
  const scriptExts = ['.js', '.py', '.sh', '.bash', '.php', '.pl', '.rb', '.ps1', '.vbs', '.bat', '.cmd'];
  return scriptExts.includes(ext.toLowerCase());
}

function isConfigOrScriptFile(ext) {
  const configExts = ['.env', '.conf', '.config', '.ini', '.yaml', '.yml', '.json', '.xml', '.properties', '.sh', '.bash', '.py', '.js', '.php', '.pl', '.rb', '.ps1', '.vbs', '.bat', '.cmd'];
  return configExts.includes(ext.toLowerCase());
}

function isDocumentationFile(filePath) {
  const docExts = ['.md', '.txt', '.rst', '.doc', '.docx', '.pdf', '.html', '.htm'];
  const ext = require('path').extname(filePath).toLowerCase();
  return docExts.includes(ext);
}

function isTextFile(ext) {
  const textExts = ['.txt', '.js', '.py', '.sh', '.bash', '.php', '.pl', '.rb', '.ps1', '.vbs', '.bat', '.cmd', '.log', '.conf', '.config', '.ini', '.xml', '.json', '.yaml', '.yml', '.html', '.htm', '.css', '.sql', '.c', '.cpp', '.h', '.java', '.go', '.rs', '.ts', '.jsx', '.tsx', '.vue', '.md', '.rst', '.dockerfile', '.env', '.gitignore', '.gitconfig', '.bashrc', '.bash_profile', '.profile', '.zshrc', '.vimrc', '.ssh_config', '.pem', '.key', '.crt', '.csr', '.pub'];
  return textExts.includes(ext.toLowerCase()) || ext === '';
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

function calculateEntropy(str) {
  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  const len = str.length;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function isSuspiciousDecodedContent(str) {
  const suspicious = [
    /eval\s*\(/i,
    /exec\s*\(/i,
    /system\s*\(/i,
    /shell_exec/i,
    /passthru/i,
    /base64_decode/i,
    /gzinflate/i,
    /str_rot13/i,
    /\<\?php/i,
    /\<\?=/i,
    /script\s+language\s*=\s*["']vbscript/i,
    /powershell/i,
    /cmd\.exe/i,
    /bash\s+-i/i,
    /nc\s+-[el]/i,
    /python.*socket/i,
    /import\s+os\s*,\s*sys/i,
    /subprocess\.call/i,
    /os\.system/i,
    /CreateObject\s*\(/i,
    /WScript\.Shell/i,
    /ActiveXObject/i,
    /downloadString/i,
    /Invoke-Expression/i,
    /IEX\s*\(/i,
    /bitsadmin/i,
    /certutil\s+-decode/i,
    /regsvr32/i,
    /mshta/i,
    /rundll32/i
  ];
  return suspicious.some(p => p.test(str));
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

function getPatternDescription(pattern) {
  const source = pattern.source || pattern.toString();
  if (source.includes('password')) return 'Hardcoded password';
  if (source.includes('api') || source.includes('key')) return 'API key/credential';
  if (source.includes('secret')) return 'Secret token';
  if (source.includes('token')) return 'Access token';
  if (source.includes('AWS')) return 'AWS credential';
  if (source.includes('private')) return 'Private key';
  if (source.includes('BEGIN')) return 'Cryptographic key/certificate';
  if (source.includes('ssh-rsa')) return 'SSH public key';
  if (source.includes('github')) return 'GitHub token';
  if (source.includes('gitlab')) return 'GitLab token';
  if (source.includes('sk-')) return 'OpenAI/Stripe key';
  if (source.includes('bitcoin') || source.includes('ethereum') || source.includes('wallet')) return 'Cryptocurrency wallet';
  return 'Sensitive data';
}

function classifyRiskLevel(threats) {
  if (threats.length === 0) return 'safe';
  
  const severities = threats.map(t => t.severity);
  
  if (severities.includes('critical')) return 'critical';
  if (severities.includes('high')) return 'high';
  if (severities.includes('medium')) return 'medium';
  return 'low';
}

function getThreatsForDatabase(fileInfo, threats) {
  if (threats.length === 0) return null;
  
  const primaryThreat = threats[0];
  return {
    file_name: fileInfo.name,
    file_path: fileInfo.path,
    file_hash: fileInfo.hash || 'unknown',
    file_size: fileInfo.size,
    threat_type: primaryThreat.type,
    risk_level: classifyRiskLevel(threats)
  };
}

module.exports = {
  analyzeThreat,
  classifyRiskLevel,
  getThreatsForDatabase,
  THREAT_TYPES
};
