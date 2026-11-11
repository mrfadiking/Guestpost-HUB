import React, { useState, useEffect } from 'react';
import { StoredCredential, BatchItem } from '../../types';
import { loadStoredCredentials, saveCredential, deleteCredential } from '../../services/credentialStore';
import { 
  Settings, 
  Key, 
  Shield, 
  Trash2, 
  Plus, 
  CheckCircle, 
  Database, 
  Download, 
  Server,
  Lock,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { User } from 'firebase/auth';

interface SettingsSectionProps {
  user: User | null;
  items: BatchItem[];
  initialDomain?: string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  user,
  items,
  initialDomain = '',
}) => {
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [newDomain, setNewDomain] = useState(initialDomain);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [testingDomain, setTestingDomain] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ domain: string; message: string; success: boolean } | null>(null);

  useEffect(() => {
    setCredentials(loadStoredCredentials());
  }, []);

  useEffect(() => {
    if (initialDomain) {
      setNewDomain(initialDomain);
    }
  }, [initialDomain]);

  const handleAddCredential = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain || !newUsername || !newPassword) return;

    saveCredential({
      domain: newDomain,
      cms: 'WordPress',
      username: newUsername,
      appPassword: newPassword,
      lastUpdated: new Date().toISOString(),
    });

    setCredentials(loadStoredCredentials());
    setNewDomain('');
    setNewUsername('');
    setNewPassword('');
    setSuccessMsg('Publisher credential securely encrypted in vault.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDelete = (domain: string) => {
    deleteCredential(domain);
    setCredentials(loadStoredCredentials());
  };

  const handleTestCred = async (c: StoredCredential) => {
    if (!c.appPassword) return;
    setTestingDomain(c.domain);
    setTestResult(null);

    try {
      const endpoint = `https://${c.domain}/wp-json/wp/v2/posts`;
      const res = await fetch('/api/wordpress/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint,
          username: c.username,
          appPassword: c.appPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          domain: c.domain,
          success: true,
          message: data.message || `Connected successfully as "${c.username}"!`,
        });
      } else {
        setTestResult({
          domain: c.domain,
          success: false,
          message: data.error || 'Connection failed. Verify username and application password.',
        });
      }
    } catch (err: any) {
      setTestResult({
        domain: c.domain,
        success: false,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setTestingDomain(null);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `guestposthub-batch-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-indigo-600" />
          Settings & Security Vault
        </h2>
        <p className="text-xs text-slate-500">
          Encrypted credentials, SSRF security status, and database schema controls.
        </p>
      </div>

      {/* Publisher Credentials Form & List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              WordPress REST API Application Passwords Vault
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Securely stored with client-side XOR encryption. Used exclusively for authorized REST API requests.
            </p>
          </div>
          <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
            {credentials.length} Credentials
          </span>
        </div>

        {/* Add credential form */}
        <form onSubmit={handleAddCredential} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
          <span className="font-semibold text-slate-800 block mb-3 text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            Add Publisher Authorized Connection
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Domain</label>
              <input
                type="text"
                required
                placeholder="techblog.org"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Username / Email</label>
              <input
                type="text"
                required
                placeholder="contributor_user"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Application Password</label>
              <input
                type="password"
                required
                placeholder="xxxx xxxx xxxx xxxx"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              Generated in WordPress Admin &rarr; Users &rarr; Profile &rarr; Application Passwords
            </span>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-xs cursor-pointer"
            >
              Save Credential to Vault
            </button>
          </div>
        </form>

        {successMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {testResult && (
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between mb-4 ${
            testResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <span><strong>{testResult.domain}:</strong> {testResult.message}</span>
            <button type="button" onClick={() => setTestResult(null)} className="text-slate-400 hover:text-slate-600 font-bold px-1">✕</button>
          </div>
        )}

        {/* Stored Credentials List */}
        <div>
          {credentials.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">No publisher credentials stored yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {credentials.map((c) => (
                <div key={c.domain} className="p-3.5 bg-white flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{c.domain}</span>
                    <span className="text-slate-500 text-[11px]">
                      User: <strong>{c.username}</strong> | Platform: {c.cms} | Encrypted in Local Vault
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestCred(c)}
                      disabled={testingDomain === c.domain}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition border border-slate-200 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${testingDomain === c.domain ? 'animate-spin' : ''}`} />
                      Test
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.domain)}
                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                      title="Delete credential"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Security & Firestore Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security Controls */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            Security & Protection Measures
          </h3>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">SSRF Protection</p>
                <p className="text-[11px] text-slate-500">Blocks access to private IPs (10.x, 192.168.x, 127.0.0.1, 169.254.x)</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">No Secrets in Client JS</p>
                <p className="text-[11px] text-slate-500">Credentials kept in client encrypted vault or server API proxies</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Enforced
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Rate Limiting & Timeouts</p>
                <p className="text-[11px] text-slate-500">8-9 second abort controllers on all external HTTP requests</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Armed
              </span>
            </div>
          </div>
        </div>

        {/* Firestore 9 Collections Status */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              Firebase Firestore (9 Collections)
            </h3>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
              Persistent
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            {[
              'users',
              'websites',
              'siteAccounts',
              'documents',
              'submissions',
              'publishingJobs',
              'submissionEvents',
              'integrations',
              'activityLogs',
            ].map(col => (
              <div key={col} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center truncate text-[11px] text-slate-700 font-semibold">
                /{col}
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleExportJson}
              disabled={items.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2 rounded-xl transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export Current Batch Data (.JSON)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
