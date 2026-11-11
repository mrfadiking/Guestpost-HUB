import React, { useState } from 'react';
import { BatchItem } from '../types';
import { syncBatchToGoogleSheets, SheetSyncResult } from '../services/googleSheets';
import { FileSpreadsheet, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Sparkles, Settings2 } from 'lucide-react';

interface GoogleSheetsBarProps {
  items: BatchItem[];
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  spreadsheetUrl: string;
  setSpreadsheetUrl: (url: string) => void;
  autoSync: boolean;
  setAutoSync: (val: boolean) => void;
  isAuthenticated: boolean;
  onLogin: () => void;
}

export const GoogleSheetsBar: React.FC<GoogleSheetsBarProps> = ({
  items,
  spreadsheetId,
  setSpreadsheetId,
  spreadsheetUrl,
  setSpreadsheetUrl,
  autoSync,
  setAutoSync,
  isAuthenticated,
  onLogin,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditingId, setIsEditingId] = useState(false);
  const [inputCustomId, setInputCustomId] = useState(spreadsheetId);

  const handleManualSync = async () => {
    if (!isAuthenticated) {
      onLogin();
      return;
    }

    if (items.length === 0) {
      setErrorMessage('No batch records to synchronize.');
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    setSyncStatus('Synchronizing rows...');

    try {
      const result: SheetSyncResult = await syncBatchToGoogleSheets(items, spreadsheetId);
      setSpreadsheetId(result.spreadsheetId);
      setSpreadsheetUrl(result.spreadsheetUrl);
      setSyncStatus(`Synced successfully! ${result.message}`);
      setTimeout(() => setSyncStatus(null), 6000);
    } catch (err: any) {
      console.error('Sync failed:', err);
      setErrorMessage(err.message || 'Google Sheets sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveCustomId = () => {
    setSpreadsheetId(inputCustomId.trim());
    if (inputCustomId.trim()) {
      setSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${inputCustomId.trim()}/edit`);
    }
    setIsEditingId(false);
  };

  return (
    <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 mb-8 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Status */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Google Sheets Automation
              </h4>
              {spreadsheetUrl ? (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/80 px-2.5 py-0.5 rounded-full transition"
                >
                  Connected Sheet
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Auto-create on sync
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Updates all 11 columns in real-time, matching rows by Website + Google Doc to eliminate duplicates.
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
          {/* Auto-Sync Toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <span>Auto-sync on batch completion</span>
          </label>

          {/* Custom Sheet ID Settings */}
          <button
            type="button"
            onClick={() => setIsEditingId(!isEditingId)}
            className="text-xs text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 border border-slate-200 transition"
            title="Configure target Google Spreadsheet ID"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing || items.length === 0}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              items.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync to Google Sheets'}</span>
          </button>
        </div>
      </div>

      {/* Custom Spreadsheet ID edit input */}
      {isEditingId && (
        <div className="mt-3 pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            value={inputCustomId}
            onChange={(e) => setInputCustomId(e.target.value)}
            placeholder="Paste Google Spreadsheet URL or Sheet ID (e.g. 1BxiMVs...)"
            className="text-xs font-mono p-2 border border-slate-300 rounded-lg w-full bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveCustomId}
              className="text-xs bg-emerald-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-emerald-700"
            >
              Save ID
            </button>
            <button
              type="button"
              onClick={() => setIsEditingId(false)}
              className="text-xs text-slate-600 bg-slate-200 px-3 py-2 rounded-lg font-medium hover:bg-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sync Status Messages */}
      {syncStatus && (
        <div className="mt-3 p-2.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
