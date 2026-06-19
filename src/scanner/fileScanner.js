const fs = require('fs');
const path = require('path');
const { calculateFileHash } = require('../hash/hashGenerator');
const { checkHash } = require('../security/virusTotal');

const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.vbs', '.ps1', '.scr', '.js', '.dll', '.sh', '.msi'];

const SKIP_DIRS = [
  'node_modules', '.git', '.hermes', '.cache', '.npm', '.pnpm',
  'dist', 'build', 'coverage', '.nyc_output', '.vscode', '.idea',
  'tmp', 'temp', 'logs', '.local', '.config', '.vscode-server',
  'vendor', 'target', 'out', '.next', '.nuxt', '.pnpm-store'
];

function isHiddenFile(filePath) {
  const basename = path.basename(filePath);
  return basename.startsWith('.') || basename.startsWith('~') || basename.startsWith('$');
}

function isDangerousExtension(ext) {
  return DANGEROUS_EXTENSIONS.includes(ext.toLowerCase());
}

function shouldSkipDir(name) {
  return SKIP_DIRS.includes(name.toLowerCase());
}

async function scanDirectory(dirPath, options = {}) {
  const {
    maxDepth = 15,
    currentDepth = 0,
    includeHidden = true,
    onFileFound = null
  } = options;

  if (currentDepth > maxDepth) {
    return { files: [], folders: 0, errors: [] };
  }

  const result = {
    files: [],
    folders: 0,
    errors: []
  };

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    result.folders += 1;

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) continue;
        
        const subResult = await scanDirectory(fullPath, {
          ...options,
          currentDepth: currentDepth + 1
        });
        result.files.push(...subResult.files);
        result.folders += subResult.folders;
        result.errors.push(...subResult.errors);
      } else if (entry.isFile()) {
        const stats = fs.statSync(fullPath);
        const ext = path.extname(entry.name);
        const isHidden = isHiddenFile(fullPath);
        const isDangerous = isDangerousExtension(ext);

        const fileInfo = {
          name: entry.name,
          path: fullPath,
          extension: ext,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
          isHidden: isHidden,
          isDangerous: isDangerous,
          depth: currentDepth,
          hash: null,
          virusTotal: null
        };

        if (!isHidden || includeHidden) {
          result.files.push(fileInfo);
        }

        if (onFileFound) {
          onFileFound(fileInfo);
        }

        // Hash and VirusTotal check are done AFTER initial scan completes
        // This keeps the main scan fast - we only check suspicious files
        fileInfo.hash = null;
        fileInfo.virusTotal = null;
      }
    }
  } catch (error) {
    result.errors.push({ path: dirPath, error: error.message });
  }

  return result;
}

function getScanTarget() {
  if (process.platform === 'win32') {
    return process.env.USERPROFILE || 'C:\\Users';
  }
  return process.env.HOME || '/home';
}

module.exports = {
  scanDirectory,
  isHiddenFile,
  isDangerousExtension,
  getScanTarget,
  DANGEROUS_EXTENSIONS
};
