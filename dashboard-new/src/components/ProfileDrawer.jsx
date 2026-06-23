import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Shield,
  Mail,
  Clock,
  Activity,
  FileSearch,
  FileText,
  AlertTriangle,
  Moon,
  Sun,
  FolderOpen,
  Bell,
  Settings,
  Database,
  Zap,
  LogOut,
  Edit3,
  ChevronRight,
  CheckCircle
} from 'lucide-react';
import { useTheme } from './ThemeContext';

function ProfileDrawer({ isOpen, onClose, scanStats }) {
  const { theme, setTheme } = useTheme();
  const drawerRef = useRef(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Close on click outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  const formatTime = (date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const drawerVariants = {
    hidden: { x: '100%', opacity: 0.8 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    exit: { 
      x: '100%', 
      opacity: 0.8,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3 }
    })
  };

  // Mock data
  const userData = {
    name: 'Admin User',
    role: 'Security Analyst',
    email: 'admin@securescan.local',
    lastLogin: new Date(Date.now() - 3600000),
    status: 'Online',
    avatar: 'AU'
  };

  const activityData = {
    scansInitiated: scanStats?.totalScans || 24,
    reportsGenerated: 12,
    threatsReviewed: scanStats?.totalThreats || 1485,
    lastScanTime: scanStats?.lastScanDate || new Date(Date.now() - 600000)
  };

  const systemInfo = {
    version: 'v2.1.0',
    database: 'Connected',
    engine: 'Active',
    uptime: '3d 12h 45m'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleBackdropClick}
        >
          {/* Backdrop overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            className="relative w-full max-w-md h-full glass border-l border-white/10 overflow-y-auto"
            style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)' }}
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors text-muted hover:text-text-primary z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 space-y-6">
              {/* User Information */}
              <motion.div
                custom={0}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="text-center pt-4"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white mb-3 shadow-lg shadow-primary/20">
                  {userData.avatar}
                </div>
                <h3 className="text-lg font-bold text-text-primary">{userData.name}</h3>
                <p className="text-sm text-muted">{userData.role}</p>
                
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span className="text-xs font-medium text-success">{userData.status}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-left">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <Mail className="w-4 h-4 text-muted" />
                    <span className="text-sm text-text-primary">{userData.email}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <Clock className="w-4 h-4 text-muted" />
                    <span className="text-sm text-text-primary">Last login: {formatTime(userData.lastLogin)}</span>
                  </div>
                </div>
              </motion.div>

              {/* Security Activity */}
              <motion.div
                custom={1}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  Security Activity
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <FileSearch className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted">Scans</span>
                    </div>
                    <p className="text-xl font-bold text-text-primary">{activityData.scansInitiated}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-secondary" />
                      <span className="text-xs text-muted">Reports</span>
                    </div>
                    <p className="text-xl font-bold text-text-primary">{activityData.reportsGenerated}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="text-xs text-muted">Threats</span>
                    </div>
                    <p className="text-xl font-bold text-text-primary">{activityData.threatsReviewed}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-success" />
                      <span className="text-xs text-muted">Last Scan</span>
                    </div>
                    <p className="text-sm font-bold text-text-primary">{formatTime(activityData.lastScanTime)}</p>
                  </div>
                </div>
              </motion.div>

              {/* Preferences */}
              <motion.div
                custom={2}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" />
                  Preferences
                </h4>
                
                {/* Theme Toggle */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-3">
                  <p className="text-xs text-muted mb-2">Theme</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        theme === 'dark'
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-white/5 border-white/10 text-muted hover:text-text-primary'
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      Dark
                      {theme === 'dark' && <CheckCircle className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        theme === 'light'
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-white/5 border-white/10 text-muted hover:text-text-primary'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      Light
                      {theme === 'light' && <CheckCircle className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  </div>
                </div>

                {/* Notification Status */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 mb-3">
                  <Bell className="w-4 h-4 text-muted" />
                  <div className="flex-1">
                    <p className="text-sm text-text-primary">Notifications</p>
                    <p className="text-xs text-muted">Enabled</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-success" />
                </div>

                {/* Current Folder */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <FolderOpen className="w-4 h-4 text-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">Scan Folder</p>
                    <p className="text-xs text-muted font-mono truncate">/run</p>
                  </div>
                </div>
              </motion.div>

              {/* System Information */}
              <motion.div
                custom={3}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  System Status
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-sm text-text-primary">Scanner Version</span>
                    </div>
                    <span className="text-sm text-muted font-mono">{systemInfo.version}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-secondary" />
                      <span className="text-sm text-text-primary">Database</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-success" />
                      <span className="text-sm text-success">{systemInfo.database}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-success" />
                      <span className="text-sm text-text-primary">Threat Engine</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      <span className="text-sm text-success">{systemInfo.engine}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-warning" />
                      <span className="text-sm text-text-primary">Uptime</span>
                    </div>
                    <span className="text-sm text-muted font-mono">{systemInfo.uptime}</span>
                  </div>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                custom={4}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" />
                  Actions
                </h4>
                
                <button 
                  onClick={() => onToast?.({ type: 'Coming Soon', severity: 'low', description: 'Edit Profile feature will be available in v2.2' })}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                >
                  <Edit3 className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                  <span className="text-sm text-text-primary flex-1">Edit Profile</span>
                  <ChevronRight className="w-4 h-4 text-muted group-hover:text-text-primary transition-colors" />
                </button>
                
                <button 
                  onClick={() => onToast?.({ type: 'Coming Soon', severity: 'low', description: 'Account Settings feature will be available in v2.2' })}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                >
                  <Settings className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                  <span className="text-sm text-text-primary flex-1">Account Settings</span>
                  <ChevronRight className="w-4 h-4 text-muted group-hover:text-text-primary transition-colors" />
                </button>
                
                <button 
                  onClick={() => onToast?.({ type: 'Coming Soon', severity: 'low', description: 'Sign Out feature will be available in v2.2' })}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-danger/10 border border-danger/20 hover:bg-danger/20 transition-all text-left group"
                >
                  <LogOut className="w-4 h-4 text-danger" />
                  <span className="text-sm text-danger flex-1">Sign Out</span>
                  <ChevronRight className="w-4 h-4 text-danger" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ProfileDrawer;
