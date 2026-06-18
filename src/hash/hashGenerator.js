const crypto = require('crypto');
const fs = require('fs');

function generateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('error', (err) => reject(err));
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function generateStringHash(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function hashFiles(fileList) {
  const results = [];
  const hashMap = new Map();

  for (const file of fileList) {
    try {
      // Fast hash: combine path + size + mtime for speed
      const fastHashStr = file.path + '|' + file.size + '|' + file.modified;
      const fileHash = generateStringHash(fastHashStr);
      const isDuplicate = hashMap.has(fileHash);
      
      if (!isDuplicate) {
        hashMap.set(fileHash, file.path);
      }

      results.push({
        ...file,
        hash: fileHash,
        isDuplicate: isDuplicate
      });
    } catch (error) {
      results.push({
        ...file,
        hash: null,
        isDuplicate: false,
        hashError: error.message
      });
    }
  }

  return results;
}

module.exports = {
  generateFileHash,
  generateStringHash,
  hashFiles
};