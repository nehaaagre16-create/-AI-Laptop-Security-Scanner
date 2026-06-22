class ProgressTracker {
  constructor() {
    this.totalFiles = 0;
    this.processedFiles = 0;
    this.currentFile = '';
    this.currentAction = '';
    this.threatsFound = 0;
    this.activity = [];
    this.startTime = null;
    this.isScanning = false;
  }

  start(totalFiles = 0) {
    this.totalFiles = totalFiles;
    this.processedFiles = 0;
    this.currentFile = '';
    this.currentAction = 'Discovering files...';
    this.threatsFound = 0;
    this.activity = [];
    this.startTime = Date.now();
    this.isScanning = true;
    this.addActivity('Scan started');
  }

  setTotalFiles(count) {
    this.totalFiles = count;
    this.addActivity(`Found ${count.toLocaleString()} files to scan`);
  }

  updateFile(filePath, action) {
    this.processedFiles++;
    this.currentFile = filePath;
    this.currentAction = action || 'Scanning...';
    
    // Only log every 100th file to avoid spam
    if (this.processedFiles % 100 === 0) {
      this.addActivity(`Scanned ${this.processedFiles}/${this.totalFiles} files...`);
    }
  }

  addThreat(threatInfo) {
    this.threatsFound++;
    this.addActivity(`Threat detected: ${threatInfo}`);
  }

  addActivity(message) {
    const timestamp = new Date().toLocaleTimeString();
    this.activity.push(`[${timestamp}] ${message}`);
    
    // Keep only last 20 entries
    if (this.activity.length > 20) {
      this.activity = this.activity.slice(-20);
    }
  }

  getProgress() {
    if (!this.isScanning) return null;
    
    const percentage = this.totalFiles > 0 
      ? Math.round((this.processedFiles / this.totalFiles) * 100)
      : 0;
    
    const elapsed = this.startTime ? Date.now() - this.startTime : 0;
    const estimatedTotal = this.processedFiles > 0 
      ? (elapsed / this.processedFiles) * this.totalFiles 
      : 0;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    
    return {
      totalFiles: this.totalFiles,
      processedFiles: this.processedFiles,
      percentage: Math.min(100, percentage),
      currentFile: this.currentFile,
      currentAction: this.currentAction,
      threatsFound: this.threatsFound,
      activity: this.activity.slice(-5), // Last 5 for dashboard
      elapsedMs: elapsed,
      remainingMs: remaining
    };
  }

  complete() {
    this.isScanning = false;
    this.processedFiles = this.totalFiles;
    this.currentAction = 'Scan complete';
    this.addActivity(`Scan complete. ${this.threatsFound} threats found.`);
  }

  error(message) {
    this.isScanning = false;
    this.addActivity(`Error: ${message}`);
  }
}

module.exports = { ProgressTracker };