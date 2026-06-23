import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Calendar,
  Clock,
  FolderOpen,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  BarChart3,
  History,
  X,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const API_BASE = '';

// ── Reusable Components ───────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, subtext, delay = 0 }) {
  const colorMap = {
    primary: 'from-primary/20 to-transparent border-primary/20 text-primary',
    success: 'from-success/20 to-transparent border-success/20 text-success',
    warning: 'from-warning/20 to-transparent border-warning/20 text-warning',
    danger: 'from-danger/20 to-transparent border-danger/20 text-danger',
    secondary: 'from-secondary/20 to-transparent border-secondary/20 text-secondary',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`glass rounded-xl p-5 border bg-gradient-to-br ${colorMap[color]} transition-all duration-300`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-lg bg-white/5`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
        <p className="text-xs text-muted mt-1">{label}</p>
        {subtext && <p className="text-xs text-muted/60 mt-0.5">{subtext}</p>}
      </div>
    </motion.div>
  );
}

function Badge({ children, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary/10 text-primary border-primary/30',
    success: 'bg-success/10 text-success border-success/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
    danger: 'bg-danger/10 text-danger border-danger/30',
    muted: 'bg-white/5 text-muted border-white/10',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
}

function Button({ children, onClick, variant = 'primary', icon: Icon, disabled = false, loading = false }) {
  const variants = {
    primary: 'bg-primary hover:bg-primary/80 text-white border-primary/50',
    secondary: 'bg-white/5 hover:bg-white/10 text-text-primary border-white/10',
    danger: 'bg-danger/10 hover:bg-danger/20 text-danger border-danger/30',
    ghost: 'bg-transparent hover:bg-white/5 text-muted border-transparent',
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]}`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </motion.button>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-12 text-center border border-white/5"
    >
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-muted/50" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-muted max-w-md mx-auto mb-6">{description}</p>
      {action}
    </motion.div>
  );
}

// ── Format Utilities ──────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms) {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

// ── History Page ─────────────────────────────────────────────────

function HistoryPage() {
  const [scans, setScans] = useState([]);
  const [scoreTrend, setScoreTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 6;

  // Fetch real data
  const fetchData = async () => {
    try {
      setError(null);
      
      const res = await fetch(`${API_BASE}/reports/history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      
      // Format scan data
      const formattedScans = data.map((scan) => ({
        id: scan.id,
        scanDate: scan.scan_date,
        folder: '/home',
        filesAnalyzed: scan.files_scanned,
        foldersAnalyzed: scan.folders_scanned,
        scanDuration: scan.scan_duration_ms,
        threatsFound: scan.dangerous_files || 0,
        securityScore: scan.security_score,
        status: scan.status,
      }));
      
      setScans(formattedScans);

      // Build score trend from history
      const trend = data.slice(0, 12).reverse().map((scan) => ({
        date: new Date(scan.scan_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: scan.security_score,
      }));
      setScoreTrend(trend);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Calculate statistics from real data
  const totalScans = scans.length;
  const avgScanTime = totalScans > 0 
    ? Math.round(scans.reduce((acc, s) => acc + s.scanDuration, 0) / totalScans / 1000)
    : 0;
  const totalFilesAnalyzed = scans.reduce((acc, s) => acc + s.filesAnalyzed, 0);
  const totalThreatsFound = scans.reduce((acc, s) => acc + s.threatsFound, 0);

  // Filter logic
  const filtered = scans.filter((scan) => {
    const matchesSearch =
      !searchTerm ||
      scan.id.toString().includes(searchTerm) ||
      scan.folder.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || scan.status === statusFilter;

    let matchesDate = true;
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      const scanDate = new Date(scan.scanDate);
      matchesDate = scanDate >= fromDate;
    }
    if (dateTo && matchesDate) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59);
      const scanDate = new Date(scan.scanDate);
      matchesDate = scanDate <= toDate;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || dateFrom || dateTo || statusFilter !== 'all';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted text-sm">Loading scan history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl p-8 text-center border border-danger/20">
        <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">Error Loading Data</h3>
        <p className="text-sm text-muted mb-4">{error}</p>
        <Button variant="primary" onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Page Title */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Scan History</h1>
          <p className="text-sm text-muted mt-1">View and analyze past security scans</p>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Scans"
            value={totalScans}
            icon={History}
            color="primary"
            subtext="All time scans"
            delay={0}
          />
          <StatCard
            label="Avg Scan Time"
            value={`${avgScanTime}s`}
            icon={Clock}
            color="secondary"
            subtext="Per scan average"
            delay={0.1}
          />
          <StatCard
            label="Total Files Analyzed"
            value={totalFilesAnalyzed.toLocaleString()}
            icon={FileText}
            color="success"
            subtext="Across all scans"
            delay={0.2}
          />
          <StatCard
            label="Total Threats Found"
            value={totalThreatsFound}
            icon={AlertTriangle}
            color={totalThreatsFound > 0 ? 'warning' : 'success'}
            subtext={totalThreatsFound > 0 ? 'Review recommended' : 'System secure'}
            delay={0.3}
          />
        </div>
      </motion.div>

      {/* Score Trend Chart */}
      {scoreTrend.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="glass rounded-xl p-6 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-text-primary">Security Score Trend</h3>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreTrend}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#F9FAFB',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fill="url(#scoreGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters Section */}
      <motion.div variants={itemVariants}>
        <div className="glass rounded-xl p-5 border border-white/5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  placeholder="Search by scan ID or folder..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-primary/50 w-full"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  showFilters || hasActiveFilters
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-white/5 text-muted border-white/10 hover:bg-white/10'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:text-text-primary hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/5"
            >
              <div>
                <label className="text-xs text-muted mb-1.5 block">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50 w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50 w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50 w-full"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="scanning">Scanning</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Scan History Table */}
      <motion.div variants={itemVariants}>
        <div className="glass rounded-xl border border-white/5 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-b border-white/5">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Scan History</h3>
              <p className="text-sm text-muted mt-0.5">
                {filtered.length} scans found
                {hasActiveFilters && ' (filtered)'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                    Scan ID
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                    Folder
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                    Files
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                    Threats
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                    Score
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12">
                      <EmptyState
                        icon={History}
                        title="No Scans Found"
                        description="No scans match your current filters. Try adjusting your search criteria or clear the filters."
                        action={
                          hasActiveFilters ? (
                            <Button variant="secondary" icon={RotateCcw} onClick={clearFilters}>
                              Clear Filters
                            </Button>
                          ) : null
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  paginated.map((scan, index) => (
                    <motion.tr
                      key={scan.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-text-primary">#{scan.id}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted" />
                          <span className="text-sm text-muted">{formatRelativeDate(scan.scanDate)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-3.5 h-3.5 text-muted" />
                          <span className="text-sm text-muted truncate max-w-[150px]">{scan.folder}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-text-primary">
                          {scan.filesAnalyzed.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-muted" />
                          <span className="text-sm text-muted">{formatDuration(scan.scanDuration)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-sm font-medium ${
                            scan.threatsFound > 0 ? 'text-danger' : 'text-success'
                          }`}
                        >
                          {scan.threatsFound}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                            scan.securityScore >= 90
                              ? 'bg-success/10 text-success border-success/30'
                              : scan.securityScore >= 70
                              ? 'bg-warning/10 text-warning border-warning/30'
                              : 'bg-danger/10 text-danger border-danger/30'
                          }`}
                        >
                          {scan.securityScore}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {scan.status === 'completed' ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-success" />
                              <Badge color="success">Completed</Badge>
                            </>
                          ) : scan.status === 'scanning' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                              <Badge color="primary">Scanning</Badge>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-danger" />
                              <Badge color="danger">Error</Badge>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <p className="text-xs text-muted">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-muted"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-text-primary px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-muted"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default HistoryPage;
