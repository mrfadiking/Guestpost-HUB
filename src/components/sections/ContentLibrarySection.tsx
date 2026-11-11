import React, { useState } from 'react';
import { BatchItem } from '../../types';
import { FileText, ExternalLink, AlignLeft, Link2, Eye, Search } from 'lucide-react';

interface ContentLibrarySectionProps {
  items: BatchItem[];
  onPreviewArticle: (item: BatchItem) => void;
}

export const ContentLibrarySection: React.FC<ContentLibrarySectionProps> = ({
  items,
  onPreviewArticle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const articles = items.filter(i => i.contentStatus === 'Content Imported' || Boolean(i.articleTitle));
  const filtered = articles.filter(a => 
    a.articleTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.articleContent && a.articleContent.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Content Library & Google Docs Repository
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Imported original articles with preserved headings, hyperlinks, paragraph formatting, and word counts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search title, target, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
            />
          </div>
          <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
            {articles.length} Articles
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No imported articles found</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Run a batch in the Batch Processing tab or click "Load Sample Batch" to import original Google Docs content.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 transition flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 truncate">
                    Target: {item.domain}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    #{item.lineIndex}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mb-2 leading-snug">
                  {item.articleTitle || 'Untitled Draft Document'}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">
                  {item.articleContent || 'Content imported and awaiting preview inspection.'}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mb-3 pt-2 border-t border-slate-200/60">
                  <span className="flex items-center gap-1 font-medium">
                    <AlignLeft className="w-3 h-3 text-slate-400" />
                    {item.articleWordCount} words
                  </span>
                  {item.articleHeadings.length > 0 && (
                    <span className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                      {item.articleHeadings.length} Headings
                    </span>
                  )}
                  {item.articleLinks.length > 0 && (
                    <span className="flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                      <Link2 className="w-2.5 h-2.5" />
                      {item.articleLinks.length} Links
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <a
                  href={item.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 underline"
                >
                  Original Doc
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>

                <button
                  type="button"
                  onClick={() => onPreviewArticle(item)}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
