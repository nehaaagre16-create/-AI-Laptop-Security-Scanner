const fs = require('fs');
const path = require('path');

/**
 * Path Resolver Utility
 * Detects and normalizes Windows, Linux, and WSL paths
 */

/**
 * Detect path type and normalize it for the current environment
 * @param {string} inputPath - The raw path input from user
 * @returns {object} - { type, normalizedPath, originalPath, isValid, error }
 */
function resolvePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return {
      type: 'invalid',
      normalizedPath: null,
      originalPath: inputPath,
      isValid: false,
      error: 'Path is empty or invalid'
    };
  }

  const trimmedPath = inputPath.trim();
  
  // Detect WSL UNC path: \\wsl.localhost\Ubuntu\home\user
  // Also handle forward slash variants: //wsl.localhost/Ubuntu/home/user
  // Also handle \\wsl$\Ubuntu\home\user (older WSL UNC format)
  if (trimmedPath.startsWith('\\\\wsl.localhost\\') || 
      trimmedPath.startsWith('\\wsl.localhost\\') ||
      trimmedPath.startsWith('//wsl.localhost/') ||
      trimmedPath.startsWith('\\\\wsl$\\') ||
      trimmedPath.startsWith('\\wsl$\\') ||
      trimmedPath.startsWith('//wsl$/') ||
      trimmedPath.includes('wsl.localhost')) {
    return resolveWSLPath(trimmedPath);
  }
  
  // Detect Windows path: C:\Users\Name or C:/Users/Name
  // Check for drive letter followed by colon and backslash or slash
  if (/^[a-zA-Z]:[\\\/]/.test(trimmedPath) || /^[a-zA-Z]:/.test(trimmedPath)) {
    return resolveWindowsPath(trimmedPath);
  }
  
  // Detect Linux/Unix path: /home/user
  if (trimmedPath.startsWith('/')) {
    return resolveLinuxPath(trimmedPath);
  }
  
  // Relative path or unknown
  return {
    type: 'relative',
    normalizedPath: path.resolve(trimmedPath),
    originalPath: trimmedPath,
    isValid: true,
    error: null
  };
}

/**
 * Resolve WSL UNC path to Linux path
 * Handles: \\wsl.localhost\Ubuntu\home\user  or  \\wsl$\Ubuntu\home\user
 * Example: \\wsl.localhost\Ubuntu\home\user -> /home/user
 */
function resolveWSLPath(inputPath) {
  // Normalize backslashes to forward slashes first for easier parsing
  let normalized = inputPath.replace(/\\/g, '/');
  
  // Match //wsl.localhost/Distro/... or //wsl$/Distro/...
  const wslMatch = normalized.match(/^\/\/wsl(?:\.localhost|\$)\/([^\/]+)(\/.*)?$/);
  
  if (wslMatch) {
    const distro = wslMatch[1];
    const restPath = wslMatch[2] || '';
    normalized = restPath || '/';
  } else {
    // Fallback: strip any wsl prefix patterns
    normalized = normalized.replace(/\/\/wsl[^/]*\/[^/]+/, '');
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
  }
  
  // Collapse multiple slashes
  normalized = normalized.replace(/\/+/g, '/');
  
  return {
    type: 'wsl',
    normalizedPath: normalized,
    originalPath: inputPath,
    isValid: true,
    error: null
  };
}

/**
 * Resolve Windows path
 * Example: C:\Users\Name -> /mnt/c/Users/Name (WSL mount)
 * Also handles D:\Projects -> /mnt/d/Projects
 */
function resolveWindowsPath(inputPath) {
  // Normalize backslashes to forward slashes
  let normalized = inputPath.replace(/\\/g, '/');
  
  // Match drive letter pattern: C:/... or C:\...
  const driveMatch = normalized.match(/^([a-zA-Z]):\/(.*)$/);
  
  if (driveMatch) {
    const driveLetter = driveMatch[1].toLowerCase();
    const restPath = driveMatch[2];
    // WSL mounts Windows drives at /mnt/c/, /mnt/d/, etc.
    normalized = `/mnt/${driveLetter}/${restPath}`;
  }
  
  // Collapse multiple slashes
  normalized = normalized.replace(/\/+/g, '/');
  
  return {
    type: 'windows',
    normalizedPath: normalized,
    originalPath: inputPath,
    isValid: true,
    error: null
  };
}

/**
 * Resolve Linux/Unix path
 * Example: /home/user -> /home/user
 */
function resolveLinuxPath(inputPath) {
  return {
    type: 'linux',
    normalizedPath: inputPath,
    originalPath: inputPath,
    isValid: true,
    error: null
  };
}

/**
 * Validate that a folder exists and is accessible
 * @param {string} folderPath - The normalized path to validate
 * @returns {object} - { exists, isDirectory, readable, message }
 */
function validateFolder(folderPath) {
  try {
    // Check if path exists
    if (!fs.existsSync(folderPath)) {
      return {
        exists: false,
        isDirectory: false,
        readable: false,
        message: 'Folder does not exist'
      };
    }
    
    // Check if it's a directory
    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) {
      return {
        exists: true,
        isDirectory: false,
        readable: false,
        message: 'Path exists but is not a directory'
      };
    }
    
    // Check if it's readable
    try {
      fs.accessSync(folderPath, fs.constants.R_OK);
      return {
        exists: true,
        isDirectory: true,
        readable: true,
        message: 'Folder is valid and accessible'
      };
    } catch (err) {
      return {
        exists: true,
        isDirectory: true,
        readable: false,
        message: 'Permission denied - cannot read folder'
      };
    }
  } catch (err) {
    return {
      exists: false,
      isDirectory: false,
      readable: false,
      message: `Validation error: ${err.message}`
    };
  }
}

/**
 * Full path resolution and validation
 * @param {string} inputPath - Raw path from user
 * @returns {object} - Complete resolution and validation result
 */
function resolveAndValidate(inputPath) {
  console.log(`[PATH] Resolving: ${inputPath}`);

  // Step 1: Detect and normalize path
  const resolution = resolvePath(inputPath);

  if (!resolution.isValid) {
    console.log(`[PATH] Resolution failed: ${resolution.error}`);
    return {
      ...resolution,
      validation: {
        exists: false,
        isDirectory: false,
        readable: false,
        message: resolution.error
      }
    };
  }

  console.log(`[PATH] Detected type: ${resolution.type}`);
  console.log(`[PATH] Normalized: ${resolution.normalizedPath}`);

  // Step 2: Validate the normalized path
  const validation = validateFolder(resolution.normalizedPath);

  console.log(`[PATH] Validation: ${validation.message}`);

  return {
    ...resolution,
    validation
  };
}

// ── Tests ───────────────────────────────────────────────────────────
function runPathResolverTests() {
  const tests = [
    // Linux paths
    { input: '/home/user', expected: '/home/user', type: 'linux' },
    { input: '/tmp', expected: '/tmp', type: 'linux' },
    { input: '/var/log', expected: '/var/log', type: 'linux' },
    // Windows paths
    { input: 'C:\\Users\\LENOVO\\Desktop', expected: '/mnt/c/Users/LENOVO/Desktop', type: 'windows' },
    { input: 'D:\\Projects', expected: '/mnt/d/Projects', type: 'windows' },
    { input: 'C:/Users/test', expected: '/mnt/c/Users/test', type: 'windows' },
    // WSL UNC paths
    { input: '\\\\wsl.localhost\\Ubuntu\\home\\paperclip', expected: '/home/paperclip', type: 'wsl' },
    { input: '\\\\wsl.localhost\\Ubuntu\\tmp', expected: '/tmp', type: 'wsl' },
    { input: '\\\\wsl$\\Ubuntu\\home\\user', expected: '/home/user', type: 'wsl' },
    { input: '//wsl.localhost/Ubuntu/var/log', expected: '/var/log', type: 'wsl' },
    // Edge cases
    { input: 'C:\\', expected: '/mnt/c/', type: 'windows' },
    { input: '/', expected: '/', type: 'linux' },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    const result = resolvePath(t.input);
    const ok = result.normalizedPath === t.expected && result.type === t.type;
    if (ok) {
      passed++;
      console.log(`✓ "${t.input}" → ${result.normalizedPath} (${result.type})`);
    } else {
      failed++;
      console.log(`✗ "${t.input}"`);
      console.log(`  expected: ${t.expected} (${t.type})`);
      console.log(`  got:      ${result.normalizedPath} (${result.type})`);
    }
  }

  console.log(`\n${passed}/${tests.length} passed, ${failed} failed`);
  return failed === 0;
}

// Run tests if executed directly
if (require.main === module) {
  runPathResolverTests();
}

module.exports = {
  resolvePath,
  resolveWSLPath,
  resolveWindowsPath,
  resolveLinuxPath,
  validateFolder,
  resolveAndValidate
};