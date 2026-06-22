import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, FileSearch, FolderX, Info, ChevronDown, ChevronUp, HardDrive, Clock, Zap, Layers } from 'lucide-react';

const EXCLUSION_CATEGORIES = [
  { name: 'node_modules', label: 'Dependencies (node_modules)', count: 124187, reason: 'Third-party packages, not user files' },
  { name: '.git', label: 'Version Control (.git)', count: 91654, reason: 'Git metadata and history objects' },
  { name: '.local', label: 'App Data (.local)', count: 50682, reason: 'Application runtime data' },
  { name: '.npm', label: 'Package Cache (.npm)', count: 26897, reason: 'NPM downloaded package cache' },
  { name: '.hermes', label: 'Hermes Data (.hermes)', count: 6462, reason: 'Hermes agent internal files' },
  { name: 'dist/build', label: 'Build Output (dist, build)', count: 1582, reason: 'Generated build artifacts' },
  { name: '.cache', label: 'System Cache (.cache)', count: 1277, reason: 'Application cache files' },
  { name: '.config', label: 'Config Files (.config)', count: 2, reason: 'Application configuration' },
  { name: 'other', label: 'Other Hidden/System', count: 44852, reason: 'IDE configs, temp files, logs' },
];

function ScanScope({ currentFolder, filesAnalyzed, foldersAnalyzed, filesExcluded, foldersExcluded, lastScanTime, scanDuration }) {
  const [showExclusions, setShowExclusions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const totalFiles = filesAnalyzed + filesExcluded;
  const coveragePercent = totalFiles > 0 ? Math.round((filesAnalyzed / totalFiles) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl border border-white/5 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Scan Scope</h3>
              <p className="text-xs text-muted mt-0.5">What the scanner analyzed vs excluded</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <HardDrive className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">{coveragePercent}% Analyzed</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Current Folder */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <FolderOpen className="w-4 h-4 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted uppercase tracking-wider">Current Scan Folder</p>
            <p className="text-sm text-text-primary font-mono truncate">{currentFolder}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/20">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-[10px] font-medium text-success uppercase">Active</span>
          </div>
        </div>

        {/* Analyzed vs Excluded */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <FileSearch className="w-4 h-4 text-success" />
              <span className="text-xs text-success font-medium uppercase tracking-wider">Analyzed</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{filesAnalyzed.toLocaleString()}</p>
            <p className="text-xs text-muted mt-1">Files</p>
            <div className="mt-2 pt-2 border-t border-white/5">
              <p className="text-lg font-semibold text-text-primary">{foldersAnalyzed.toLocaleString()}</p>
              <p className="text-xs text-muted">Folders</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <FolderX className="w-4 h-4 text-muted" />
              <span className="text-xs text-muted font-medium uppercase tracking-wider">Excluded</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{filesExcluded.toLocaleString()}</p>
            <p className="text-xs text-muted mt-1">System/Cache/Deps</p>
            <div className="mt-2 pt-2 border-t border-white/5">
              <p className="text-lg font-semibold text-text-primary">{foldersExcluded.toLocaleString()}</p>
              <p className="text-xs text-muted">System Folders</p>
            </div>
          </div>
        </div>

        {/* Tooltip */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted leading-relaxed">
            The scanner intentionally skips dependency, cache, build, and system directories to improve performance and reduce false positives. 
            <strong className="text-text-primary"> Files Analyzed</strong> are your actual user-created files. 
            <strong className="text-text-primary"> Files Excluded</strong> are system files not relevant to security scanning.
          </p>
        </div>

        {/* Last Scan Info */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <Clock className="w-4 h-4 text-muted mx-auto mb-1" />
            <p className="text-xs text-muted">Last Scan</p>
            <p className="text-sm font-medium text-text-primary">{lastScanTime}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <Zap className="w-4 h-4 text-muted mx-auto mb-1" />
            <p className="text-xs text-muted">Duration</p>
            <p className="text-sm font-medium text-text-primary">{scanDuration}s</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <FileSearch className="w-4 h-4 text-muted mx-auto mb-1" />
            <p className="text-xs text-muted">Analyzed</p>
            <p className="text-sm font-medium text-text-primary">{filesAnalyzed.toLocaleString()}</p>
          </div>
        </div>

        {/* Expandable Exclusions */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setShowExclusions(!showExclusions)}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <span className="text-sm text-text-primary">Why files were excluded?</span>
          {showExclusions ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </motion.button>

        <AnimatePresence>
          {showExclusions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {EXCLUSION_CATEGORIES.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{cat.label}</p>
                    <p className="text-xs text-muted">{cat.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-primary">{cat.count.toLocaleString()}</p>
                    <p className="text-[10px] text-muted">files</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan Details Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
        >
          <span className="text-sm text-primary font-medium">View Full Scan Details</span>
          {showDetails ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
        </motion.button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3"
            >
              <h4 className="text-sm font-semibold text-text-primary">Scan Details</h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-muted">Files Existing on Disk</span>
                  <span className="text-sm font-medium text-text-primary">{(filesAnalyzed + filesExcluded).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-muted">Files Analyzed by Scanner</span>
                  <span className="text-sm font-medium text-success">{filesAnalyzed.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-muted">Files Excluded</span>
                  <span className="text-sm font-medium text-muted">{filesExcluded.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted">Coverage</span>
                  <span className="text-sm font-medium text-primary">{coveragePercent}%</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted leading-relaxed">
                  <strong className="text-text-primary">Why the difference?</strong> Your file explorer shows all files on disk (including system, cache, and dependency files). 
                  The scanner only analyzes files that are relevant to security: your documents, downloads, and user-created files. 
                  System directories like <code className="text-primary">node_modules</code>, <code className="text-primary">.git</code>, and <code className="text-primary">.cache</code> are excluded to improve performance.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default ScanScope;
