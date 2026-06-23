import React from 'react';
import { motion } from 'framer-motion';

function ToggleSwitch({ enabled, onChange, label, description, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/15 transition-all">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`p-2 rounded-lg ${enabled ? 'bg-primary/10' : 'bg-white/5'} transition-colors`}>
            <Icon className={`w-5 h-5 ${enabled ? 'text-primary' : 'text-muted'} transition-colors`} />
          </div>
        )}
        <div>
          <h4 className="text-sm font-medium text-text-primary">{label}</h4>
          {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
          enabled ? 'bg-primary' : 'bg-white/10'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <motion.div
          className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ x: enabled ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

export default ToggleSwitch;
