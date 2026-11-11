import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { BatchItem } from '../../types';
import { syncBatchToGoogleSheets, SHEET_COLUMNS, SheetSyncResult, createBatchSpreadsheet } from '../../services/googleSheets';
import { getAccessToken } from '../../services/googleAuth';
import { FileSpreadsheet, FileText, CheckCircle, ExternalLink, RefreshCw, Key, ShieldCheck, Plus, Sparkles, AlertCircle } from 'lucide-react';

interface GoogleIntegrationsSectionProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  spreadsheetUrl: string;
  setSpreadsheetUrl: (url: string) => void;
  items: BatchItem[];
}

export const GoogleIntegrationsSection: React.FC<GoogleIntegrationsSectionProps> = ({
  user,
  onLogin,
  onLogout,
  spreadsheetId,
  setSpreadsheetId,
  spreadsheetUrl,
  setSpreadsheetUrl,
  items,
}) => {
  const [customInput, setCustomInput] = useState(spreadsheetId);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  const handleCreateNewSheet = async () => {
    if (!user) {
      onLogin();
      return;
    }

    setIsCreating(true);
    setStatusMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Authorization token not found. Please re-authenticate.');
      const created = await createBatchSpreadsheet(token);
      setSpreadsheetId(created.id);
      setSpreadsheetUrl(created.url);
      setCustomInput(created.id);
      setStatusMsg({
        success: true,
        text: `New spreadsheet created with 11 frozen header columns!`,
      });
    } catch (err: any) {
      setStatusMsg({ success: false, text: err.message || 'Failed to create spreadsheet' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleManualSync = async () => {
    if (!user) {
      onLogin();
      return;
    }

    if (items.length === 0) {
      setStatusMsg({ success: false, text: 'No batch items currently in memory to sync. Run a batch first.' });
      return;
    }

    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const res: SheetSyncResult = await syncBatchToGoogleSheets(items, spreadsheetId);
      setSpreadsheetId(res.spreadsheetId);
      setSpreadsheetUrl(res.spreadsheetUrl);
      setStatusMsg({ success: true, text: `Successfully synced! ${res.message}` });
    } catch (err: any) {
      setStatusMsg({ success: false, text: err.message || 'Sync failed' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveId = () => {
    const clean = customInput.trim();
    setSpreadsheetId(clean);
    if (clean) {
      setSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${clean}/edit`);
      setStatusMsg({ success: true, text: 'Spreadsheet ID saved successfully.' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Google Workspace Connection Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Google Workspace OAuth Integration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure client-side OAuth connection with Google Docs API and Google Sheets API.
            </p>
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-800 leading-none">{user.displayName || user.email}</p>
                  <span className="text-[11px] text-emerald-600 font-medium">OAuth Active</span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        {/* Scopes Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900">Google Docs API</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Scope: <code>documents.readonly</code>
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Reads authorized original articles, preserves heading hierarchy, extracts hyperlinks and word counts.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900">Google Sheets API</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Scope: <code>spreadsheets</code>
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Automatically synchronizes batch outcomes across 11 standard columns, eliminating duplicates.
              </p>
            </div>
          </div>
        </div>

        {/* Target Spreadsheet Manager */}
        <div className="pt-5 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Connected Google Sheet</h3>
              <p className="text-xs text-slate-500">
                {spreadsheetId ? `ID: ${spreadsheetId}` : 'No Google Sheet currently connected.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition"
                >
                  Open in Google Sheets
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                type="button"
                onClick={handleCreateNewSheet}
                disabled={isCreating}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {isCreating ? 'Creating...' : 'Create Dedicated Sheet'}
              </button>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg transition shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Current Batch'}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste Google Spreadsheet ID or URL..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="text-xs font-mono p-2.5 border border-slate-300 rounded-lg w-full bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSaveId}
              className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg shrink-0 transition"
            >
              Save ID
            </button>
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              statusMsg.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {statusMsg.success ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* 11-Column Schema Inspector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <h3 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Synchronized 11-Column Google Sheet Structure
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          All columns are verified and mapped automatically. No passwords or secret tokens are ever stored in Google Sheets.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs font-mono">
          {SHEET_COLUMNS.map((col, idx) => (
            <div key={col} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="truncate text-slate-700 font-sans font-semibold text-[11px]">{col}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
