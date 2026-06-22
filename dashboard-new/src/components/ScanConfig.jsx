import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Save, CheckCircle, AlertCircle, Loader2, Edit3, X, TestTube, ArrowRight, Settings } from 'lucide-react';

const API_BASE = '';

function ScanConfig({ onToast, onStartScan, scanStatus, currentScanFolder, lastScanFolder }) {
  const [currentFolder, setCurrentFolder] = useState('');
  const [inputFolder, setInputFolder] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [lastResolved, setLastResolved] = useState(null);

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
      onToast?.({ type: 'Error', severity: 'high', description: 'Failed to load scan folder configuration' });
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
      setLastResolved({ userPath: data.userPath, resolvedPath: data.resolvedPath, type: data.type });
      setSuccess('Scan folder updated. Starting scan...');
      setIsEditing(false);
      onToast?.({ type: 'Success', severity: 'low', description: 'Scan folder updated. Starting scan...' });

      // ALWAYS auto-start scan after folder change
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
        setLastResolved({ userPath: data.userPath, resolvedPath: data.resolvedPath, type: data.type });
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
    setLastResolved(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl border border-white/5 overflow-hidden"
    >
      {/* Header */}
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

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Current Folder Display */}
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

        {/* Last Scan Folder Display */}
        {lastScanFolder && lastScanFolder !== currentFolder && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <FolderOpen className="w-4 h-4 text-muted" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted uppercase tracking-wider">Last Scan Folder</p>
              <p className="text-sm text-text-primary font-mono truncate">{lastScanFolder}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/10 border border-muted/20">
              <span className="text-[10px] font-medium text-muted uppercase">Previous</span>
            </div>
          </div>
        )}

        {/* Scanning State */}
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

        {/* Edit Mode */}
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
                  Paste any path — Windows (C:\Users), WSL UNC (\\wsl.localhost\Ubuntu\home\user), or Linux (/home/user) — it will be converted automatically.
                </p>
              </div>

              {/* Error / Success Messages */}
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

              {/* Test Result with resolved path display */}
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
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] uppercase tracking-wider opacity-60 w-16">Type</span>
                            <span className="capitalize">{testResult.type}</span>
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

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTest}
                  disabled={isTesting || isSaving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-sm font-medium hover:bg-secondary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  Test Folder
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={isSaving || isTesting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save & Scan
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancel}
                  disabled={isSaving || isTesting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-muted text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info */}
        {!isEditing && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-primary">i</span>
            </div>
            <div className="text-xs text-muted space-y-1">
              <p>Changing the folder will automatically start a new scan.</p>
              <p>The scanner will use this folder for all future scans, including background scans every 30 minutes.</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ScanConfig;
