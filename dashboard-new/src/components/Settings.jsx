import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Edit3,
  X,
  TestTube,
  ArrowRight,
  Settings,
  Usb,
  Download,
  Moon,
  Sun,
  Shield,
  Clock,
  Bell,
  Monitor,
  Info,
  Lock
} from 'lucide-react';
import { useTheme } from './ThemeContext';

const API_BASE = '';

function ToggleSwitch({ enabled, onChange, label, description, icon: Icon, disabled = false, badge }) {
  return (
    <div className={`flex items-start justify-between gap-4 p-4 rounded-lg border transition-all ${
      disabled 
        ? 'bg-white/[0.02] border-white/5 opacity-60' 
        : 'bg-white/5 border-white/10 hover:border-white/15'
    }`}>
      <div className="flex items-start gap-3 flex-1">
        {Icon && (
          <div className={`p-2 rounded-lg ${enabled && !disabled ? 'bg-primary/10' : 'bg-white/5'} transition-colors`}>
            <Icon className={`w-5 h-5 ${enabled && !disabled ? 'text-primary' : 'text-muted'} transition-colors`} />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-medium ${disabled ? 'text-muted' : 'text-text-primary'}`}>{label}</h4>
            {badge && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                badge === 'Coming Soon' ? 'bg-secondary/10 text-secondary border border-secondary/20' :
                badge === 'Server Controlled' ? 'bg-info/10 text-info border border-info/20' :
                'bg-success/10 text-success border border-success/20'
              }`}>
                {badge}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
          enabled ? 'bg-primary' : 'bg-white/10'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        role="switch"
        aria-checked={enabled}
      >
        <motion.div
          className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ x: enabled ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

function SettingsPage({ onToast, onStartScan, scanStatus, currentScanFolder, lastScanFolder }) {
  // Scan folder config
  const [currentFolder, setCurrentFolder] = useState('');
  const [inputFolder, setInputFolder] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [testResult, setTestResult] = useState(null);

  // Settings state - only features that actually work
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('securescan-notifications') !== 'false';
  });
  
  const [usbScanEnabled, setUsbScanEnabled] = useState(false);
  const [downloadMonitorEnabled, setDownloadMonitorEnabled] = useState(false);

  const { theme, setTheme } = useTheme();

  // Load current folder on mount
  useEffect(() => {
    loadCurrentFolder();
  }, []);

  const loadCurrentFolder = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config/folder`);
      if (!res.ok) throw new Error('Failed to load folder config');
      const data = await res.json();
      setCurrentFolder(data.folderPath || '/home/paperclip');
      setInputFolder(data.folderPath || '/home/paperclip');
    } catch (err) {
      console.error('Load folder error:', err);
    }
  };

  const handleSave = async () => {
    if (!inputFolder.trim()) {
      setError('Please enter a folder path');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/api/config/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: inputFolder.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details?.validation?.message || 'Failed to update folder');
      }

      setCurrentFolder(data.folderPath);
      setSuccess('Scan folder updated. Starting scan...');
      setIsEditing(false);
      onToast?.({ type: 'Success', severity: 'low', description: 'Scan folder updated. Starting scan...' });

      await handleAutoStartScan(data.folderPath);
    } catch (err) {
      setError(err.message);
      onToast?.({ type: 'Config Error', severity: 'high', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoStartScan = async (folderPath) => {
    setIsScanning(true);
    try {
      const res = await fetch(`${API_BASE}/scan/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath }),
      });
      const data = await res.json();
      if (res.ok) {
        onToast?.({ type: 'Scan Started', severity: 'low', description: `Scanning ${data.path}` });
        onStartScan?.();
      } else {
        throw new Error(data.error || 'Failed to start scan');
      }
    } catch (err) {
      setError(`Folder saved but scan failed: ${err.message}`);
      onToast?.({ type: 'Scan Error', severity: 'high', description: err.message });
    } finally {
      setIsScanning(false);
    }
  };

  const handleTest = async () => {
    if (!inputFolder.trim()) {
      setError('Please enter a folder path to test');
      return;
    }

    setIsTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/config/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: inputFolder.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setTestResult({
          valid: true,
          path: data.folderPath,
          userPath: data.userPath,
          resolvedPath: data.resolvedPath,
          type: data.type,
          validation: data.validation,
        });
      } else {
        setTestResult({
          valid: false,
          error: data.error || 'Invalid folder path',
          details: data.details,
        });
      }
    } catch (err) {
      setTestResult({
        valid: false,
        error: err.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCancel = () => {
    setInputFolder(currentFolder);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    setTestResult(null);
  };

  // Working settings handlers
  const handleNotificationsToggle = (enabled) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('securescan-notifications', enabled.toString());
    onToast?.({
      type: 'Settings Updated',
      severity: 'low',
      description: `Notifications ${enabled ? 'enabled' : 'disabled'}`
    });
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    onToast?.({
      type: 'Theme Changed',
      severity: 'low',
      description: `Switched to ${newTheme} mode`
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Page Title */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-muted mt-1">Configure your security scanner preferences</p>
      </motion.div>

      {/* Scan Configuration Card */}
      <motion.div variants={itemVariants}>
        <div className="glass rounded-xl border border-white/5 overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Scan Configuration</h3>
                <p className="text-xs text-muted mt-0.5">Configure the target folder for security scans</p>
              </div>
            </div>
            {!isEditing && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Change
              </motion.button>
            )}
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
              <FolderOpen className="w-4 h-4 text-muted" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted uppercase tracking-wider">Current Scan Folder</p>
                <p className="text-sm text-text-primary font-mono truncate">{currentFolder}</p>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/20">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-[10px] font-medium text-success uppercase">Active</span>
              </div>
            </div>

            {(isScanning || scanStatus === 'scanning') && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20"
              >
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <div>
                  <p className="text-sm text-primary font-medium">Scanning newly selected folder...</p>
                  <p className="text-xs text-muted">This may take a few moments depending on folder size</p>
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Folder Path</label>
                    <input
                      type="text"
                      value={inputFolder}
                      onChange={(e) => {
                        setInputFolder(e.target.value);
                        setError(null);
                        setSuccess(null);
                        setTestResult(null);
                      }}
                      placeholder="Paste path from File Explorer, WSL Explorer, or terminal"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary font-mono placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <p className="text-[11px] text-muted mt-1.5">
                      Paste any path — Windows, WSL UNC, or Linux — it will be converted automatically.
                    </p>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs"
                      >
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-xs"
                      >
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{success}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {testResult && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`p-3 rounded-lg border text-xs ${
                          testResult.valid
                            ? 'bg-success/10 border-success/20 text-success'
                            : 'bg-danger/10 border-danger/20 text-danger'
                        }`}
                      >
                        {testResult.valid ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              <span className="font-medium">Folder is accessible</span>
                            </div>
                            <div className="p-2 rounded bg-white/5 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wider opacity-60 w-16">Entered</span>
                                <span className="font-mono">{testResult.userPath}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <ArrowRight className="w-3 h-3 opacity-60" />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wider opacity-60 w-16">Resolved</span>
                                <span className="font-mono font-medium">{testResult.resolvedPath}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{testResult.error}</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleTest}
                      disabled={isTesting || isSaving}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-sm font-medium hover:bg-secondary/20 transition-colors disabled:opacity-50"
                    >
                      {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                      Test Folder
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSave}
                      disabled={isSaving || isTesting}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save & Scan
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCancel}
                      disabled={isSaving || isTesting}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-muted text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Available Now Section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-success" />
          <h2 className="text-sm font-semibold text-success uppercase tracking-wider">Available Now</h2>
        </div>

        <div className="space-y-4">
          {/* Notifications */}
          <div className="glass rounded-xl border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                  <p className="text-xs text-muted mt-0.5">Control dashboard alert behavior</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <ToggleSwitch
                enabled={notificationsEnabled}
                onChange={handleNotificationsToggle}
                label="Security Alerts"
                description="Receive notifications when threats are detected or scans complete."
                icon={Bell}
              />
            </div>
          </div>

          {/* Appearance */}
          <div className="glass rounded-xl border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Monitor className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Appearance</h3>
                  <p className="text-xs text-muted mt-0.5">Customize the dashboard theme</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                    theme === 'dark'
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-white/5 border-white/10 text-muted hover:bg-white/10 hover:text-text-primary'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-primary/20' : 'bg-white/10'}`}>
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Dark Mode</p>
                    <p className="text-xs text-muted">Default dark security theme</p>
                  </div>
                  {theme === 'dark' && (
                    <CheckCircle className="w-5 h-5 ml-auto" />
                  )}
                </button>

                <button
                  onClick={() => handleThemeChange('light')}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                    theme === 'light'
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-white/5 border-white/10 text-muted hover:bg-white/10 hover:text-text-primary'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-primary/20' : 'bg-white/10'}`}>
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Light Mode</p>
                    <p className="text-xs text-muted">Bright and clean appearance</p>
                  </div>
                  {theme === 'light' && (
                    <CheckCircle className="w-5 h-5 ml-auto" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Coming Soon Section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-secondary" />
          <h2 className="text-sm font-semibold text-secondary uppercase tracking-wider">Coming Soon</h2>
        </div>

        <div className="glass rounded-xl border border-white/5 overflow-hidden opacity-70">
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Shield className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Advanced Protection</h3>
                <p className="text-xs text-muted mt-0.5">Features in development for future releases</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* USB Device Protection - Disabled */}
            <ToggleSwitch
              enabled={usbScanEnabled}
              onChange={() => {}}
              label="USB Device Protection"
              description="Automatic scanning of external USB devices will be available in a future update."
              icon={Usb}
              disabled={true}
              badge="Coming Soon"
            />

            {/* Downloads Protection - Disabled */}
            <ToggleSwitch
              enabled={downloadMonitorEnabled}
              onChange={() => {}}
              label="Downloads Protection"
              description="Automatic monitoring of newly downloaded files will be available in a future update."
              icon={Download}
              disabled={true}
              badge="Coming Soon"
            />

            {/* Info note */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/5 border border-secondary/10">
              <Info className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted">
                These features require OS-level integration and are planned for v2.2. 
                Current scanner protects all files during regular scans.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* System Info */}
      <motion.div variants={itemVariants}>
        <div className="glass rounded-xl border border-white/5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">System Information</h3>
              <p className="text-xs text-muted mt-0.5">Current scanner configuration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-muted uppercase tracking-wider">Scanner Version</p>
              <p className="text-sm text-text-primary font-mono mt-1">v2.1.0</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-muted uppercase tracking-wider">Database</p>
              <p className="text-sm text-text-primary font-mono mt-1">SQLite v3.45</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-muted uppercase tracking-wider">Scan Engine</p>
              <p className="text-sm text-text-primary font-mono mt-1">Node.js File Scanner</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-muted uppercase tracking-wider">Threat Database</p>
              <p className="text-sm text-text-primary font-mono mt-1">8 Virus Types</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-muted uppercase tracking-wider">Background Scan</p>
              <p className="text-sm text-text-primary font-mono mt-1">Every 30 Minutes</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-muted uppercase tracking-wider">File Watcher</p>
              <p className="text-sm text-text-primary font-mono mt-1">Active</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default SettingsPage;