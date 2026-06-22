import React from 'react';
import { motion } from 'framer-motion';
import { FileText, FolderOpen, ShieldCheck, AlertTriangle } from 'lucide-react';

function StatsGrid({ filesAnalyzed, foldersAnalyzed, safeFiles, threatsFound }) {
  const stats = [
    {
      label: 'Files Analyzed',
      value: filesAnalyzed,
      icon: FileText,
      color: 'primary',
      tooltip: 'User files scanned for security threats',
    },
    {
      label: 'Folders Analyzed',
      value: foldersAnalyzed,
      icon: FolderOpen,
      color: 'secondary',
      tooltip: 'User folders included in the scan',
    },
    {
      label: 'Safe Files',
      value: safeFiles,
      icon: ShieldCheck,
      color: 'success',
      tooltip: 'Files with no detected threats',
    },
    {
      label: 'Threats Found',
      value: threatsFound,
      icon: AlertTriangle,
      color: threatsFound > 0 ? 'danger' : 'success',
      tooltip: 'Actual security threats detected',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard key={stat.label} stat={stat} index={index} />
      ))}
    </div>
  );
}

function StatCard({ stat, index }) {
  const { label, value, icon: Icon, color, tooltip } = stat;

  const colorMap = {
    primary: 'from-primary/20 to-transparent border-primary/20 hover:border-primary/40',
    secondary: 'from-secondary/20 to-transparent border-secondary/20 hover:border-secondary/40',
    success: 'from-success/20 to-transparent border-success/20 hover:border-success/40',
    warning: 'from-warning/20 to-transparent border-warning/20 hover:border-warning/40',
    danger: 'from-danger/20 to-transparent border-danger/20 hover:border-danger/40',
  };

  const iconColorMap = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`glass rounded-xl p-5 border bg-gradient-to-br ${colorMap[color]} transition-all duration-300 cursor-help`}
      title={tooltip}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-lg bg-white/5 ${iconColorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div>
        <motion.h3
          className="text-2xl font-bold text-text-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 + index * 0.1 }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </motion.h3>
        <p className="text-xs text-muted mt-1">{label}</p>
      </div>
    </motion.div>
  );
}

export default StatsGrid;
