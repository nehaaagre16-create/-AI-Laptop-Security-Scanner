import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function ChartsSection({ riskDistribution, threats, scanHistory }) {
  const { critical = 0, high = 0, medium = 0, low = 0, safe = 0, informational = 0, suspicious = 0 } = riskDistribution;

  const pieData = [
    { name: 'Safe', value: safe, color: '#22C55E' },
    { name: 'Informational', value: informational, color: '#94A3B8' },
    { name: 'Suspicious', value: suspicious, color: '#F59E0B' },
    { name: 'Low', value: low, color: '#6366F1' },
    { name: 'Medium', value: medium, color: '#8B5CF6' },
    { name: 'High', value: high, color: '#F97316' },
    { name: 'Critical', value: critical, color: '#EF4444' },
  ].filter(d => d.value > 0);

  // Use real historical scan data for timeline
  const timelineData = React.useMemo(() => {
    if (scanHistory && scanHistory.length > 0) {
      // Sort by date and take last 10 scans
      const sorted = [...scanHistory].sort((a, b) => 
        new Date(a.scan_date) - new Date(b.scan_date)
      ).slice(-10);
      
      return sorted.map((scan, i) => ({
        time: new Date(scan.scan_date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit'
        }),
        threats: scan.threats_found || 0,
        files: scan.files_scanned || 0,
      }));
    }
    
    // Fallback if no history
    if (!threats || threats.length === 0) {
      return [
        { time: 'No data', threats: 0 },
      ];
    }
    
    return [
      { time: 'Current', threats: threats.length },
    ];
  }, [scanHistory, threats]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-white/10 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-sm text-text-primary font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted">{payload[0].value.toLocaleString()} files</p>
        </div>
      );
    }
    return null;
  };

  const AreaTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-white/10 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-sm text-muted">{label}</p>
          <p className="text-sm text-danger font-medium">{payload[0].value} threats</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Risk Distribution Doughnut */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-xl p-6 border border-white/5"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-text-primary">Risk Distribution</h3>
          <span className="text-xs text-muted">By severity</span>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 justify-center">
          {pieData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-muted">{item.name}</span>
              <span className="text-xs text-text-primary font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Threat Timeline Area Chart - REAL HISTORICAL DATA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-xl p-6 border border-white/5"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-text-primary">Threat Timeline</h3>
          <span className="text-xs text-muted">
            {scanHistory && scanHistory.length > 0 ? 'From scan history' : 'Real-time'}
          </span>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="time" 
                stroke="#94A3B8" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#94A3B8" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<AreaTooltip />} />
              <Area
                type="monotone"
                dataKey="threats"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#threatGradient)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}

export default ChartsSection;