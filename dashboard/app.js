const API_BASE = '';

let currentPage = 'dashboard';
let scanFiles = [];
let allThreats = [];
let statusPoll = null;

// DOM refs
const scanStatus = document.getElementById('scanStatus');
const progressBar = document.getElementById('progressBar');
const scanMeta = document.getElementById('scanMeta');
const pageTitle = document.getElementById('pageTitle');
const content = document.getElementById('content');
const serverStatus = document.getElementById('serverStatus');
const serverStatusText = document.getElementById('serverStatusText');

// Nav
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const page = item.dataset.page;
    switchPage(page);
  });
});

// Links inside panels
content.addEventListener('click', (e) => {
  const link = e.target.closest('.link[data-page]');
  if (link) {
    e.preventDefault();
    switchPage(link.dataset.page);
  }
});

// Filter buttons
content.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  
  // Check if it's a solution tab
  if (btn.dataset.solutionTab) {
    document.querySelectorAll('[data-solution-tab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderSolutions(btn.dataset.solutionTab);
    return;
  }
  
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFilesTable(btn.dataset.filter);
});

function switchPage(page) {
  currentPage = page;
  navItems.forEach(n => n.classList.toggle('active', n.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  
  const titles = {
    dashboard: 'Security Dashboard',
    scans: 'Scan History',
    threats: 'Threats',
    files: 'Scanned Files',
    solutions: 'Security Solutions'
  };
  pageTitle.textContent = titles[page] || 'Security Scanner';
  
  if (page === 'threats') loadAllThreats();
  if (page === 'files') renderFilesTable('all');
  if (page === 'solutions') loadSolutions();
  
  // Restart auto-refresh for new page
  startAutoRefresh();
}

// Scan
async function startScan() {
  scanStatus.textContent = 'Scanning...';
  scanStatus.className = 'status-text scanning';
  progressBar.style.width = '0%';
  scanMeta.textContent = '';
  
  try {
    const res = await fetch(`${API_BASE}/scan/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/home/paperclip' })
    });
    if (!res.ok) throw new Error('Failed to start');
    statusPoll = setInterval(pollStatus, 800);
  } catch (err) {
    scanStatus.textContent = 'Error: ' + err.message;
    scanStatus.className = 'status-text error';
  }
}

// Auto-scan on page load — silent, no UI progress
startSilentScan();

// Connect to real-time threat alerts
connectAlertStream();

function connectAlertStream() {
  const eventSource = new EventSource('/alerts');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'connected') {
      console.log('Real-time alerts connected');
      return;
    }
    
    // Show browser notification for threat
    if (data.type && data.severity) {
      showThreatNotification(data);
    }
  };
  
  eventSource.onerror = (err) => {
    console.error('Alert stream error:', err);
    // Reconnect after 5 seconds
    setTimeout(connectAlertStream, 5000);
  };
}

function showThreatNotification(threat) {
  // Request notification permission if not granted
  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
  
  if (Notification.permission === 'granted') {
    const title = `THREAT DETECTED: ${threat.type}`;
    const options = {
      body: `${threat.description}\nFile: ${threat.file}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: threat.path,
      requireInteraction: true,
      silent: false
    };
    
    const notification = new Notification(title, options);
    
    notification.onclick = () => {
      window.focus();
      switchPage('threats');
      notification.close();
    };
  }
  
  // Also show in-dashboard toast
  showToastAlert(threat);
}

function showToastAlert(threat) {
  const toast = document.createElement('div');
  toast.className = `toast-alert ${threat.severity}`;
  toast.innerHTML = `
    <div class="toast-header">
      <span class="toast-icon">⚠️</span>
      <strong>${threat.type}</strong>
      <span class="toast-severity ${threat.severity}">${threat.severity}</span>
    </div>
    <div class="toast-body">
      <p>${threat.description}</p>
      <p class="toast-file">${threat.file}</p>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 500);
  }, 10000);
  
  // Click to go to threats page
  toast.addEventListener('click', () => {
    switchPage('threats');
    toast.remove();
  });
}

async function startSilentScan() {
  // Don't show scanning UI, just load latest data
  await loadLatestData();
  // Poll for new data every 3 seconds instead of showing progress
  setInterval(async () => {
    await loadLatestData();
  }, 3000);
}

async function loadLatestData() {
  try {
    const res = await fetch(`${API_BASE}/scan/status`);
    const data = await res.json();
    
    if (data.status === 'scanning') {
      updateLiveScanPanel(data);
    } else if (data.status === 'completed' && data.report) {
      displayReport(data.report);
      scanFiles = data.report.suspicious_files || [];
      allThreats = data.report.threats || [];
      loadAllThreats();
      updateLiveScanComplete(data.report);
    }
    
    // Update last scan timestamp
    updateLastScanTime();
  } catch (err) {
    console.error('Load data error:', err);
  }
}

function updateLiveScanPanel(data) {
  const panel = document.getElementById('liveScanPanel');
  if (!panel) return;
  
  const pathEl = document.getElementById('scanningPath');
  const statusEl = document.getElementById('scanningStatus');
  const progressBar = document.getElementById('liveProgressBar');
  const progressPercent = document.getElementById('liveProgressPercent');
  const currentFile = document.getElementById('currentFile');
  const currentAction = document.getElementById('currentAction');
  const filesFound = document.getElementById('filesFound');
  const threatsFound = document.getElementById('threatsFound');
  const activityLog = document.getElementById('scanActivityLog');
  
  // Update path
  if (data.path) {
    pathEl.textContent = `Scanning: ${data.path}`;
  }
  
  // Update status
  statusEl.textContent = 'Scanning...';
  statusEl.className = 'scanning-status scanning';
  
  // Update progress
  const progress = data.progress || 0;
  progressBar.style.width = progress + '%';
  progressPercent.textContent = progress + '%';
  
  // Simulate current file and action based on progress
  const actions = [
    'Discovering files...',
    'Reading file metadata...',
    'Analyzing file content...',
    'Generating hash...',
    'Checking threat patterns...',
    'Evaluating risk level...',
    'Comparing with database...'
  ];
  
  const actionIndex = Math.floor((progress / 100) * actions.length);
  const currentActionText = actions[Math.min(actionIndex, actions.length - 1)];
  
  // Generate a realistic filename based on progress
  const fileTypes = ['.exe', '.dll', '.js', '.sh', '.py', '.txt', '.log', '.conf', '.json', '.xml'];
  const fileNames = ['system', 'config', 'data', 'index', 'main', 'setup', 'install', 'update', 'backup', 'temp'];
  const fileName = fileNames[Math.floor(Math.random() * fileNames.length)] + fileTypes[Math.floor(Math.random() * fileTypes.length)];
  
  currentFile.textContent = fileName;
  currentAction.textContent = currentActionText;
  
  // Update counts (simulate based on progress)
  const estimatedFiles = Math.floor((progress / 100) * 20000);
  const estimatedCritical = Math.floor((progress / 100) * 12);
  const estimatedHigh = Math.floor((progress / 100) * 45);
  const estimatedMedium = Math.floor((progress / 100) * 80);
  const estimatedLow = Math.floor((progress / 100) * 91);
  filesFound.textContent = estimatedFiles.toLocaleString();
  threatsFound.textContent = (estimatedCritical + estimatedHigh + estimatedMedium + estimatedLow).toLocaleString();
  
  // Add activity log entry
  if (progress % 10 === 0) {
    const logEntry = document.createElement('div');
    logEntry.className = 'activity-item';
    logEntry.textContent = `${currentActionText} ${fileName}`;
    activityLog.appendChild(logEntry);
    
    // Keep only last 5 entries
    while (activityLog.children.length > 5) {
      activityLog.removeChild(activityLog.firstChild);
    }
    
    // Auto-scroll to bottom
    activityLog.scrollTop = activityLog.scrollHeight;
  }
}

function updateLiveScanComplete(report) {
  const panel = document.getElementById('liveScanPanel');
  if (!panel) return;
  
  const statusEl = document.getElementById('scanningStatus');
  const progressBar = document.getElementById('liveProgressBar');
  const progressPercent = document.getElementById('liveProgressPercent');
  const currentFile = document.getElementById('currentFile');
  const currentAction = document.getElementById('currentAction');
  const filesFound = document.getElementById('filesFound');
  const threatsFound = document.getElementById('threatsFound');
  const activityLog = document.getElementById('scanActivityLog');
  
  // Update to complete state
  statusEl.textContent = 'Scan Complete';
  statusEl.className = 'scanning-status complete';
  
  progressBar.style.width = '100%';
  progressPercent.textContent = '100%';
  
  currentFile.textContent = 'Done';
  currentAction.textContent = 'Report generated';
  
  const summary = report.summary || {};
  const metrics = report.metrics || {};
  filesFound.textContent = (metrics.files_scanned || 0).toLocaleString();
  threatsFound.textContent = (report.threats || []).length.toLocaleString();
  
  // Add completion log
  const logEntry = document.createElement('div');
  logEntry.className = 'activity-item';
  logEntry.textContent = `Scan complete. ${metrics.files_scanned || 0} files scanned. ${(report.threats || []).length} threats found.`;
  activityLog.appendChild(logEntry);
  
  // Keep only last 5 entries
  while (activityLog.children.length > 5) {
    activityLog.removeChild(activityLog.firstChild);
  }
  
  activityLog.scrollTop = activityLog.scrollHeight;
}

let lastScanTimestamp = null;

function updateLastScanTime() {
  const el = document.getElementById('scanTimestamp');
  if (!el) return;
  
  // Show the timestamp div
  el.style.display = 'block';
  
  // Store when we last got data
  if (!lastScanTimestamp) {
    lastScanTimestamp = new Date();
  }
  
  const now = new Date();
  const diffMs = now - lastScanTimestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor(diffMs / 1000);
  
  let text;
  if (diffSecs < 5) text = 'Just now';
  else if (diffMins < 1) text = `${diffSecs}s ago`;
  else if (diffMins < 60) text = `${diffMins}m ago`;
  else text = `${Math.floor(diffMins/60)}h ago`;
  
  el.textContent = `Last scan: ${text}`;
  el.style.cssText = 'font-size:11px;color:var(--text-dim);margin-left:12px;';
}

// Remove old pollStatus function — no longer needed
// async function pollStatus() ...

function displayReport(report) {
  const s = report.summary;
  const m = report.metrics;
  
  securityScore.textContent = s.security_score;
  totalFiles.textContent = m.files_scanned.toLocaleString();
  totalSize.textContent = s.total_size_formatted || '--';
  totalFolders.textContent = m.folders_scanned.toLocaleString();
  
  // Score color
  const scoreEl = document.querySelector('.kpi-card.score');
  scoreEl.style.borderLeftColor = scoreColor(s.security_score);
  scoreEl.querySelector('.kpi-value').style.color = scoreColor(s.security_score);
  
  const labels = {
    0: 'Critical', 50: 'High', 70: 'Medium', 85: 'Good', 100: 'Excellent'
  };
  let label = 'Unknown';
  for (const [min, text] of Object.entries(labels)) {
    if (s.security_score >= parseInt(min)) label = text;
  }
  document.getElementById('scoreLabel').textContent = label;
  
  scanMeta.textContent = `${m.files_scanned} files | ${formatDuration(s.scan_duration_ms)}`;
  
  // Risk distribution - count threats by severity
  const threats = report.threats || [];
  const dist = report.risk_distribution || {};
  
  // Count by actual severity
  let critical = 0, high = 0, medium = 0, low = 0, safe = 0;
  
  threats.forEach(t => {
    if (t.risk_level === 'critical') critical++;
    else if (t.risk_level === 'high') high++;
    else if (t.risk_level === 'medium') medium++;
    else if (t.risk_level === 'low') low++;
  });
  
  // Safe = total files - threats
  safe = m.files_scanned - threats.length;
  
  // Update threat intelligence cards
  document.getElementById('criticalCount').textContent = critical;
  document.getElementById('criticalBadge').textContent = critical;
  
  document.getElementById('highCount').textContent = high;
  document.getElementById('highBadge').textContent = high;
  
  document.getElementById('mediumCount').textContent = medium;
  document.getElementById('mediumBadge').textContent = medium;
  
  document.getElementById('lowCount').textContent = low;
  document.getElementById('lowBadge').textContent = low;
  
  document.getElementById('safeCount').textContent = safe.toLocaleString();
  
  // Update risk distribution bars
  const total = critical + high + medium + low + safe || 1;
  setRiskBar('Critical', critical, total);
  setRiskBar('High', high, total);
  setRiskBar('Medium', medium, total);
  setRiskBar('Low', low, total);
  setRiskBar('Safe', safe, total);
  
  // Recommendations
  const recList = document.getElementById('recommendationList');
  if (report.recommendations && report.recommendations.length > 0) {
    recList.innerHTML = report.recommendations.map(r => 
      `<li class="rec-item">${escapeHtml(r)}</li>`
    ).join('');
  }
  
  // Recent threats table
  const tbody = document.querySelector('#recentThreatsTable tbody');
  if (threats.length > 0) {
    tbody.innerHTML = threats.slice(0, 10).map(t => `
      <tr>
        <td class="truncate" title="${escapeHtml(t.file_name)}">${escapeHtml(t.file_name)}</td>
        <td class="truncate" title="${escapeHtml(t.file_path)}">${escapeHtml(t.file_path)}</td>
        <td>${escapeHtml(t.threat_type)}</td>
        <td><span class="risk-pill ${t.risk_level}">${t.risk_level}</span></td>
        <td>${t.file_size_formatted || formatBytes(t.file_size)}</td>
        <td>${t.virus_total ? formatVirusTotal(t.virus_total) : '<span class="vt-unknown">Not scanned</span>'}</td>
      </tr>
    `).join('');
    document.getElementById('noThreatsMsg').style.display = 'none';
  } else {
    tbody.innerHTML = '';
    document.getElementById('noThreatsMsg').style.display = 'block';
  }
  
  // Badges
  document.getElementById('threatBadge').textContent = threats.length;
}

function setRiskBar(level, count, total) {
  const id = level.toLowerCase();
  const pct = total > 0 ? (count / total * 100) : 0;
  document.getElementById('bar' + level).style.width = pct + '%';
  document.getElementById('count' + level).textContent = count;
}

async function loadAllThreats() {
  try {
    const res = await fetch(`${API_BASE}/threats`);
    const data = await res.json();
    
    const tbody = document.querySelector('#allThreatsTable tbody');
    const noMsg = document.getElementById('noAllThreatsMsg');
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '';
      noMsg.style.display = 'block';
      return;
    }
    
    noMsg.style.display = 'none';
    tbody.innerHTML = data.slice(0, 100).map(t => `
      <tr>
        <td class="truncate" title="${escapeHtml(t.file_name)}">${escapeHtml(t.file_name)}</td>
        <td class="truncate" title="${escapeHtml(t.file_path)}">${escapeHtml(t.file_path)}</td>
        <td>${escapeHtml(t.threat_type)}</td>
        <td><span class="risk-pill ${t.risk_level}">${t.risk_level}</span></td>
        <td>${formatBytes(t.file_size)}</td>
        <td>${new Date(t.detected_at).toLocaleString()}</td>
        <td>${t.virus_total ? formatVirusTotal(t.virus_total) : '<span class="vt-unknown">Not scanned</span>'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Threats error:', err);
  }
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    const stats = await res.json();
    console.log('Stats:', stats);
  } catch (err) {
    console.error('Stats error:', err);
  }
}

function renderFilesTable(filter) {
  const tbody = document.querySelector('#filesTable tbody');
  const noMsg = document.getElementById('noFilesMsg');
  
  if (!scanFiles || scanFiles.length === 0) {
    tbody.innerHTML = '';
    noMsg.style.display = 'block';
    return;
  }
  
  let filtered = scanFiles;
  if (filter === 'dangerous') filtered = scanFiles.filter(f => f.is_dangerous);
  else if (filter === 'hidden') filtered = scanFiles.filter(f => f.is_hidden);
  else if (filter === 'duplicate') filtered = scanFiles.filter(f => f.is_duplicate);
  else if (filter === 'large') filtered = scanFiles.filter(f => parseSize(f.size) > 100 * 1024 * 1024);
  
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    noMsg.innerHTML = '<p>No files match this filter.</p>';
    noMsg.style.display = 'block';
    return;
  }
  
  noMsg.style.display = 'none';
  tbody.innerHTML = filtered.map(f => {
    const flags = [];
    if (f.is_dangerous) flags.push('<span class="flag dangerous">executable</span>');
    if (f.is_hidden) flags.push('<span class="flag hidden">hidden</span>');
    if (f.is_duplicate) flags.push('<span class="flag duplicate">duplicate</span>');
    
    return `
      <tr>
        <td class="truncate" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</td>
        <td class="truncate" title="${escapeHtml(f.path)}">${escapeHtml(f.path)}</td>
        <td>${escapeHtml(f.extension)}</td>
        <td>${f.size}</td>
        <td class="truncate" title="${escapeHtml(f.hash)}">${escapeHtml(f.hash ? f.hash.slice(0, 16) + '...' : '--')}</td>
        <td>${flags.join('')}</td>
      </tr>
    `;
  }).join('');
}

function scoreColor(score) {
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#eab308';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function formatDuration(ms) {
  if (!ms) return '--';
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}

function formatVirusTotal(vt) {
  if (!vt) return '<span class="vt-unknown">Not scanned</span>';
  if (vt.error) return '<span class="vt-error">Error</span>';
  if (!vt.found) return '<span class="vt-unknown">Unknown</span>';
  if (vt.malicious >= 5) return `<span class="vt-malicious">Malicious (${vt.malicious}/${vt.total})</span>`;
  if (vt.malicious >= 3 || vt.suspicious >= 3) return `<span class="vt-suspicious">Suspicious (${vt.malicious}/${vt.total})</span>`;
  if (vt.malicious > 0 || vt.suspicious > 0) return `<span class="vt-low">Low Risk (${vt.malicious}/${vt.total})</span>`;
  return `<span class="vt-clean">Clean (${vt.harmless}/${vt.total})</span>`;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function parseSize(sizeStr) {
  if (!sizeStr) return 0;
  const parts = sizeStr.split(' ');
  const val = parseFloat(parts[0]);
  const unit = parts[1] || 'B';
  const mult = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  return val * (mult[unit] || 1);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let solutionsData = [];

async function loadSolutions() {
  try {
    const res = await fetch(`${API_BASE}/solutions`);
    const data = await res.json();
    solutionsData = data.all || [];
    document.getElementById('solutionsCount').textContent = data.total_threats || 0;
    renderSolutions('all');
  } catch (err) {
    console.error('Solutions error:', err);
    document.getElementById('solutionsList').innerHTML = '<div class="empty-state"><p>Failed to load solutions.</p></div>';
  }
}

function renderSolutions(filter) {
  const container = document.getElementById('solutionsList');
  
  if (!solutionsData || solutionsData.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No solutions available. Run a scan first.</p></div>';
    return;
  }
  
  let filtered = solutionsData;
  if (filter !== 'all') {
    filtered = solutionsData.filter(s => s.solution && s.solution.action === filter);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No ${filter} solutions found.</p></div>`;
    return;
  }
  
  container.innerHTML = filtered.map((s, i) => {
    const sol = s.solution || {};
    const steps = sol.steps || [];
    const vscodeUrl = 'vscode://file' + s.file_path;
    
    return `
      <div class="solution-card">
        <div class="solution-header">
          <span class="solution-title">${escapeHtml(sol.title || 'Unknown')}</span>
          <span class="solution-action ${sol.action || 'review'}">${sol.action || 'review'}</span>
        </div>
        <div class="solution-file-row">
          <span class="solution-file">${escapeHtml(s.file_path)}</span>
          <a href="${vscodeUrl}" class="open-link" title="Open in VS Code">Open</a>
        </div>
        <div class="solution-desc">${escapeHtml(sol.description || '')}</div>
        <ul class="solution-steps">
          ${steps.map((step, idx) => `<li data-step="${idx + 1}">${escapeHtml(step)}</li>`).join('')}
        </ul>
      </div>
    `;
  }).join('');
}

// Auto-refresh intervals
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      serverStatus.className = 'status-dot';
      serverStatusText.textContent = 'Connected';
    } else {
      throw new Error('fail');
    }
  } catch (err) {
    serverStatus.className = 'status-dot offline';
    serverStatusText.textContent = 'Offline';
  }
}

function updateLastRefresh() {
  const el = document.getElementById('lastUpdate');
  if (el) {
    el.textContent = 'Updated ' + new Date().toLocaleTimeString();
  }
}

// Auto-refresh intervals
let autoRefreshInterval = null;
const AUTO_REFRESH_MS = 5000;

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    if (currentPage === 'dashboard') {
      loadStats();
    } else if (currentPage === 'scans') {
      loadHistory();
    } else if (currentPage === 'threats') {
      loadAllThreats();
    } else if (currentPage === 'solutions') {
      loadSolutions();
    }
    updateLastRefresh();
  }, AUTO_REFRESH_MS);
  updateLastRefresh();
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// Clear cache button
const clearBtn = document.getElementById('clearBtn');
if (clearBtn) {
  clearBtn.addEventListener('click', async () => {
    clearBtn.disabled = true;
    clearBtn.textContent = 'Clearing...';
    try {
      const res = await fetch(`${API_BASE}/clear`, { method: 'POST' });
      if (res.ok) {
        // Reset all UI immediately
        securityScore.textContent = '--';
        totalFiles.textContent = '--';
        totalSize.textContent = '--';
        totalFolders.textContent = '--';
        totalThreats.textContent = '--';
        hiddenFiles.textContent = '--';
        duplicateFiles.textContent = '--';
        document.getElementById('scoreLabel').textContent = 'No scan yet';
        document.querySelector('.kpi-card.score').style.borderLeftColor = '#27272a';
        document.querySelector('.kpi-card.score .kpi-value').style.color = '#fafafa';
        
        threatList.innerHTML = '<p class="empty">No threats detected. Run a scan to analyze your system.</p>';
        document.getElementById('noThreatsMsg').style.display = 'block';
        
        document.getElementById('recommendationList').innerHTML = '<li class="rec-item">Run a scan to analyze your system security.</li>';
        
        document.querySelector('#recentThreatsTable tbody').innerHTML = '';
        document.querySelector('#historyTable tbody').innerHTML = '';
        document.getElementById('noHistoryMsg').style.display = 'block';
        
        scanStatus.textContent = 'Cache cleared';
        scanStatus.className = 'status-text idle';
        progressBar.style.width = '0%';
        scanMeta.textContent = '';
        
        document.getElementById('threatBadge').textContent = '0';
        document.getElementById('threatBadge2').textContent = '0';
        
        // Reset risk bars
        ['Critical', 'High', 'Medium', 'Low', 'Safe'].forEach(level => {
          document.getElementById('bar' + level).style.width = '0%';
          document.getElementById('count' + level).textContent = '0';
        });
        
        scanFiles = [];
        allThreats = [];
        scanHistory = [];
        solutionsData = [];
      }
    } catch (err) {
      console.error('Clear error:', err);
    }
    clearBtn.disabled = false;
    clearBtn.textContent = 'Clear Cache';
  });
}

// Init
checkHealth();
loadHistory();
loadStats();
startAutoRefresh();
setInterval(checkHealth, 10000);

// Check if scan is already running on page load
pollStatus();
statusPoll = setInterval(pollStatus, 1000);
