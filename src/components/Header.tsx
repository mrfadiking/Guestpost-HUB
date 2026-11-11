import React from 'react';
import { User } from 'firebase/auth';
import { Settings, LogOut, FileSpreadsheet, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onLoadSample: () => void;
  onReset: () => void;
  hasBatchItems: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isLoggingIn,
  onLogin,
  onLogout,
  onOpenSettings,
  onLoadSample,
  onReset,
  hasBatchItems,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-indigo-500/20">
            GP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                GuestPost Hub
              </span>
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-indigo-500/30">
                Simple Batch Mode
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Zero-Configuration Multi-Site Guest Post Publisher
            </p>
          </div>
        </div>

        {/* Action Controls & Auth */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onLoadSample}
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            title="Load sample website URLs and Google Docs URLs to test immediately"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Load Sample Batch
          </button>

          {hasBatchItems && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-slate-400 hover:text-rose-400 bg-slate-800/50 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700/60 transition"
              title="Clear all URLs and table data"
            >
              Reset
            </button>
          )}

          {/* Google Auth Status */}
          {user ? (
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold text-slate-200 leading-none truncate max-w-[120px]">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <span className="text-[10px] text-emerald-400 leading-none flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Docs & Sheets Active
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-700 rounded transition ml-1"
                title="Disconnect Google account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              disabled={isLoggingIn}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs px-3 py-1.5 rounded-lg shadow-sm transition border border-slate-200 disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              {isLoggingIn ? 'Connecting...' : 'Connect Google Docs & Sheets'}
            </button>
          )}

          {/* Admin Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
            title="Administrator Settings & Credentials Vault"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
