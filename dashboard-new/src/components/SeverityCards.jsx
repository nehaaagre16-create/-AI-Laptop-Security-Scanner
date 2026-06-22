import React from 'react';
import { motion } from 'framer-motion';
import { AlertOctagon, AlertTriangle, AlertCircle, Info, FileCode, Shield } from 'lucide-react';

function SeverityCards({ critical, high, medium, low, informational, suspicious }) {
  const severities = [
    {
      label: 'Critical',
      count: critical,
      icon: AlertOctagon,
      color: 'danger',
      gradient: 'from-danger/20 to-danger/5',
      border: 'border-danger/30',
      glow: 'glow-danger',
      text: 'text-danger',
      bg: 'bg-danger/10',
    },
    {
      label: 'High',
      count: high,
      icon: AlertTriangle,
      color: 'warning',
      gradient: 'from-warning/20 to-warning/5',
      border: 'border-warning/30',
      glow: 'glow-warning',
      text: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Medium',
      count: medium,
      icon: AlertCircle,
      color: 'primary',
      gradient: 'from-primary/20 to-primary/5',
      border: 'border-primary/30',
      glow: 'glow-primary',
      text: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Low',
      count: low,
      icon: Info,
      color: 'secondary',
      gradient: 'from-secondary/20 to-secondary/5',
      border: 'border-secondary/30',
      glow: 'glow-success',
      text: 'text-secondary',
      bg: 'bg-secondary/10',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Actual Threats */}
      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          Actual Threats
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {severities.map((sev, index) => (
            <motion.div
              key={sev.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
              className={`glass rounded-xl p-5 border ${sev.border} bg-gradient-to-br ${sev.gradient} ${sev.glow} transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${sev.bg} ${sev.text}`}>
                  <sev.icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${sev.text} opacity-70`}>
                  {sev.label}
                </span>
              </div>

              <motion.div
                className="text-3xl font-bold text-text-primary"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1, type: 'spring' }}
              >
                {sev.count}
              </motion.div>

              <p className="text-xs text-muted mt-1">
                {sev.count === 1 ? 'threat detected' : 'threats detected'}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Informational / Suspicious */}
      {(informational > 0 || suspicious > 0) && (
        <div>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5" />
            Informational & Suspicious
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {suspicious > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.03 }}
                className="glass rounded-xl p-5 border border-warning/20 bg-gradient-to-br from-warning/10 to-warning/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-warning/10 text-warning">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-warning opacity-70">
                    Suspicious
                  </span>
                </div>
                <div className="text-3xl font-bold text-text-primary">{suspicious}</div>
                <p className="text-xs text-muted mt-1">
                  {suspicious === 1 ? 'file flagged' : 'files flagged'}
                </p>
              </motion.div>
            )}
            {informational > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.03 }}
                className="glass rounded-xl p-5 border border-white/10 bg-gradient-to-br from-white/5 to-white/0"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-white/5 text-muted">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted opacity-70">
                    Informational
                  </span>
                </div>
                <div className="text-3xl font-bold text-text-primary">{informational}</div>
                <p className="text-xs text-muted mt-1">
                  {informational === 1 ? 'file noted' : 'files noted'}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SeverityCards;
