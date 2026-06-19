const https = require('https');

const API_KEY = process.env.VIRUSTOTAL_API_KEY;
const HOST = 'www.virustotal.com';

function checkHash(hash) {
  return new Promise((resolve, reject) => {
    if (!API_KEY) {
      reject(new Error('VirusTotal API key not configured'));
      return;
    }

    const options = {
      hostname: HOST,
      port: 443,
      path: `/api/v3/files/${hash}`,
      method: 'GET',
      headers: {
        'x-apikey': API_KEY,
        'User-Agent': 'AI-Laptop-Security-Scanner/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);

          if (res.statusCode === 404) {
            resolve({
              found: false,
              hash: hash,
              malicious: 0,
              suspicious: 0,
              harmless: 0,
              total: 0,
              verdict: 'Unknown - not in database'
            });
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`VirusTotal API error: ${res.statusCode} - ${json.error?.message || data}`));
            return;
          }

          const stats = json.data?.attributes?.last_analysis_stats || {};
          const malicious = stats.malicious || 0;
          const suspicious = stats.suspicious || 0;
          const harmless = stats.harmless || 0;
          const total = malicious + suspicious + harmless + (stats.undetected || 0);

          let verdict = 'Clean';
          if (malicious >= 5) {
            verdict = 'Malicious';
          } else if (malicious >= 3 || suspicious >= 3) {
            verdict = 'Suspicious';
          } else if (malicious > 0 || suspicious > 0) {
            verdict = 'Low Risk';
          }

          resolve({
            found: true,
            hash: hash,
            malicious: malicious,
            suspicious: suspicious,
            harmless: harmless,
            total: total,
            verdict: verdict
          });
        } catch (err) {
          reject(new Error(`Failed to parse VirusTotal response: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`VirusTotal request failed: ${err.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('VirusTotal request timed out'));
    });

    req.end();
  });
}

module.exports = { checkHash };
