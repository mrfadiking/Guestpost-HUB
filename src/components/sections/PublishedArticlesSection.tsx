import React from 'react';
import { BatchItem } from '../../types';
import { ShieldCheck, CheckCircle, ExternalLink, RefreshCw, Globe, Calendar, Search } from 'lucide-react';

interface PublishedArticlesSectionProps {
  items: BatchItem[];
  onVerifyUrl: (item: BatchItem) => void;
  onPreviewArticle: (item: BatchItem) => void;
}

export const PublishedArticlesSection: React.FC<PublishedArticlesSectionProps> = ({
  items,
  onVerifyUrl,
  onPreviewArticle,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const published = items.filter(
    i => Boolean(i.liveArticleUrl) || i.publicationStatus === 'Verified Live' || i.publicationStatus === 'Published'
  );

  const filtered = published.filter(i =>
    (i.articleTitle && i.articleTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
    i.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.liveArticleUrl && i.liveArticleUrl.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Published & Verified Live Articles
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified live articles confirmed through independent HTTP requests, title match ratio, and content verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search live posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52"
            />
          </div>
          <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
            {published.length} Live Posts
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No verified published articles yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            When authorized WordPress posts are created and verified live, they will appear here with direct public URLs and live HTTP checks.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Article Title</th>
                <th className="py-3 px-4">Publisher Domain</th>
                <th className="py-3 px-4">Live URL</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <button
                      type="button"
                      onClick={() => onPreviewArticle(item)}
                      className="hover:text-indigo-600 text-left underline line-clamp-1 max-w-xs block"
                    >
                      {item.articleTitle || 'Untitled Publication'}
                    </button>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {item.domain}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    {item.liveArticleUrl ? (
                      <a
                        href={item.liveArticleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-1 font-mono text-[11px] max-w-xs truncate"
                      >
                        {item.liveArticleUrl}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-slate-400">Pending URL</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {item.publicationDate || item.submissionDate || 'Today'}
                  </td>

                  <td className="py-3.5 px-4">
                    {item.verificationStatus === 'Verified Live' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified Live
                      </span>
                    ) : item.verificationStatus === 'Verifying...' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full animate-pulse">
                        Verifying...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                        {item.verificationStatus || 'Unverified'}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onVerifyUrl(item)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg transition"
                      title="Re-verify HTTP accessibility and content match"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Verify Live
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
