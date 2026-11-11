import React, { useState } from 'react';
import { BatchItem, SubmissionStatus } from '../../types';
import { CheckCheck, Clock, XCircle, RefreshCw, ExternalLink, Filter, Search, CheckCircle } from 'lucide-react';

interface SubmissionResultsSectionProps {
  items: BatchItem[];
  onRetryItem: (item: BatchItem) => void;
  onPreviewArticle: (item: BatchItem) => void;
}

export const SubmissionResultsSection: React.FC<SubmissionResultsSectionProps> = ({
  items,
  onRetryItem,
  onPreviewArticle,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = items.filter(item => {
    const matchesFilter = 
      statusFilter === 'all' || 
      (statusFilter === 'draft' && item.submissionStatus === 'Draft Created') ||
      (statusFilter === 'review' && item.submissionStatus === 'Publisher Review Pending') ||
      (statusFilter === 'submitted' && item.submissionStatus === 'Submitted') ||
      (statusFilter === 'failed' && item.submissionStatus === 'Failed');

    const matchesSearch = 
      item.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.articleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cms.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-indigo-600" />
            Submission Results & Audit Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full audit of all guest post submissions, editorial review stages, and draft statuses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('draft')}
              className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'draft' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Drafts ({items.filter(i => i.submissionStatus === 'Draft Created').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('review')}
              className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'review' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Under Review ({items.filter(i => i.submissionStatus === 'Publisher Review Pending').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('failed')}
              className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'failed' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Failed ({items.filter(i => i.submissionStatus === 'Failed').length})
            </button>
          </div>

          <input
            type="text"
            placeholder="Search domain or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <CheckCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No submission records match your filter</p>
          <p className="text-xs text-slate-500 mt-1">
            Execute batch processing to see real submission records and audit outcomes.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Target Website</th>
                <th className="py-3 px-4">Article Title</th>
                <th className="py-3 px-4">CMS</th>
                <th className="py-3 px-4">Submission Status</th>
                <th className="py-3 px-4">Details / Errors</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                    {item.lineIndex}
                  </td>

                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    <a
                      href={item.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      {item.domain}
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </td>

                  <td className="py-3.5 px-4 text-slate-800 font-medium">
                    <span 
                      onClick={() => onPreviewArticle(item)}
                      className="hover:text-indigo-600 cursor-pointer underline truncate max-w-xs block"
                      title={item.articleTitle}
                    >
                      {item.articleTitle || 'Untitled Draft'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                      {item.cms}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    {item.submissionStatus === 'Draft Created' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Draft Created
                      </span>
                    )}
                    {item.submissionStatus === 'Submitted' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 text-blue-600" />
                        Submitted
                      </span>
                    )}
                    {item.submissionStatus === 'Publisher Review Pending' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Review Pending
                      </span>
                    )}
                    {item.submissionStatus === 'Ready for Review' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">
                        Ready for Review
                      </span>
                    )}
                    {item.submissionStatus === 'Failed' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3 text-rose-500" />
                        Failed
                      </span>
                    )}
                    {item.submissionStatus === 'Pending' && (
                      <span className="text-slate-400 text-xs">Pending</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {item.errorDetails ? (
                      <span className="text-[11px] text-slate-500 truncate block max-w-xs cursor-help" title={item.errorDetails}>
                        {item.errorDetails}
                      </span>
                    ) : item.liveArticleUrl ? (
                      <span className="text-[11px] text-emerald-600 font-mono truncate block max-w-xs">
                        {item.liveArticleUrl}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Normal processing</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onRetryItem(item)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition border border-slate-200"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
