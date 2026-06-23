import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Info,
  Download,
  FileSpreadsheet,
  FilePlus,
  Calendar,
  Clock,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  FileDown,
  Trash2,
  Eye,
  Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API_BASE = '';

// ── Reusable Components ───────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, color, subtext, delay = 0 }) {
  const colorMap = {
    primary: 'from-primary/20 to-transparent border-primary/20 text-primary',
    success: 'from-success/20 to-transparent border-success/20 text-success',
    warning: 'from-warning/20 to-transparent border-warning/20 text-warning',
    danger: 'from-danger/20 to-transparent border-danger/20 text-danger',
    muted: 'from-white/10 to-transparent border-white/10 text-muted',
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
        <h3 className="text-2xl font-bold text-text-primary">{value.toLocaleString()}</h3>
        <p className="text-xs text-muted mt-1">{label}</p>
        {subtext && <p className="text-xs text-muted/60 mt-0.5">{subtext}</p>}
      </div>
    </motion.div>
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

// ── Reports Page ─────────────────────────────────────────────────

function Reports() {
  const [scanSummary, setScanSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const [threatData, setThreatData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFormat, setFilterFormat] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingCSV, setGeneratingCSV] = useState(false);
  const itemsPerPage = 5;

  // Fetch real data
  const fetchData = async () => {
    try {
      setError(null);
      
      // Fetch current scan status
      const scanRes = await fetch(`${API_BASE}/scan/status`);
      if (!scanRes.ok) throw new Error('Failed to fetch scan data');
      const scanData = await scanRes.json();
      
      if (scanData.status === 'completed' && scanData.report) {
        const summary = scanData.report.summary;
        const metrics = scanData.report.metrics;
        
        setScanSummary({
          filesAnalyzed: metrics.files_scanned || 0,
          safeFiles: metrics.safe_files || 0,
          informationalFiles: metrics.informational_count || 0,
          threatsFound: summary.threats_found || 0,
          scanDate: summary.scan_date,
          scanFolder: summary.scan_path || '/home',
          scanDuration: `${summary.scan_duration_ms}ms`,
        });

        // Build threat data for chart
        const rd = scanData.report.risk_distribution || {};
        setThreatData([
          { name: 'Critical', count: rd.critical || 0, color: '#EF4444' },
          { name: 'High', count: rd.high || 0, color: '#F59E0B' },
          { name: 'Medium', count: rd.medium || 0, color: '#8B5CF6' },
          { name: 'Low', count: rd.low || 0, color: '#6366F1' },
          { name: 'Safe', count: metrics.safe_files || 0, color: '#22C55E' },
          { name: 'Info', count: metrics.informational_count || 0, color: '#94A3B8' },
        ]);
      }

      // Fetch reports history (for the reports table)
      const historyRes = await fetch(`${API_BASE}/reports/history`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        // Convert scan history to report format
        const formattedReports = historyData.map((scan, idx) => ({
          id: `RPT-${String(scan.id).padStart(3, '0')}`,
          format: idx % 2 === 0 ? 'pdf' : 'csv',
          generatedDate: scan.scan_date,
          scanFolder: '/home',
          filesAnalyzed: scan.files_scanned,
          threatsFound: scan.dangerous_files || 0,
          securityScore: scan.security_score,
          size: idx % 2 === 0 ? '1.2 MB' : '856 KB',
        }));
        setReports(formattedReports);
      }
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

  const filtered = reports.filter((r) => {
    const matchesSearch =
      !searchTerm ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.scanFolder.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFormat = filterFormat === 'all' || r.format === filterFormat;
    return matchesSearch && matchesFormat;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleGeneratePDF = () => {
    setGeneratingPDF(true);
    setTimeout(() => {
      const newReport = {
        id: `RPT-${String(reports.length + 1).padStart(3, '0')}`,
        format: 'pdf',
        generatedDate: new Date().toISOString(),
        scanFolder: scanSummary?.scanFolder || '/home',
        filesAnalyzed: scanSummary?.filesAnalyzed || 0,
        threatsFound: scanSummary?.threatsFound || 0,
        securityScore: scanSummary?.threatsFound > 0 ? 85 : 100,
        size: '1.2 MB',
      };
      setReports([newReport, ...reports]);
      setGeneratingPDF(false);
      setCurrentPage(1);
    }, 2000);
  };

  const handleGenerateCSV = () => {
    setGeneratingCSV(true);
    setTimeout(() => {
      const newReport = {
        id: `RPT-${String(reports.length + 1).padStart(3, '0')}`,
        format: 'csv',
        generatedDate: new Date().toISOString(),
        scanFolder: scanSummary?.scanFolder || '/home',
        filesAnalyzed: scanSummary?.filesAnalyzed || 0,
        threatsFound: scanSummary?.threatsFound || 0,
        securityScore: scanSummary?.threatsFound > 0 ? 85 : 100,
        size: '856 KB',
      };
      setReports([newReport, ...reports]);
      setGeneratingCSV(false);
      setCurrentPage(1);
    }, 1500);
  };

  const handleDelete = (id) => {
    setReports(reports.filter((r) => r.id !== id));
  };

  const handleDownload = (report) => {
    const blob = new Blob([`Report ${report.id}\nFormat: ${report.format.toUpperCase()}\nGenerated: ${formatDate(report.generatedDate)}`], {
      type: report.format === 'pdf' ? 'application/pdf' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.id}.${report.format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <p className="text-muted text-sm">Loading reports...</p>
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
          <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
          <p className="text-sm text-muted mt-1">Generate and manage security scan reports</p>
        </div>
      </motion.div>

      {/* Scan Summary Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Files Analyzed"
            value={scanSummary?.filesAnalyzed || 0}
            icon={FileText}
            color="primary"
            subtext={scanSummary ? `Last scan: ${formatRelativeDate(scanSummary.scanDate)}` : 'No scan data'}
            delay={0}
          />
          <SummaryCard
            label="Safe Files"
            value={scanSummary?.safeFiles || 0}
            icon={ShieldCheck}
            color="success"
            subtext="No threats detected"
            delay={0.1}
          />
          <SummaryCard
            label="Informational Files"
            value={scanSummary?.informationalFiles || 0}
            icon={Info}
            color="warning"
            subtext="Flagged for review"
            delay={0.2}
          />
          <SummaryCard
            label="Threats Found"
            value={scanSummary?.threatsFound || 0}
            icon={AlertTriangle}
            color={scanSummary?.threatsFound > 0 ? 'danger' : 'success'}
            subtext={scanSummary?.threatsFound > 0 ? 'Action required' : 'System secure'}
            delay={0.3}
          />
        </div>
      </motion.div>

      {/* Report Generation Section */}
      <motion.div variants={itemVariants}>
        <div className="glass rounded-xl p-6 border border-white/5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FilePlus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Generate Report</h3>
                <p className="text-sm text-muted">Create a new report from the latest scan data</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                icon={FileDown}
                onClick={handleGeneratePDF}
                loading={generatingPDF}
              >
                {generatingPDF ? 'Generating PDF...' : 'Generate PDF'}
              </Button>
              <Button
                variant="secondary"
                icon={FileSpreadsheet}
                onClick={handleGenerateCSV}
                loading={generatingCSV}
              >
                {generatingCSV ? 'Generating CSV...' : 'Generate CSV'}
              </Button>
            </div>
          </div>

          {/* Mini Chart */}
          <div className="mt-6 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={threatData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {threatData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Recent Reports Table */}
      <motion.div variants={itemVariants}>
        <div className="glass rounded-xl border border-white/5 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-b border-white/5">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Recent Reports</h3>
              <p className="text-sm text-muted mt-0.5">{filtered.length} reports generated</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-primary/50 w-48"
                />
              </div>
              <select
                value={filterFormat}
                onChange={(e) => {
                  setFilterFormat(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50"
              >
                <option value="all">All Formats</option>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Report ID</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Format</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Generated</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Scan Folder</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Files</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Score</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Size</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12">
                      <EmptyState
                        icon={FileText}
                        title="No Reports Found"
                        description="Generate your first report using the buttons above. Reports will appear here once created."
                        action={
                          <Button variant="primary" icon={FilePlus} onClick={handleGeneratePDF}>
                            Generate First Report
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  paginated.map((report, index) => (
                    <motion.tr
                      key={report.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-text-primary">{report.id}</span>
                      </td>
                      <td className="px-5 py-3">
                        <Badge color={report.format === 'pdf' ? 'danger' : 'success'}>
                          {report.format.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted" />
                          <span className="text-sm text-muted">{formatRelativeDate(report.generatedDate)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-3.5 h-3.5 text-muted" />
                          <span className="text-sm text-muted truncate max-w-[150px]">{report.scanFolder}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-text-primary">{report.filesAnalyzed.toLocaleString()}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                            report.securityScore >= 90
                              ? 'bg-success/10 text-success border-success/30'
                              : report.securityScore >= 70
                              ? 'bg-warning/10 text-warning border-warning/30'
                              : 'bg-danger/10 text-danger border-danger/30'
                          }`}
                        >
                          {report.securityScore}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-muted">{report.size}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownload(report)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-primary transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-danger transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
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

export default Reports;
