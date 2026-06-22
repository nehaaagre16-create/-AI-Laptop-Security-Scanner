import React from 'react';
import { motion } from 'framer-motion';
import { Settings, FolderOpen, CheckCircle, XCircle, Info, FileCheck, FileX, Zap } from 'lucide-react';

const INCLUDED_ITEMS = [
  { label: 'Documents', icon: FileCheck },
  { label: 'Source Code', icon: FileCheck },
  { label: 'Scripts', icon: FileCheck },
  { label: 'Executables', icon: FileCheck },
  { label: 'User-Created Files', icon: FileCheck },
];

const EXCLUDED_ITEMS = [
  { label: 'node_modules', icon: FileX },
  { label: '.git', icon: FileX },
  { label: '.cache', icon: FileX },
  { label: '.npm', icon: FileX },
  { label: '.local', icon: FileX },
  { label: 'build/dist', icon: FileX },
  { label: 'IDE Configuration Files', icon: FileX },
];

function ScanConfigCard({ currentFolder, analyzedFiles, excludedFiles, scanMode = 'User File Analysis' }) {
  const totalFiles = analyzedFiles + excludedFiles;
  const coveragePercent = totalFiles > 0 ? Math.round((analyzedFiles / totalFiles) * 100) : 0;

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
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Scan Configuration</h3>
            <p className="text-xs text-muted mt-0.5">What the scanner analyzes and excludes</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
          <Zap className="w-3.5 h-3.5 text-success" />
          <span className="text-xs font-medium text-success">Active Scan Mode</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Current Folder & Scan Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <FolderOpen className="w-4 h-4 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted uppercase tracking-wider">Current Folder</p>
              <p className="text-sm text-text-primary font-mono truncate">{currentFolder}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <Zap className="w-4 h-4 text-secondary" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted uppercase tracking-wider">Scan Mode</p>
              <p className="text-sm text-text-primary">{scanMode}</p>
            </div>
          </div>
        </div>

        {/* Live Values */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-success/5 border border-success/20 text-center">
            <p className="text-xs text-success font-medium uppercase tracking-wider">Included Files</p>
            <p className="text-xl font-bold text-text-primary mt-1">{analyzedFiles.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <p className="text-xs text-muted font-medium uppercase tracking-wider">Excluded Files</p>
            <p className="text-xl font-bold text-text-primary mt-1">{excludedFiles.toLocaleString()}</p>
          </div>
        </div>

        {/* Included & Excluded Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Included */}
          <div className="p-4 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">Included</span>
              <span className="text-xs text-muted ml-auto">{coveragePercent}% coverage</span>
            </div>
            <div className="space-y-2">
              {INCLUDED_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-text-primary">
                  <item.icon className="w-3.5 h-3.5 text-success" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Excluded */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4 text-muted" />
              <span className="text-sm font-medium text-muted">Excluded</span>
              <span className="text-xs text-muted ml-auto">{100 - coveragePercent}% skipped</span>
            </div>
            <div className="space-y-2">
              {EXCLUDED_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-muted">
                  <item.icon className="w-3.5 h-3.5 text-muted" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info Tooltip */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted leading-relaxed">
            The scanner focuses on user-created and potentially risky files. System, dependency, cache, and build directories are excluded to improve performance and reduce false positives.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default ScanConfigCard;
