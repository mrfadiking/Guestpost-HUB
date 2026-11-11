import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { BatchInputForm } from './components/BatchInputForm';
import { ActionRequiredSection } from './components/ActionRequiredSection';
import { BatchProgressTable } from './components/BatchProgressTable';
import { ArticlePreviewModal } from './components/ArticlePreviewModal';
import { GoogleSheetsBar } from './components/GoogleSheetsBar';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { OverviewSection } from './components/sections/OverviewSection';
import { WebsiteManagerSection } from './components/sections/WebsiteManagerSection';
import { ContentLibrarySection } from './components/sections/ContentLibrarySection';
import { SubmissionResultsSection } from './components/sections/SubmissionResultsSection';
import { PublishedArticlesSection } from './components/sections/PublishedArticlesSection';
import { GoogleIntegrationsSection } from './components/sections/GoogleIntegrationsSection';
import { SettingsSection } from './components/sections/SettingsSection';
import { BatchItem, VerificationResult } from './types';
import { initAuth, googleSignIn, logout } from './services/googleAuth';
import { runBatch, processBatchItem } from './services/batchRunner';
import { syncBatchToGoogleSheets } from './services/googleSheets';
import { 
  syncUserRecord, 
  getStoredSubmissions, 
  getStoredWebsites, 
  getActivityLogs, 
  logActivity,
  WebsiteRecord,
  ActivityLogRecord 
} from './services/firestoreService';
import { 
  LayoutDashboard, 
  PlayCircle, 
  Globe, 
  FileText, 
  CheckCheck, 
  ShieldCheck, 
  FileSpreadsheet, 
  Settings 
} from 'lucide-react';

export type NavTab = 
  | 'overview' 
  | 'batch' 
  | 'websites' 
  | 'content' 
  | 'submissions' 
  | 'published' 
  | 'integrations' 
  | 'settings';

export default function App() {
  // Navigation State (8 sections)
  const [activeTab, setActiveTab] = useState<NavTab>('batch');

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Input states
  const [websiteInput, setWebsiteInput] = useState('');
  const [docsInput, setDocsInput] = useState('');

  // Batch data & execution state
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persistent storage caches
  const [storedWebsites, setStoredWebsites] = useState<WebsiteRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);

  // Google Sheets state
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('guestposthub_sheet_id') || '';
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('guestposthub_sheet_url') || '';
  });
  const [autoSync, setAutoSync] = useState(true);

  // Modals & Drawers
  const [previewItem, setPreviewItem] = useState<BatchItem | null>(null);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [settingsPrefillDomain, setSettingsPrefillDomain] = useState('');

  // Load initial saved data from Firestore / local cache
  useEffect(() => {
    getStoredWebsites().then(setStoredWebsites).catch(() => {});
    getActivityLogs().then(setActivityLogs).catch(() => {});
    
    // Attempt restoring recent submissions into items table if empty
    getStoredSubmissions().then(stored => {
      if (stored && stored.length > 0 && items.length === 0) {
        const reconstructed: BatchItem[] = stored.map((s, idx) => ({
          id: s.id,
          lineIndex: idx + 1,
          websiteUrl: s.websiteUrl,
          domain: s.domain,
          docUrl: s.docUrl,
          cms: s.cms,
          accountStatus: 'Connected',
          contentStatus: 'Content Imported',
          submissionStatus: s.submissionStatus as any,
          publicationStatus: s.publicationStatus as any,
          verificationStatus: s.verificationStatus as any,
          articleTitle: s.articleTitle,
          articleContent: '',
          articleHeadings: [],
          articleWordCount: 0,
          articleLinks: [],
          articleImagesCount: 0,
          liveArticleUrl: s.liveArticleUrl,
          publicationDate: s.publicationDate,
          submissionDate: s.submissionDate,
          errorDetails: s.errorDetails,
          apiAvailable: true,
          authMethods: ['REST API (Application Passwords)'],
          registrationAllowed: true,
          isProcessing: false,
        }));
        setItems(reconstructed);
      }
    }).catch(() => {});
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
        syncUserRecord({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        }).catch(() => {});
        logActivity('User signed in with Google', currentUser.email || undefined, 'success').catch(() => {});
      },
      () => {
        setUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Save spreadsheet ID to storage when changed
  useEffect(() => {
    if (spreadsheetId) {
      localStorage.setItem('guestposthub_sheet_id', spreadsheetId);
    }
    if (spreadsheetUrl) {
      localStorage.setItem('guestposthub_sheet_url', spreadsheetUrl);
    }
  }, [spreadsheetId, spreadsheetUrl]);

  // Google Login handler
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        await logActivity('Google Workspace account authorized', result.user.email || undefined, 'success');
        const logs = await getActivityLogs();
        setActivityLogs(logs);
      }
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      logActivity('Google Sign In failed', err.message, 'error').catch(() => {});
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Logout handler
  const handleGoogleLogout = async () => {
    try {
      await logout();
      setUser(null);
      logActivity('Google account disconnected', undefined, 'info').catch(() => {});
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Load sample batch for instant 1-click test
  const handleLoadSample = () => {
    const sampleWebsites = [
      'https://wordpress.org/news/',
      'https://ghost.org/blog/',
      'https://www.drupal.org/community',
    ];

    const sampleDocs = [
      'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      'https://docs.google.com/document/d/1xGqGzB1R9_4aLzQ8qV_P7eW4mYk5o_2jQ1xGqGzB1R9/edit',
      'https://docs.google.com/document/d/1yZqKzB2R8_5bMzQ7qW_P8fX5mZk6p_3jQ2yZqKzB2R8/edit',
    ];

    setWebsiteInput(sampleWebsites.join('\n'));
    setDocsInput(sampleDocs.join('\n'));
    setActiveTab('batch');
  };

  // Reset entire dashboard
  const handleReset = () => {
    if (isProcessing) {
      abortControllerRef.current?.abort();
    }
    setWebsiteInput('');
    setDocsInput('');
    setItems([]);
    setIsProcessing(false);
  };

  // Start One-Click Batch Processing
  const handleStartBatch = async () => {
    const siteLines = websiteInput.split('\n').map(l => l.trim()).filter(Boolean);
    const docLines = docsInput.split('\n').map(l => l.trim()).filter(Boolean);

    if (siteLines.length === 0 || docLines.length === 0 || siteLines.length !== docLines.length) {
      return;
    }

    // Initialize BatchItems
    const initialItems: BatchItem[] = siteLines.map((siteUrl, index) => {
      let cleanSite = siteUrl;
      if (!cleanSite.startsWith('http://') && !cleanSite.startsWith('https://')) {
        cleanSite = 'https://' + cleanSite;
      }
      let domain = cleanSite;
      try {
        domain = new URL(cleanSite).hostname.replace(/^www\./, '');
      } catch (e) {
        // keep cleanSite
      }

      return {
        id: `batch-${Date.now()}-${index}`,
        lineIndex: index + 1,
        websiteUrl: cleanSite,
        domain,
        docUrl: docLines[index],
        cms: 'Detecting...',
        accountStatus: 'Detected',
        contentStatus: 'Pending',
        submissionStatus: 'Pending',
        publicationStatus: 'Pending',
        verificationStatus: 'Unverified',
        articleTitle: '',
        articleContent: '',
        articleHeadings: [],
        articleWordCount: 0,
        articleLinks: [],
        articleImagesCount: 0,
        apiAvailable: false,
        authMethods: [],
        registrationAllowed: false,
        isProcessing: false,
      };
    });

    setItems(initialItems);
    setIsProcessing(true);

    await logActivity(`Initiated batch processing for ${initialItems.length} websites`, undefined, 'info');
    getActivityLogs().then(setActivityLogs).catch(() => {});

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Run batch engine
    const finalItems = await runBatch(
      initialItems,
      {
        onItemUpdate: (updatedItem) => {
          setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        },
      },
      controller.signal
    );

    setIsProcessing(false);

    // Refresh stored websites and logs
    getStoredWebsites().then(setStoredWebsites).catch(() => {});
    getActivityLogs().then(setActivityLogs).catch(() => {});

    // Auto-sync to Google Sheets if authorized and toggle is active
    if (autoSync && user && finalItems.length > 0) {
      try {
        const syncResult = await syncBatchToGoogleSheets(finalItems, spreadsheetId);
        setSpreadsheetId(syncResult.spreadsheetId);
        setSpreadsheetUrl(syncResult.spreadsheetUrl);
        await logActivity('Auto-synced batch results to Google Sheets', syncResult.spreadsheetId, 'success');
        getActivityLogs().then(setActivityLogs).catch(() => {});
      } catch (sheetErr) {
        console.warn('Auto-sync to Google Sheets had a warning:', sheetErr);
      }
    }
  };

  const handleCancelBatch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    logActivity('Batch processing cancelled by user', undefined, 'warning').catch(() => {});
  };

  // Re-verify a live URL on demand
  const handleVerifyUrl = async (item: BatchItem) => {
    if (!item.liveArticleUrl) return;

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, verificationStatus: 'Verifying...' } : i));

    try {
      const res = await fetch('/api/verify-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: item.liveArticleUrl,
          expectedTitle: item.articleTitle,
        }),
      });

      const data: VerificationResult = await res.json();

      setItems(prev => prev.map(i => {
        if (i.id !== item.id) return i;
        if (data.verified) {
          logActivity(`Verified Live post on ${i.domain}`, item.liveArticleUrl, 'success').catch(() => {});
          return {
            ...i,
            verificationStatus: 'Verified Live',
            publicationStatus: 'Verified Live',
            errorDetails: undefined,
          };
        } else {
          return {
            ...i,
            verificationStatus: 'Verification Failed',
            errorDetails: `Verification Failed: ${data.reason}`,
          };
        }
      }));
      getActivityLogs().then(setActivityLogs).catch(() => {});
    } catch (err: any) {
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        verificationStatus: 'Verification Failed',
        errorDetails: `Verification check failed: ${err.message}`,
      } : i));
    }
  };

  // Mark an email verification checkpoint as completed
  const handleMarkVerified = (itemId: string) => {
    setItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      return {
        ...i,
        accountStatus: 'Connected',
        actionRequired: undefined,
        submissionStatus: 'Ready for Review',
      };
    }));
  };

  // Retry an individual batch item
  const handleRetryItem = async (item: BatchItem) => {
    const updated = await processBatchItem(
      { ...item, isProcessing: true },
      {
        onItemUpdate: (res) => {
          setItems(prev => prev.map(i => i.id === res.id ? res : i));
        },
      }
    );
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  // Open settings with prefilled domain
  const handleOpenSettingsWithDomain = (domain: string) => {
    setSettingsPrefillDomain(domain);
    setActiveTab('settings');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Header
        user={user}
        isLoggingIn={isLoggingIn}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        onOpenSettings={() => {
          setActiveTab('settings');
        }}
        onLoadSample={handleLoadSample}
        onReset={handleReset}
        hasBatchItems={items.length > 0 || Boolean(websiteInput || docsInput)}
      />

      {/* 8-Section Navigation Bar */}
      <nav className="bg-slate-950/80 border-b border-slate-800/80 sticky top-16 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              1. Overview
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'batch'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              2. Batch Processing
              {items.length > 0 && (
                <span className="bg-indigo-400/30 text-indigo-200 text-[10px] px-1.5 py-0.2 rounded-full">
                  {items.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('websites')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'websites'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              3. Website Manager
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'content'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              4. Content Library
              {items.filter(i => i.contentStatus === 'Content Imported').length > 0 && (
                <span className="bg-blue-400/30 text-blue-200 text-[10px] px-1.5 py-0.2 rounded-full">
                  {items.filter(i => i.contentStatus === 'Content Imported').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('submissions')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'submissions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              5. Submission Results
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('published')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'published'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              6. Published Articles
              {items.filter(i => i.publicationStatus === 'Verified Live' || i.publicationStatus === 'Published').length > 0 && (
                <span className="bg-emerald-400/30 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full">
                  {items.filter(i => i.publicationStatus === 'Verified Live' || i.publicationStatus === 'Published').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('integrations')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'integrations'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              7. Google Integrations
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              8. Settings
            </button>
          </div>
        </div>
      </nav>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <OverviewSection
            items={items}
            activityLogs={activityLogs}
            onNavigateToBatch={() => setActiveTab('batch')}
            onLoadSample={handleLoadSample}
            isAuthenticated={Boolean(user)}
            onLogin={handleGoogleLogin}
          />
        )}

        {/* TAB 2: BATCH PROCESSING (CORE APPLICATION) */}
        {activeTab === 'batch' && (
          <div className="space-y-6">
            {/* Simple 2-Field Input Form */}
            <BatchInputForm
              websiteInput={websiteInput}
              setWebsiteInput={setWebsiteInput}
              docsInput={docsInput}
              setDocsInput={setDocsInput}
              isProcessing={isProcessing}
              onStartBatch={handleStartBatch}
              onCancelBatch={handleCancelBatch}
            />

            {/* Action Required Section (Appears only when human checkpoints exist) */}
            <ActionRequiredSection
              items={items}
              onOpenSettingsWithDomain={handleOpenSettingsWithDomain}
              onMarkVerified={handleMarkVerified}
              onRetryItem={handleRetryItem}
            />

            {/* Live Progress Dashboard Table */}
            <BatchProgressTable
              items={items}
              isProcessing={isProcessing}
              onPreviewArticle={(item) => setPreviewItem(item)}
              onVerifyUrl={handleVerifyUrl}
              onRetryItem={handleRetryItem}
            />

            {/* Google Sheets Synchronization Bar */}
            <GoogleSheetsBar
              items={items}
              spreadsheetId={spreadsheetId}
              setSpreadsheetId={setSpreadsheetId}
              spreadsheetUrl={spreadsheetUrl}
              setSpreadsheetUrl={setSpreadsheetUrl}
              autoSync={autoSync}
              setAutoSync={setAutoSync}
              isAuthenticated={Boolean(user)}
              onLogin={handleGoogleLogin}
            />
          </div>
        )}

        {/* TAB 3: WEBSITE MANAGER */}
        {activeTab === 'websites' && (
          <WebsiteManagerSection
            items={items}
            websites={storedWebsites}
            onOpenSettingsWithDomain={handleOpenSettingsWithDomain}
          />
        )}

        {/* TAB 4: CONTENT LIBRARY */}
        {activeTab === 'content' && (
          <ContentLibrarySection
            items={items}
            onPreviewArticle={(item) => setPreviewItem(item)}
          />
        )}

        {/* TAB 5: SUBMISSION RESULTS */}
        {activeTab === 'submissions' && (
          <SubmissionResultsSection
            items={items}
            onRetryItem={handleRetryItem}
            onPreviewArticle={(item) => setPreviewItem(item)}
          />
        )}

        {/* TAB 6: PUBLISHED ARTICLES */}
        {activeTab === 'published' && (
          <PublishedArticlesSection
            items={items}
            onVerifyUrl={handleVerifyUrl}
            onPreviewArticle={(item) => setPreviewItem(item)}
          />
        )}

        {/* TAB 7: GOOGLE INTEGRATIONS */}
        {activeTab === 'integrations' && (
          <GoogleIntegrationsSection
            user={user}
            onLogin={handleGoogleLogin}
            onLogout={handleGoogleLogout}
            spreadsheetId={spreadsheetId}
            setSpreadsheetId={setSpreadsheetId}
            spreadsheetUrl={spreadsheetUrl}
            setSpreadsheetUrl={setSpreadsheetUrl}
            items={items}
          />
        )}

        {/* TAB 8: SETTINGS */}
        {activeTab === 'settings' && (
          <SettingsSection
            user={user}
            items={items}
            initialDomain={settingsPrefillDomain}
          />
        )}
      </main>

      {/* Article Content Preview Drawer/Modal */}
      <ArticlePreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />

      {/* Administrator-Only Settings Modal */}
      <AdminSettingsModal
        isOpen={isAdminSettingsOpen}
        onClose={() => setIsAdminSettingsOpen(false)}
        user={user}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        initialDomain={settingsPrefillDomain}
      />
    </div>
  );
}
