import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Settings, X, Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';

function Header({ title, lastUpdate, onPageChange, alerts = [], onDismissAlert }) {
  const [showNotifications, setShowNotifications] = useState(false);

  const timeAgo = () => {
    if (!lastUpdate) return 'Never';
    const diff = Date.now() - lastUpdate.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical': return AlertTriangle;
      case 'high': return AlertTriangle;
      case 'medium': return Shield;
      case 'low': return CheckCircle;
      default: return Info;
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-danger bg-danger/10 border-danger/20';
      case 'high': return 'text-warning bg-warning/10 border-warning/20';
      case 'medium': return 'text-primary bg-primary/10 border-primary/20';
      case 'low': return 'text-success bg-success/10 border-success/20';
      default: return 'text-muted bg-white/5 border-white/10';
    }
  };

  return (
    <header className="h-16 bg-surface/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 flex-shrink-0 relative">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
      </div>

      <div className="flex items-center gap-6">
        
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-white/5 transition-colors text-muted hover:text-text-primary"
          >
            <Bell className="w-[18px] h-[18px]" />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-12 w-80 bg-surface border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4 text-muted" />
                  </button>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-muted mx-auto mb-2" />
                      <p className="text-sm text-muted">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {alerts.slice().reverse().map((alert) => {
                        const AlertIcon = getAlertIcon(alert.severity);
                        const colorClass = getAlertColor(alert.severity);
                        return (
                          <div 
                            key={alert.id} 
                            className="p-3 hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-1.5 rounded-lg ${colorClass}`}>
                                <AlertIcon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary">{alert.type}</p>
                                <p className="text-xs text-muted mt-0.5">{alert.description}</p>
                                <p className="text-[10px] text-muted/50 mt-1">
                                  {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Just now'}
                                </p>
                              </div>
                              <button
                                onClick={() => onDismissAlert?.(alert.id)}
                                className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                              >
                                <X className="w-3 h-3 text-muted" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <button 
          onClick={() => onPageChange?.('settings')}
          className="flex items-center gap-3 pl-4 border-l border-white/5 hover:bg-white/5 rounded-lg px-3 py-2 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-text-primary">Settings</p>
            <p className="text-xs text-muted">Configuration</p>
          </div>
        </button>
      </div>
    </header>
  );
}

export default Header;
