import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Shield, Bell } from 'lucide-react';

// Toast notification component for SSE alerts
function ToastAlert({ alert, onDismiss }) {
  const severityColors = {
    critical: 'bg-danger/10 border-danger/30 text-danger',
    high: 'bg-warning/10 border-warning/30 text-warning',
    medium: 'bg-primary/10 border-primary/30 text-primary',
    low: 'bg-secondary/10 border-secondary/30 text-secondary',
  };

  const severityIcons = {
    critical: AlertTriangle,
    high: AlertTriangle,
    medium: Shield,
    low: Bell,
  };

  const Icon = severityIcons[alert.severity] || Bell;
  const colorClass = severityColors[alert.severity] || severityColors.low;

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-xl border ${colorClass} backdrop-blur-xl shadow-lg`}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{alert.type || 'Security Alert'}</p>
          <p className="text-xs mt-1 opacity-80">{alert.description || alert.message || 'New threat detected'}</p>
          {alert.file && (
            <p className="text-xs mt-1 opacity-60 truncate">{alert.file}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default ToastAlert;
