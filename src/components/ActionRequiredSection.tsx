import React from 'react';
import { BatchItem } from '../types';
import { AlertTriangle, ExternalLink, Key, Mail, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ActionRequiredSectionProps {
  items: BatchItem[];
  onOpenSettingsWithDomain: (domain: string) => void;
  onMarkVerified: (itemId: string) => void;
  onRetryItem: (item: BatchItem) => void;
}

export const ActionRequiredSection: React.FC<ActionRequiredSectionProps> = ({
  items,
  onOpenSettingsWithDomain,
  onMarkVerified,
  onRetryItem,
}) => {
  const pendingActions = items.filter(
    (item) => item.actionRequired || item.accountStatus === 'Manual Action Required' || item.accountStatus === 'Verification Required'
  );

  if (pendingActions.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-5 mb-8 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-200/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-950">
              Action Required ({pendingActions.length})
            </h3>
            <p className="text-xs text-amber-800">
              These publisher sites require genuine user involvement before automated submission can proceed.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold bg-amber-200/60 text-amber-900 px-2.5 py-1 rounded-full">
          Manual Checkpoints
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {pendingActions.map((item) => {
          const action = item.actionRequired;
          const isEmail = action?.type === 'email_verification' || item.accountStatus === 'Verification Required';
          const isAuth = action?.type === 'auth_missing';
          const isUnsupported = action?.type === 'unsupported_cms';

          return (
            <div
              key={item.id}
              className="bg-white border border-amber-200 rounded-xl p-4 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-xs text-slate-800 truncate">
                    #{item.lineIndex} {item.domain}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isEmail 
                      ? 'bg-blue-100 text-blue-800' 
                      : isAuth 
                      ? 'bg-amber-100 text-amber-800' 
                      : isUnsupported 
                      ? 'bg-slate-100 text-slate-700' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {action?.title || item.accountStatus}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                  {action?.description || item.errorDetails || 'Manual publisher approval or authentication checkpoint pending.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 mt-2">
                {isAuth && (
                  <button
                    type="button"
                    onClick={() => onOpenSettingsWithDomain(item.domain)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition shadow-xs"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Configure App Password
                  </button>
                )}

                {isEmail && (
                  <button
                    type="button"
                    onClick={() => onMarkVerified(item.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Email Verified
                  </button>
                )}

                {action?.portalUrl && (
                  <a
                    href={action.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition border border-slate-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Contributor Portal
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => onRetryItem(item)}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition ml-auto"
                  title="Retry inspection and processing"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
