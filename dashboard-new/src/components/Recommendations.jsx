import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Shield, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

function Recommendations({ threats, score }) {
  // Generate recommendations dynamically from threat data
  const generateRecs = () => {
    const recs = [];
    
    const criticalCount = threats.filter(t => t.risk_level === 'critical').length;
    const highCount = threats.filter(t => t.risk_level === 'high').length;
    const mediumCount = threats.filter(t => t.risk_level === 'medium').length;
    const lowCount = threats.filter(t => t.risk_level === 'low').length;
    const scriptCount = threats.filter(t => t.threat_type?.includes('script')).length;
    const hiddenCount = threats.filter(t => t.threat_type?.includes('hidden')).length;

    if (criticalCount > 0) {
      recs.push(`Critical: ${criticalCount} critical threat${criticalCount > 1 ? 's' : ''} detected. Immediate review required.`);
    }
    if (highCount > 0) {
      recs.push(`High Risk: ${highCount} high-risk file${highCount > 1 ? 's' : ''} found. Quarantine recommended.`);
    }
    if (mediumCount > 0) {
      recs.push(`Medium Risk: ${mediumCount} suspicious script${mediumCount > 1 ? 's' : ''} detected. Review file origins.`);
    }
    if (lowCount > 0) {
      recs.push(`Low Risk: ${lowCount} hidden file${lowCount > 1 ? 's' : ''} found. Verify legitimacy.`);
    }
    if (scriptCount > 0) {
      recs.push(`Scripts: ${scriptCount} script file${scriptCount > 1 ? 's' : ''} present. Check for unauthorized code.`);
    }
    if (hiddenCount > 0) {
      recs.push(`Hidden Files: ${hiddenCount} hidden file${hiddenCount > 1 ? 's' : ''} detected. Investigate purpose.`);
    }
    if (threats.length === 0) {
      recs.push('No threats detected. Continue regular scanning to maintain security.');
      recs.push('Enable real-time monitoring for continuous protection.');
    }
    
    recs.push('Schedule automated scans every 24 hours for ongoing protection.');
    recs.push('Keep your operating system and security tools updated.');
    
    return recs;
  };

  const recs = generateRecs();

  const getScoreAdvice = (s) => {
    if (s >= 90) return { icon: CheckCircle, color: 'text-success', text: 'Your system is well protected. Continue monitoring.' };
    if (s >= 70) return { icon: Shield, color: 'text-primary', text: 'Good security posture. Address medium-risk items.' };
    if (s >= 40) return { icon: AlertTriangle, color: 'text-warning', text: 'Warning: Several threats detected. Review recommended actions.' };
    return { icon: AlertTriangle, color: 'text-danger', text: 'Critical: Immediate action required. Multiple threats found.' };
  };

  const advice = getScoreAdvice(score);
  const AdviceIcon = advice.icon;

  return (
    <div className="glass rounded-xl border border-white/5 overflow-hidden">
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Security Recommendations</h3>
            <p className="text-xs text-muted mt-0.5">Based on latest scan: {threats.length} threat{threats.length !== 1 ? 's' : ''} detected</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Score Alert */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10"
        >
          <AdviceIcon className={`w-5 h-5 mt-0.5 ${advice.color}`} />
          <div>
            <p className={`text-sm font-medium ${advice.color}`}>
              Security Score: {score}/100
            </p>
            <p className="text-xs text-muted mt-1">{advice.text}</p>
          </div>
        </motion.div>

        {/* Dynamic Recommendations List */}
        <div className="space-y-2">
          {recs.map((rec, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors group cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">{index + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-text-primary group-hover:text-primary transition-colors">
                  {rec}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </motion.div>
          ))}
        </div>

        {/* Risk Reduction Tips */}
        <div className="pt-4 border-t border-white/5">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Risk Reduction Tips</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TipCard title="Update Regularly" description="Keep OS and apps patched" color="primary" />
            <TipCard title="Backup Data" description="Maintain offline backups" color="secondary" />
            <TipCard title="Use Strong Passwords" description="Enable 2FA where possible" color="success" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TipCard({ title, description, color }) {
  const colorMap = {
    primary: 'border-primary/20 hover:border-primary/40',
    secondary: 'border-secondary/20 hover:border-secondary/40',
    success: 'border-success/20 hover:border-success/40',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-3 rounded-lg border bg-white/5 ${colorMap[color]} transition-all cursor-pointer`}
    >
      <p className="text-xs font-medium text-text-primary">{title}</p>
      <p className="text-[11px] text-muted mt-1">{description}</p>
    </motion.div>
  );
}

export default Recommendations;
