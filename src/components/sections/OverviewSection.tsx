import React from 'react';
import { BatchItem } from '../../types';
import { ActivityLogRecord } from '../../services/firestoreService';
import { 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  Globe, 
  FileText, 
  Play, 
  ArrowRight,
  ShieldCheck,
  Server,
  Cloud
} from 'lucide-react';

interface OverviewSectionProps {
  items: BatchItem[];
  activityLogs: ActivityLogRecord[];
  onNavigateToBatch: () => void;
  onLoadSample: () => void;
  isAuthenticated: boolean;
  onLogin: () => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  items,
  activityLogs,
  onNavigateToBatch,
  onLoadSample,
  isAuthenticated,
  onLogin,
}) => {
  const verifiedCount = items.filter(i => i.publicationStatus === 'Verified Live' || i.publicationStatus === 'Published').length;
  const actionRequiredCount = items.filter(i => i.actionRequired || i.accountStatus === 'Manual Action Required' || i.accountStatus === 'Verification Required').length;
  const draftsCount = items.filter(i => i.submissionStatus === 'Draft Created' || i.submissionStatus === 'Submitted').length;
  const uniqueCmsCount = new Set(items.map(i => i.cms).filter(c => c && c !== 'Detecting...' && c !== 'Unknown')).size;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            GuestPost Hub Core Engine Active
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Zero-Configuration Batch Guest Post Publishing
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Submit up to 20 websites paired with corresponding Google Docs articles. Automated CMS discovery, document import, authorized WordPress REST drafts, independent live verification, and 11-column Google Sheets synchronization.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onNavigateToBatch}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-500/25 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Launch Batch Processing
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onLoadSample}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-700 transition"
            >
              Load Sample Batch
            </button>
          </div>
        </div>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Processed</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{items.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Websites in current batch</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified Live</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{verifiedCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Publicly verified articles</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Checkpoints Pending</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{actionRequiredCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting user authorization</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Drafts & Submissions</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{draftsCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Created or under review</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: System Status & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System & Deployment Health */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600" />
            Infrastructure & Integration Status
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Vercel Deployment Spec</p>
                <p className="text-[11px] text-slate-500">Framework: Vite | Output: dist | vercel.json active</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Ready
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Firebase Firestore & Auth</p>
                <p className="text-[11px] text-slate-500">9 Collections configured with secure security rules</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Google Workspace (Docs & Sheets)</p>
                <p className="text-[11px] text-slate-500">
                  {isAuthenticated ? 'Authenticated & token active' : 'Click to connect Google account'}
                </p>
              </div>
              {isAuthenticated ? (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Connected
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  className="text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition"
                >
                  Connect
                </button>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">WordPress REST API Connector</p>
                <p className="text-[11px] text-slate-500">Application passwords & Basic Auth encryption active</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Armed
              </span>
            </div>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Live Engine Activity & Audit Trail
              </h3>
              <span className="text-xs text-slate-400">
                {activityLogs.length} events logged
              </span>
            </div>

            {activityLogs.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-500">No batch executions recorded yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Start a batch submission or click "Load Sample Batch" to see live activity events.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs">
                {activityLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        log.status === 'success' ? 'bg-emerald-500' : log.status === 'warning' ? 'bg-amber-500' : log.status === 'error' ? 'bg-rose-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="font-semibold text-slate-800">{log.action}</p>
                        {log.details && <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
