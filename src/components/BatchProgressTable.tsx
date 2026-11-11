import React from 'react';
import { BatchItem, AccountStatus, ContentStatus, SubmissionStatus, PublicationStatus, VerificationStatus } from '../types';
import { 
  ExternalLink, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  CheckCheck, 
  ShieldCheck, 
  Info,
  Globe,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface BatchProgressTableProps {
  items: BatchItem[];
  isProcessing: boolean;
  onPreviewArticle: (item: BatchItem) => void;
  onVerifyUrl: (item: BatchItem) => void;
  onRetryItem: (item: BatchItem) => void;
}

export const BatchProgressTable: React.FC<BatchProgressTableProps> = ({
  items,
  isProcessing,
  onPreviewArticle,
  onVerifyUrl,
  onRetryItem,
}) => {
  if (items.length === 0) {
    return null;
  }

  // Account Status Badge Helper
  const renderAccountBadge = (status: AccountStatus) => {
    switch (status) {
      case 'Connected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Connected
          </span>
        );
      case 'Detected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
            <Globe className="w-3 h-3 text-blue-500" />
            Detected
          </span>
        );
      case 'Account Setup Pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-amber-500" />
            Account Setup Pending
          </span>
        );
      case 'Verification Required':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3 text-purple-600" />
            Verification Required
          </span>
        );
      case 'Manual Action Required':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3 text-orange-600" />
            Manual Action Required
          </span>
        );
      case 'Unsupported':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3 text-slate-400" />
            Unsupported
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  // Content Status Badge Helper
  const renderContentBadge = (item: BatchItem) => {
    switch (item.contentStatus) {
      case 'Content Imported':
        return (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
              <FileText className="w-3 h-3 text-indigo-600" />
              Content Imported
            </span>
            <button
              type="button"
              onClick={() => onPreviewArticle(item)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
              title="Preview extracted article content"
            >
              Preview ({item.articleWordCount}w)
            </button>
          </div>
        );
      case 'Importing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            Importing...
          </span>
        );
      case 'Import Failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3 text-rose-500" />
            Import Failed
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">Pending</span>;
    }
  };

  // Submission Status Badge
  const renderSubmissionBadge = (status: SubmissionStatus) => {
    switch (status) {
      case 'Draft Created':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
            <CheckCheck className="w-3 h-3 text-emerald-600" />
            Draft Created
          </span>
        );
      case 'Submitted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3 text-blue-600" />
            Submitted
          </span>
        );
      case 'Publisher Review Pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-amber-600" />
            Publisher Review Pending
          </span>
        );
      case 'Ready for Review':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">
            Ready for Review
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3 text-rose-500" />
            Failed
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">Pending</span>;
    }
  };

  // Publication Status Badge
  const renderPublicationBadge = (status: PublicationStatus) => {
    switch (status) {
      case 'Verified Live':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Live
          </span>
        );
      case 'Published':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Published
          </span>
        );
      case 'Manual Action Required':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3 text-orange-600" />
            Manual Action Required
          </span>
        );
      case 'Unsupported':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
            Unsupported
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
            Failed
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">Pending</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-8">
      {/* Header Bar */}
      <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Batch Processing Dashboard</span>
            <span className="text-xs font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
              {items.length} Websites
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time live progress table with verified status tracking and direct public links.
          </p>
        </div>

        {/* Status Counts Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-1 rounded-lg border border-emerald-200">
            {items.filter(i => i.publicationStatus === 'Verified Live' || i.publicationStatus === 'Published').length} Published
          </span>
          <span className="bg-amber-50 text-amber-700 font-semibold px-2 py-1 rounded-lg border border-amber-200">
            {items.filter(i => i.accountStatus === 'Manual Action Required' || i.accountStatus === 'Verification Required' || i.actionRequired).length} Action Req.
          </span>
          <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded-lg border border-blue-200">
            {items.filter(i => i.submissionStatus === 'Draft Created' || i.submissionStatus === 'Submitted').length} Submitted
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/70 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4 min-w-[180px]">Website</th>
              <th className="py-3 px-4 min-w-[120px]">CMS</th>
              <th className="py-3 px-4 min-w-[160px]">Account Status</th>
              <th className="py-3 px-4 min-w-[180px]">Content Status</th>
              <th className="py-3 px-4 min-w-[160px]">Submission Status</th>
              <th className="py-3 px-4 min-w-[150px]">Publication Status</th>
              <th className="py-3 px-4 min-w-[170px]">Live URL</th>
              <th className="py-3 px-4 w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {items.map((item) => (
              <tr 
                key={item.id} 
                className={`hover:bg-slate-50/80 transition ${
                  item.isProcessing ? 'bg-indigo-50/30' : ''
                }`}
              >
                {/* Index */}
                <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                  {item.lineIndex}
                </td>

                {/* Website URL */}
                <td className="py-3.5 px-4 font-medium text-slate-800">
                  <div className="flex items-center gap-2">
                    <a
                      href={item.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-indigo-600 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                      title={item.websiteUrl}
                    >
                      {item.domain}
                      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    </a>
                  </div>
                  {item.stepMessage && (
                    <p className="text-[10px] text-slate-400 truncate max-w-[220px] mt-0.5">
                      {item.stepMessage}
                    </p>
                  )}
                </td>

                {/* CMS */}
                <td className="py-3.5 px-4">
                  <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                    {item.cms || 'Detecting...'}
                  </span>
                </td>

                {/* Account Status */}
                <td className="py-3.5 px-4">
                  {renderAccountBadge(item.accountStatus)}
                </td>

                {/* Content Status */}
                <td className="py-3.5 px-4">
                  {renderContentBadge(item)}
                </td>

                {/* Submission Status */}
                <td className="py-3.5 px-4">
                  {renderSubmissionBadge(item.submissionStatus)}
                </td>

                {/* Publication Status */}
                <td className="py-3.5 px-4">
                  {renderPublicationBadge(item.publicationStatus)}
                </td>

                {/* Live URL */}
                <td className="py-3.5 px-4">
                  {item.liveArticleUrl ? (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={item.liveArticleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-1 truncate max-w-[160px]"
                        title={item.liveArticleUrl}
                      >
                        {item.liveArticleUrl.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  ) : item.errorDetails ? (
                    <span 
                      className="text-[11px] text-slate-500 truncate block max-w-[160px] cursor-help"
                      title={item.errorDetails}
                    >
                      {item.errorDetails}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Pending</span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {item.contentStatus === 'Content Imported' && (
                      <button
                        type="button"
                        onClick={() => onPreviewArticle(item)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                        title="Preview Article"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {item.liveArticleUrl && (
                      <button
                        type="button"
                        onClick={() => onVerifyUrl(item)}
                        className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded transition"
                        title="Re-verify Live URL"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onRetryItem(item)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                      title="Retry processing"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
