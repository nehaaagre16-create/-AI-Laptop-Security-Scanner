import React from 'react';
import { motion } from 'framer-motion';
import { Bell, User, Shield } from 'lucide-react';

function Header({ title, lastUpdate }) {
  const timeAgo = () => {
    if (!lastUpdate) return 'Never';
    const diff = Date.now() - lastUpdate.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <header className="h-16 bg-surface/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 border border-success/20">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-success">LIVE</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <span className="text-xs text-muted">
          Last updated: {timeAgo()}
        </span>
        
        <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors text-muted hover:text-text-primary">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger" />
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-text-primary">Admin</p>
            <p className="text-xs text-muted">Security Analyst</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
