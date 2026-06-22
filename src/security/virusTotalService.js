const { calculateFileHash } = require('../hash/hashGenerator');
const { checkHash } = require('./virusTotal');

// Extensions that should be checked with VirusTotal
const VIRUSTOTAL_EXTENSIONS = ['.exe', '.msi', '.bat', '.cmd', '.ps1', '.js', '.sh'];

// Rate limiting: max 4 requests per minute for free tier
const REQUEST_DELAY_MS = 15000; // 15 seconds between requests
let lastRequestTime = 0;

function shouldCheckWithVirusTotal(fileInfo) {
  return VIRUSTOTAL_EXTENSIONS.includes(fileInfo.extension.toLowerCase());
}

async function checkFileWithVirusTotal(fileInfo) {
  try {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DELAY_MS) {
      const waitTime = REQUEST_DELAY_MS - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Generate hash
    const hash = await calculateFileHash(fileInfo.path);
    lastRequestTime = Date.now();

    // Query VirusTotal
    const result = await checkHash(hash);
    
    return {
      hash,
      ...result,
      checked_at: new Date().toISOString()
    };
  } catch (error) {
    return {
      error: error.message,
      hash: null,
      checked_at: new Date().toISOString()
    };
  }
}

function formatVirusTotalResult(vt) {
  if (!vt) return 'Not checked';
  if (vt.error) return `Error: ${vt.error}`;
  if (!vt.found) return 'Not in database';
  
  const detections = vt.malicious + vt.suspicious;
  const total = vt.total || 70;
  return `${detections}/${total} detections`;
}

function getVirusTotalVerdict(vt) {
  if (!vt || vt.error) return 'unknown';
  if (!vt.found) return 'unknown';
  
  const detections = vt.malicious + vt.suspicious;
  if (detections >= 5) return 'malicious';
  if (detections >= 3) return 'suspicious';
  if (detections > 0) return 'low-risk';
  return 'clean';
}

module.exports = {
  shouldCheckWithVirusTotal,
  checkFileWithVirusTotal,
  formatVirusTotalResult,
  getVirusTotalVerdict,
  VIRUSTOTAL_EXTENSIONS
};