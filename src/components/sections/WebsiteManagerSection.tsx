import React, { useState } from 'react';
import { BatchItem } from '../../types';
import { WebsiteRecord } from '../../services/firestoreService';
import { findCredentialForDomain } from '../../services/credentialStore';
import { Globe, ShieldCheck, Key, CheckCircle, XCircle, RefreshCw, ExternalLink, AlertCircle, Sparkles } from 'lucide-react';

interface WebsiteManagerSectionProps {
  items: BatchItem[];
  websites: WebsiteRecord[];
  onOpenSettingsWithDomain: (domain: string) => void;
  onRefreshWebsites?: () => void;
}

export const WebsiteManagerSection: React.FC<WebsiteManagerSectionProps> = ({
  items,
  websites,
  onOpenSettingsWithDomain,
}) => {
  const [testingDomain, setTestingDomain] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ domain: string; success: boolean; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Combine items and saved websites
  const combinedMap = new Map<string, { domain: string; url: string; cms: string; apiAvailable: boolean; registrationAllowed: boolean; authMethods: string[]; details?: string }>();

  // Add from items
  items.forEach(item => {
    combinedMap.set(item.domain, {
      domain: item.domain,
      url: item.websiteUrl,
      cms: item.cms,
      apiAvailable: item.apiAvailable,
      registrationAllowed: item.registrationAllowed,
      authMethods: item.authMethods,
      details: item.stepMessage,
    });
  });

  // Add from websites
  websites.forEach(w => {
    if (!combinedMap.has(w.domain)) {
      combinedMap.set(w.domain, {
        domain: w.domain,
        url: w.url,
        cms: w.cms,
        apiAvailable: w.apiAvailable,
        registrationAllowed: w.registrationAllowed,
        authMethods: w.authMethods,
        details: w.notes,
      });
    }
  });

  const list = Array.from(combinedMap.values()).filter(site => 
    site.domain.toLowerCase().includes(searchTerm.toLowerCase()) || 
    site.cms.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTestConnection = async (site: { domain: string; url: string; cms: string }) => {
    const cred = findCredentialForDomain(site.domain);
    if (!cred || !cred.appPassword) {
      setTestResult({
        domain: site.domain,
        success: false,
        message: 'No Application Password configured for this domain. Please click "Configure Credentials" first.',
      });
      return;
    }

    setTestingDomain(site.domain);
    setTestResult(null);

    try {
      const endpoint = `${site.url.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
      const res = await fetch('/api/wordpress/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint,
          username: cred.username,
          appPassword: cred.appPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          domain: site.domain,
          success: true,
          message: data.message || `Connection verified! Author access confirmed for ${cred.username}.`,
        });
      } else {
        setTestResult({
          domain: site.domain,
          success: false,
          message: data.error || 'Connection failed. Verify username and Application Password.',
        });
      }
    } catch (err: any) {
      setTestResult({
        domain: site.domain,
        success: false,
        message: `Connection error: ${err.message}`,
      });
    } finally {
      setTestingDomain(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Website & Publisher Registry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-detected target publishing sites, CMS signatures, API endpoints, and connection test controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search domain or CMS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
            {list.length} Sites
          </span>
        </div>
      </div>

      {testResult && (
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between mb-5 ${
          testResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {testResult.success ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
            <span><strong>{testResult.domain}:</strong> {testResult.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setTestResult(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No websites detected yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Input website URLs in the Batch Processing tab to run automatic CMS detection and discover publishing methods.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Domain & Target URL</th>
                <th className="py-3 px-4">CMS Platform</th>
                <th className="py-3 px-4">Publishing REST API</th>
                <th className="py-3 px-4">Registration</th>
                <th className="py-3 px-4">Credential Vault</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((site) => {
                const cred = findCredentialForDomain(site.domain);
                const isTesting = testingDomain === site.domain;

                return (
                  <tr key={site.domain} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-slate-800 hover:text-indigo-600 hover:underline flex items-center gap-1.5"
                      >
                        {site.domain}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                      <span className="text-[10px] text-slate-400 font-mono truncate block max-w-xs">{site.url}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                        {site.cms}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {site.apiAvailable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          REST Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          Manual / Portal
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {site.registrationAllowed ? (
                        <span className="text-emerald-700 font-medium">Contributor Allowed</span>
                      ) : (
                        <span className="text-slate-400">Editorial Review</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {cred ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3 text-indigo-600" />
                          Vault: {cred.username}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None saved</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {site.cms.toLowerCase().includes('wordpress') && (
                          <button
                            type="button"
                            onClick={() => handleTestConnection(site)}
                            disabled={isTesting}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition border border-slate-200 disabled:opacity-50"
                            title="Test connection using saved Application Password"
                          >
                            <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                            Test Connection
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenSettingsWithDomain(site.domain)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg transition border border-indigo-200"
                        >
                          <Key className="w-3 h-3" />
                          Configure
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
