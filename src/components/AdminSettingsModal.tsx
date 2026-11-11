import React, { useState, useEffect } from 'react';
import { StoredCredential } from '../types';
import { loadStoredCredentials, saveCredential, deleteCredential } from '../services/credentialStore';
import { X, Key, Shield, FileCheck, Trash2, Plus, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  initialDomain?: string;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogin,
  onLogout,
  initialDomain = '',
}) => {
  const [activeTab, setActiveTab] = useState<'credentials' | 'workspace' | 'compliance'>('credentials');
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  
  // New credential form
  const [newDomain, setNewDomain] = useState(initialDomain);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCredentials(loadStoredCredentials());
      if (initialDomain) {
        setNewDomain(initialDomain);
      }
    }
  }, [isOpen, initialDomain]);

  if (!isOpen) return null;

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
    setSuccessMsg('Publisher credentials securely encrypted and saved.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDelete = (domain: string) => {
    deleteCredential(domain);
    setCredentials(loadStoredCredentials());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              Administrator Settings & Security Vault
            </h3>
            <p className="text-xs text-slate-400">
              Isolated from the main dashboard to keep your submission experience minimal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'credentials'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Publisher Credentials ({credentials.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'workspace'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Google Workspace OAuth
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compliance')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'compliance'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Publishing Compliance
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {activeTab === 'credentials' && (
            <div>
              <div className="mb-4">
                <h4 className="font-bold text-sm text-slate-900 mb-1">
                  WordPress & CMS Application Passwords
                </h4>
                <p className="text-slate-500">
                  Store authorized Application Passwords for target publishers who have granted contributor access. Credentials are encrypted on your local device and never sent to external servers or Google Sheets.
                </p>
              </div>

              {/* Add form */}
              <form onSubmit={handleAddCredential} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5">
                <span className="font-semibold text-slate-800 block mb-3 text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  Add Authorized Publisher Connection
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Website Domain
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="techblog.org"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Username / Email
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="author_user"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Application Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Generated in WordPress Admin &rarr; Users &rarr; Profile &rarr; Application Passwords
                  </span>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition"
                  >
                    Save Credential
                  </button>
                </div>
              </form>

              {successMsg && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Saved list */}
              <div>
                <span className="font-bold text-slate-800 block mb-2">
                  Stored Authorized Connections ({credentials.length})
                </span>
                {credentials.length === 0 ? (
                  <p className="text-slate-400 italic">No domain credentials stored yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {credentials.map((c) => (
                      <div key={c.domain} className="p-3 bg-white flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 block">{c.domain}</span>
                          <span className="text-slate-500 text-[11px]">
                            User: {c.username} | CMS: {c.cms} | Encrypted Vault
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.domain)}
                          className="text-rose-600 hover:text-rose-800 p-1.5 hover:bg-rose-50 rounded-lg transition"
                          title="Delete stored credential"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'workspace' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 mb-1">
                Google Workspace Connection
              </h4>
              <p className="text-slate-500">
                Authorizes direct access to read Google Docs articles and synchronize batch outcomes to Google Sheets.
              </p>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Connection Status</span>
                    <span className="text-slate-500 text-xs">
                      {user ? `Connected as ${user.email}` : 'Not connected'}
                    </span>
                  </div>
                  {user ? (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg font-semibold transition"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onLogin}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
                    >
                      Connect with Google
                    </button>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200/60 space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Google Docs API Scope: <code>documents.readonly</code></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Google Sheets API Scope: <code>spreadsheets</code></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-900">
                Editorial Compliance & Quality Standards
              </h4>
              <p className="text-slate-500">
                GuestPost Hub adheres to strict publication guidelines:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-700 leading-relaxed">
                <li><strong>No duplicate content:</strong> Each target website must receive its own distinct original article.</li>
                <li><strong>No automated spin campaigns:</strong> Spun articles and synthetic rephrasing are prohibited.</li>
                <li><strong>No artificial link stuffing:</strong> Natural editorial references only.</li>
                <li><strong>Publisher consent:</strong> Only authorized REST API endpoints or legitimate contributor logins are engaged.</li>
                <li><strong>Live Verification:</strong> Articles are only marked Verified Live after independent HTTP accessibility and content verification.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
