import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  FileText, 
  BarChart3, 
  History, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'threats', label: 'Threats', icon: ShieldAlert },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function Sidebar({ activePage, onPageChange, collapsed, onToggle, threatCount }) {
  return (
    <motion.aside 
      className="flex flex-col bg-surface/80 backdrop-blur-xl border-r border-white/5"
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h1 className="text-sm font-bold text-text-primary tracking-tight">SecureScan</h1>
            <p className="text-[10px] text-muted uppercase tracking-wider">AI Security</p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                isActive 
                  ? 'text-text-primary' 
                  : 'text-muted hover:text-text-primary hover:bg-white/5'
              }`}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-lg border border-primary/20"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              <Icon className={`w-[18px] h-[18px] relative z-10 ${isActive ? 'text-primary' : ''}`} />
              
              {!collapsed && (
                <span className="relative z-10">{item.label}</span>
              )}
              
              {!collapsed && item.id === 'threats' && threatCount > 0 && (
                <span className="relative z-10 ml-auto bg-danger/20 text-danger text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {threatCount}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>

      {/* Status */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-slow" />
          {!collapsed && (
            <span className="text-xs text-muted">System Online</span>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

export default Sidebar;
