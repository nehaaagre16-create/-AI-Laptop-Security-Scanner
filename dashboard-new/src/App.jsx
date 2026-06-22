import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HeroCard from './components/HeroCard';
import StatsGrid from './components/StatsGrid';
import SeverityCards from './components/SeverityCards';
import ChartsSection from './components/ChartsSection';
import ThreatsTable from './components/ThreatsTable';
import Recommendations from './components/Recommendations';
import ToastAlert from './components/ToastAlert';
import ScanConfig from './components/ScanConfig';
import ScanScope from './components/ScanScope';
import ScanConfigCard from './components/ScanConfigCard';

const API_BASE = '';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-center p-8 glass rounded-xl">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-danger">!</span>
            </div>
            <h2 className="text-lg font-bold text-text-primary mb-2">Something went wrong</h2>
            <p className="text-sm text-muted mb-4">{this.state.error?.message || 'Unknown error'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [data, setData] = useState(null);
  const [threats, setThreats] = useState([]);
  const [informationalFiles, setInformationalFiles] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [scanStatus, setScanStatus] = useState('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [configFolder, setConfigFolder] = useState('');
  const [lastScanFolder, setLastScanFolder] = useState('');
  const [staleBanner, setStaleBanner] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);

      const res = await fetch(`${API_BASE}/scan/status`);
      if (!res.ok) throw new Error(`Scan status failed: ${res.status}`);
      const scanData = await res.json();
      setScanStatus(scanData.status || 'idle');
      setScanProgress(scanData.progress || 0);
      if (scanData.status === 'completed' && scanData.report) {
        setData(scanData.report);
        const scanPath = scanData.report?.summary?.scan_path;
        if (scanPath) {
          setLastScanFolder(scanPath);
        }
        // Stale banner only shows if we changed folder but scan hasn't completed yet
        if (configFolder && scanPath && scanPath !== configFolder && !isAutoScanning) {
          setStaleBanner(true);
        } else {
          setStaleBanner(false);
        }
      }

      const threatsRes = await fetch(`${API_BASE}/threats`);
      if (!threatsRes.ok) throw new Error(`Threats fetch failed: ${threatsRes.status}`);
      const threatsData = await threatsRes.json();
      setThreats(threatsData || []);

      // Fetch informational files separately
      const infoRes = await fetch(`${API_BASE}/scan/informational`);
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        setInformationalFiles(infoData || []);
      }

      const historyRes = await fetch(`${API_BASE}/reports/history`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setScanHistory(historyData || []);
      }

      // Fetch current config folder
      const configRes = await fetch(`${API_BASE}/api/config/folder`);
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfigFolder(configData.folderPath || '');
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // SSE for real-time alerts
  useEffect(() => {
    let eventSource;
    
    const connectSSE = () => {
      try {
        eventSource = new EventSource(`${API_BASE}/alerts`);
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'connected') {
              console.log('SSE connected:', data.message);
              return;
            }
            
            // Add new alert
            const newAlert = {
              id: Date.now() + Math.random(),
              type: data.type || 'Threat Detected',
              severity: data.severity || 'medium',
              description: data.description || data.message || 'New security event',
              file: data.file || data.file_path,
              timestamp: new Date(),
            };
            
            setAlerts(prev => [...prev.slice(-4), newAlert]);
            
            // Also refresh data
            fetchData();
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        };
        
        eventSource.onerror = (err) => {
          console.error('SSE error:', err);
          eventSource.close();
          // Reconnect after 5 seconds
          setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.error('SSE connection failed:', err);
      }
    };
    
    connectSSE();
    
    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Polling fallback
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const dismissAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleStartScan = () => {
    setActivePage('dashboard');
    setScanStatus('scanning');
    setScanProgress(0);
    setStaleBanner(false);
    setIsAutoScanning(true);
  };

  const handleScanComplete = () => {
    setIsAutoScanning(false);
    fetchData();
  };

  const summary = data?.summary || {};
  const metrics = data?.metrics || {};
  
  // Use backend-calculated values only — single source of truth
  const critical = threats.filter(t => t.risk_level === 'critical').length;
  const high = threats.filter(t => t.risk_level === 'high').length;
  const medium = threats.filter(t => t.risk_level === 'medium').length;
  const low = threats.filter(t => t.risk_level === 'low').length;
  
  // Actual threats = critical + high + medium + low (from backend threats table)
  const actualThreats = critical + high + medium + low;
  
  // Safe files from backend report (never calculate independently)
  const safeFiles = metrics.safe_files || Math.max(0, (metrics.files_scanned || 0) - actualThreats);
  const suspiciousCount = metrics.suspicious_count || 0;
  const informationalCount = metrics.informational_count || 0;
  
  // Scan coverage calculation
  const filesystemFiles = summary.filesystem_files || 352937; // Raw filesystem count
  const scannedFiles = metrics.files_scanned || 0;
  const coveragePercent = filesystemFiles > 0 ? Math.round((scannedFiles / filesystemFiles) * 100) : 0;
  const excludedFiles = Math.max(0, filesystemFiles - scannedFiles);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted text-sm">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center p-8 glass rounded-xl max-w-md">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-danger">!</span>
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-2">Connection Error</h2>
          <p className="text-sm text-muted mb-4">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); fetchData(); }}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        activePage={activePage} 
        onPageChange={setActivePage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        threatCount={threats.length}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header 
          title={activePage === 'dashboard' ? 'Security Dashboard' : activePage.charAt(0).toUpperCase() + activePage.slice(1)}
          lastUpdate={lastUpdate}
        />
        
        {/* Toast Alerts */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {alerts.map(alert => (
            <ToastAlert 
              key={alert.id} 
              alert={alert} 
              onDismiss={() => dismissAlert(alert.id)} 
            />
          ))}
        </div>
        
        <motion.main 
          className="flex-1 overflow-y-auto p-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Scan Progress Bar */}
          {scanStatus === 'scanning' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto mb-6"
            >
              <div className="glass rounded-xl p-4 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary">Scan in progress...</span>
                  <span className="text-sm text-muted">{scanProgress}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${scanProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Stale Data Banner */}
          {staleBanner && activePage === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto mb-6"
            >
              <div className="glass rounded-xl p-4 border border-warning/20 flex items-start gap-3" style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">Dashboard data reflects the last completed scan.</p>
                  <p className="text-xs text-muted mt-1">Run a new scan to analyze the selected folder.</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActivePage('settings')}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/80 transition-colors"
                >
                  Start Scan
                </motion.button>
              </div>
            </motion.div>
          )}

          {activePage === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <motion.div variants={itemVariants}>
                <HeroCard 
                  score={summary.security_score || 0}
                  progress={100}
                  filesAnalyzed={metrics.files_scanned || 0}
                  threatsFound={actualThreats}
                  scanDuration={summary.scan_duration_ms || 0}
                  coveragePercent={coveragePercent}
                  excludedFiles={excludedFiles}
                  currentFolder={configFolder}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <ScanConfigCard
                  currentFolder={configFolder}
                  analyzedFiles={metrics.files_scanned || 0}
                  excludedFiles={excludedFiles}
                  scanMode="User File Analysis"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <StatsGrid 
                  filesAnalyzed={metrics.files_scanned || 0}
                  foldersAnalyzed={metrics.folders_scanned || 0}
                  safeFiles={safeFiles}
                  threatsFound={actualThreats}
                  informationalCount={informationalCount}
                  suspiciousCount={suspiciousCount}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <SeverityCards
                  critical={critical}
                  high={high}
                  medium={medium}
                  low={low}
                  informationalCount={informationalCount}
                  suspiciousCount={suspiciousCount}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <ChartsSection 
                  riskDistribution={{
                    critical,
                    high,
                    medium,
                    low,
                    safe: safeFiles,
                    informational: informationalCount,
                    suspicious: suspiciousCount
                  }}
                  threats={threats}
                  scanHistory={scanHistory}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <ThreatsTable threats={threats.slice(0, 10)} />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Recommendations 
                  threats={threats}
                  score={summary.security_score || 0}
                />
              </motion.div>
            </div>
          )}

          {activePage === 'threats' && (
            <div className="max-w-7xl mx-auto">
              <motion.div variants={itemVariants}>
                <ThreatsTable threats={threats} showAll />
              </motion.div>
            </div>
          )}
          {activePage === 'files' && (
            <div className="max-w-7xl mx-auto">
              <motion.div variants={itemVariants} className="glass rounded-xl p-8 text-center">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Informational Files</h2>
                <p className="text-sm text-muted mb-4">Files flagged for review but not classified as threats</p>
                <div className="space-y-2">
                  {informationalFiles.length === 0 && (
                    <p className="text-sm text-muted">No informational files found</p>
                  )}
                  {informationalFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-muted" />
                        <span className="text-sm text-text-primary">{file.file_name}</span>
                      </div>
                      <span className="text-xs text-muted">{file.threat_type} ({file.risk_level})</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          {activePage === 'reports' && (
            <div className="max-w-7xl mx-auto">
              <motion.div variants={itemVariants} className="glass rounded-xl p-8 text-center">
                <p className="text-muted">Reports page coming soon...</p>
              </motion.div>
            </div>
          )}

          {activePage === 'history' && (
            <div className="max-w-7xl mx-auto">
              <motion.div variants={itemVariants} className="glass rounded-xl p-8 text-center">
                <p className="text-muted">History page coming soon...</p>
              </motion.div>
            </div>
          )}

          {activePage === 'settings' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <motion.div variants={itemVariants}>
                <ScanConfig
                  onToast={(alert) => setAlerts(prev => [...prev.slice(-4), { ...alert, id: Date.now() + Math.random(), timestamp: new Date() }])}
                  onStartScan={handleStartScan}
                  scanStatus={scanStatus}
                  currentScanFolder={configFolder}
                  lastScanFolder={lastScanFolder}
                />
              </motion.div>
            </div>
          )}
        </motion.main>
      </div>
    </div>
  );
}

// Wrap App with Error Boundary
export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}