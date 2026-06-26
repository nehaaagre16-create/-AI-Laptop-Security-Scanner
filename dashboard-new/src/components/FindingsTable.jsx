import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ChevronLeft, ChevronRight, AlertTriangle, Shield, FileWarning, Info } from 'lucide-react';

function FindingsTable({ findings, showAll = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = showAll ? 10 : 10;

  const filtered = findings.filter(f => {
    const matchesSearch = !searchTerm || 
      (f.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       f.threat_type?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterSeverity === 'all' || f.risk_level === filterSeverity;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getSeverityIcon = (level) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-danger" />;
      case 'high': return <FileWarning className="w-4 h-4 text-warning" />;
      case 'medium': return <Shield className="w-4 h-4 text-primary" />;
      case 'informational': return <Info className="w-4 h-4 text-muted" />;
      default: return <Shield className="w-4 h-4 text-secondary" />;
    }
  };

  const getSeverityStyle = (level) => {
    switch (level) {
      case 'critical': return 'bg-danger/10 text-danger border-danger/30';
      case 'high': return 'bg-warning/10 text-warning border-warning/30';
      case 'medium': return 'bg-primary/10 text-primary border-primary/30';
      case 'informational': return 'bg-white/5 text-muted border-white/10';
      default: return 'bg-secondary/10 text-secondary border-secondary/30';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="glass rounded-xl border border-white/5 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-b border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Scan Findings</h3>
          <p className="text-xs text-muted mt-0.5">{filtered.length} items found</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search findings..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-primary/50 w-48"
            />
          </div>
          
          <select
            value={filterSeverity}
            onChange={(e) => { setFilterSeverity(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="informational">Informational</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">File Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Type</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Severity</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Size</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Detected</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="w-8 h-8 text-muted/50" />
                    <p className="text-sm text-muted">No findings found</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((finding, index) => (
                <motion.tr
                  key={finding.id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {getSeverityIcon(finding.risk_level)}
                      <div>
                        <p className="text-sm text-text-primary font-medium">{finding.file_name || 'Unknown'}</p>
                        <p className="text-xs text-muted truncate max-w-[200px]">{finding.file_path || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-text-primary">{finding.threat_type || 'Unknown'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getSeverityStyle(finding.risk_level)}`}>
                      {finding.risk_level?.charAt(0).toUpperCase() + finding.risk_level?.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-muted">{formatBytes(finding.file_size)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-muted">{formatDate(finding.detected_at)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                      finding.risk_level === 'informational' 
                        ? 'bg-white/5 text-muted border-white/10' 
                        : 'bg-warning/10 text-warning border-warning/20'
                    }`}>
                      {finding.risk_level === 'informational' ? 'Review' : 'Active'}
                    </span>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAll && totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
          <p className="text-xs text-muted">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-text-primary px-2">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FindingsTable;
