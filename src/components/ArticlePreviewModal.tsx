import React from 'react';
import { BatchItem } from '../types';
import { X, ExternalLink, FileText, Globe, Tag, AlignLeft, Link2, Image as ImageIcon } from 'lucide-react';

interface ArticlePreviewModalProps {
  item: BatchItem | null;
  onClose: () => void;
}

export const ArticlePreviewModal: React.FC<ArticlePreviewModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {item.articleTitle || 'Article Content Preview'}
              </h3>
              <p className="text-xs text-slate-500">
                Extracted from Google Docs for target website: <span className="font-semibold text-slate-700">{item.domain}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata stats bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 font-medium">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            Target: <strong>{item.domain}</strong> ({item.cms})
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
            Length: <strong>{item.articleWordCount} words</strong>
          </span>
          {item.articleImagesCount > 0 && (
            <span className="flex items-center gap-1.5 font-medium">
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
              Images: <strong>{item.articleImagesCount}</strong>
            </span>
          )}
          <a
            href={item.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
          >
            Open in Google Docs
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700 leading-relaxed font-sans">
          {item.articleHeadings && item.articleHeadings.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Extracted Headings
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-600">
                {item.articleHeadings.map((h, i) => (
                  <li key={i} className="font-medium text-slate-800">{h}</li>
                ))}
              </ul>
            </div>
          )}

          {item.articleContent ? (
            item.articleContent.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-slate-800 leading-relaxed">
                {paragraph}
              </p>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              No content extracted yet or document access pending.
            </div>
          )}

          {item.articleLinks && item.articleLinks.length > 0 && (
            <div className="pt-4 mt-6 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-700 block mb-2 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                Hyperlinks in Document ({item.articleLinks.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {item.articleLinks.map((l, i) => (
                  <a
                    key={i}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md hover:underline flex items-center gap-1"
                  >
                    {l.text || l.url}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
