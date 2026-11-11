import React, { useMemo } from 'react';
import { Play, AlertCircle, CheckCircle2, Globe, FileText, ArrowRight, ShieldAlert, Sparkles, XCircle } from 'lucide-react';

interface BatchInputFormProps {
  websiteInput: string;
  setWebsiteInput: (val: string) => void;
  docsInput: string;
  setDocsInput: (val: string) => void;
  isProcessing: boolean;
  onStartBatch: () => void;
  onCancelBatch: () => void;
}

export const BatchInputForm: React.FC<BatchInputFormProps> = ({
  websiteInput,
  setWebsiteInput,
  docsInput,
  setDocsInput,
  isProcessing,
  onStartBatch,
  onCancelBatch,
}) => {
  // Parse lines
  const siteLines = useMemo(() => {
    return websiteInput
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
  }, [websiteInput]);

  const docLines = useMemo(() => {
    return docsInput
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
  }, [docsInput]);

  // Check domains and duplicate domains
  const domainAnalysis = useMemo(() => {
    const domains: string[] = [];
    const duplicates: string[] = [];
    const invalidUrls: string[] = [];

    siteLines.forEach(raw => {
      let url = raw;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        if (domains.includes(host)) {
          if (!duplicates.includes(host)) duplicates.push(host);
        } else {
          domains.push(host);
        }
      } catch (e) {
        invalidUrls.push(raw);
      }
    });

    return {
      uniqueCount: domains.length,
      duplicates,
      invalidUrls,
    };
  }, [siteLines]);

  // Google Docs validation
  const docAnalysis = useMemo(() => {
    const invalidDocs = docLines.filter(line => !line.includes('/document/d/'));
    return {
      invalidDocs,
    };
  }, [docLines]);

  // Check validation rules
  const countMismatch = siteLines.length > 0 && docLines.length > 0 && siteLines.length !== docLines.length;
  const isOverLimit = siteLines.length > 20 || docLines.length > 20;
  const hasDuplicates = domainAnalysis.duplicates.length > 0;
  const hasInvalidSites = domainAnalysis.invalidUrls.length > 0;
  const hasInvalidDocs = docAnalysis.invalidDocs.length > 0;
  const isEmpty = siteLines.length === 0 || docLines.length === 0;

  const isValid = !isEmpty && !countMismatch && !isOverLimit && !hasDuplicates && !hasInvalidSites && !hasInvalidDocs;

  // Auto remove duplicates helper
  const handleRemoveDuplicates = () => {
    const seen = new Set<string>();
    const cleaned: string[] = [];
    siteLines.forEach(raw => {
      let url = raw;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        if (!seen.has(host)) {
          seen.add(host);
          cleaned.push(raw);
        }
      } catch (e) {
        cleaned.push(raw);
      }
    });
    setWebsiteInput(cleaned.join('\n'));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 mb-8 transition">
      {/* Top instruction banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Simple Batch Submission</span>
            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Zero manual CMS setup required
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Paste target websites on the left and matching original Google Docs articles on the right. 
            The system automatically identifies CMS platforms, imports document contents, and runs verified workflows.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 self-start sm:self-center">
          <span>Max Capacity: <strong>20 URLs per batch</strong></span>
        </div>
      </div>

      {/* Two Primary Input Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* INPUT 1: WEBSITE URLS */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-600" />
              Website URLs
            </label>
            <div className="flex items-center gap-2">
              {hasDuplicates && (
                <button
                  type="button"
                  onClick={handleRemoveDuplicates}
                  className="text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded font-medium transition"
                >
                  Deduplicate Domains
                </button>
              )}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                siteLines.length > 20 
                  ? 'bg-rose-100 text-rose-700' 
                  : siteLines.length > 0 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {siteLines.length} / 20 URLs
              </span>
            </div>
          </div>

          <div className="relative">
            <textarea
              rows={7}
              disabled={isProcessing}
              value={websiteInput}
              onChange={(e) => setWebsiteInput(e.target.value)}
              placeholder="https://example.com&#10;https://techblog.org&#10;https://digitalmarketing.io&#10;... (1 website URL per line, up to 20)"
              className={`w-full font-mono text-xs sm:text-sm p-3.5 rounded-xl border bg-slate-50/50 focus:bg-white transition resize-y focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                hasDuplicates || hasInvalidSites || siteLines.length > 20
                  ? 'border-rose-300 focus:ring-rose-500'
                  : 'border-slate-300 focus:ring-indigo-500'
              }`}
            />
          </div>

          <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
            <span>One website URL per line</span>
            {hasDuplicates && (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Duplicate domain: {domainAnalysis.duplicates.join(', ')}
              </span>
            )}
            {hasInvalidSites && (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Invalid URL detected
              </span>
            )}
          </div>
        </div>

        {/* INPUT 2: GOOGLE DOCS URLS */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              Google Docs Article URLs
            </label>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                docLines.length > 20 
                  ? 'bg-rose-100 text-rose-700' 
                  : countMismatch 
                  ? 'bg-amber-100 text-amber-800' 
                  : docLines.length > 0 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {docLines.length} / 20 Docs
              </span>
            </div>
          </div>

          <div className="relative">
            <textarea
              rows={7}
              disabled={isProcessing}
              value={docsInput}
              onChange={(e) => setDocsInput(e.target.value)}
              placeholder="https://docs.google.com/document/d/1BxiMVs0XRA5.../edit&#10;https://docs.google.com/document/d/2YxjT.../edit&#10;... (1 Google Doc URL per line, matched by line #)"
              className={`w-full font-mono text-xs sm:text-sm p-3.5 rounded-xl border bg-slate-50/50 focus:bg-white transition resize-y focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                countMismatch || hasInvalidDocs || docLines.length > 20
                  ? 'border-amber-300 focus:ring-amber-500'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
          </div>

          <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
            <span>Matched to website URLs by line number</span>
            {hasInvalidDocs && (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Not a Google Docs link
              </span>
            )}
            {!hasInvalidDocs && countMismatch && (
              <span className="text-amber-700 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {siteLines.length} sites vs {docLines.length} docs
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Validation Warnings / Pairing Guide */}
      {countMismatch && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Line Count Mismatch</p>
            <p className="text-amber-700 mt-0.5">
              You entered <strong>{siteLines.length}</strong> website URLs and <strong>{docLines.length}</strong> Google Docs URLs. 
              Each website must receive its own distinct original article. Please ensure both fields have an equal number of lines.
            </p>
          </div>
        </div>
      )}

      {siteLines.length > 20 && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Batch Exceeds Limit</p>
            <p className="text-rose-700 mt-0.5">
              Maximum batch size is 20 websites. Please remove excess URLs before starting.
            </p>
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {isValid ? (
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {siteLines.length} pairs validated and ready for batch processing
            </span>
          ) : (
            <span className="text-slate-400">
              Enter matching pairs of websites and Google Docs to proceed
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isProcessing ? (
            <button
              type="button"
              onClick={onCancelBatch}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold px-5 py-3 rounded-xl transition shadow-sm"
            >
              <XCircle className="w-4 h-4" />
              Cancel Batch Run
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartBatch}
              disabled={!isValid || isProcessing}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 font-bold px-7 py-3 rounded-xl transition shadow-md ${
                isValid
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-500/25 cursor-pointer transform active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START BATCH PROCESSING</span>
              {siteLines.length > 0 && isValid && (
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full ml-1 font-semibold">
                  {siteLines.length} Sites
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
