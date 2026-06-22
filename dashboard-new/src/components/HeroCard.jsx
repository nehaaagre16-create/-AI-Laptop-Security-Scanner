import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileSearch, AlertTriangle, Activity, BarChart3, FolderOpen } from 'lucide-react';

function HeroCard({ score, progress, filesAnalyzed, threatsFound, scanDuration, coveragePercent, excludedFiles, currentFolder }) {
  const scoreColor = (s) => {
    if (s >= 85) return 'text-success';
    if (s >= 70) return 'text-warning';
    if (s >= 50) return 'text-warning';
    return 'text-danger';
  };

  const scoreLabel = (s) => {
    if (s >= 90) return 'Excellent';
    if (s >= 70) return 'Good';
    if (s >= 40) return 'Warning';
    return 'Dangerous';
  };

  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="glass rounded-2xl p-6 glow-primary">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Score Circle */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="8"
              />
              <motion.circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                className={`text-3xl font-bold ${scoreColor(score)}`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                {score}
              </motion.span>
              <span className="text-[10px] text-muted uppercase tracking-wider">Score</span>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-text-primary">Security Overview</h3>
            <p className={`text-sm font-medium mt-1 ${scoreColor(score)}`}>
              {scoreLabel(score)}
            </p>
            <p className="text-xs text-muted mt-2">
              {scanDuration > 0 ? `Scan completed in ${(scanDuration / 1000).toFixed(1)}s` : 'Scan in progress...'}
            </p>
            <div className="flex items-center gap-2 mt-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
              <FolderOpen className="w-3 h-3 text-muted" />
              <span className="text-xs text-muted font-mono truncate">{currentFolder}</span>
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem 
            icon={FileSearch} 
            label="Files Analyzed" 
            value={filesAnalyzed.toLocaleString()} 
            color="primary"
            tooltip="User-created files scanned for threats"
          />
          <StatItem 
            icon={Shield} 
            label="Scan Progress" 
            value={`${progress}%`} 
            color="secondary"
            tooltip="Percentage of analysis complete"
          />
          <StatItem 
            icon={AlertTriangle} 
            label="Threats Found" 
            value={threatsFound.toLocaleString()} 
            color={threatsFound > 0 ? 'danger' : 'success'}
            tooltip="Actual security threats detected"
          />
          <StatItem 
            icon={Activity} 
            label="System Status" 
            value={threatsFound > 0 ? 'At Risk' : 'Protected'} 
            color={threatsFound > 0 ? 'warning' : 'success'}
            tooltip="Overall security status"
          />
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value, color, tooltip }) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    muted: 'bg-white/5 text-muted border-white/10',
  };

  return (
    <motion.div 
      className={`p-4 rounded-xl border ${colorMap[color]} flex flex-col items-center justify-center text-center relative group cursor-help`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      title={tooltip}
    >
      <Icon className="w-5 h-5 mb-2 opacity-80" />
      <span className="text-xl font-bold">{value}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-70 mt-1">{label}</span>
    </motion.div>
  );
}

export default HeroCard;
