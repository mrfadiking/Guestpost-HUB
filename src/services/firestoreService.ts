import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc,
  Firestore 
} from 'firebase/firestore';
import { app } from './googleAuth';
import { BatchItem, CMSPlatform } from '../types';

let db: Firestore | null = null;
try {
  db = getFirestore(app);
} catch (err) {
  console.warn('Firestore initialization warning, local fallback enabled:', err);
}

export interface UserRecord {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastLogin: string;
}

export interface WebsiteRecord {
  id: string;
  url: string;
  domain: string;
  cms: string;
  apiAvailable: boolean;
  registrationAllowed: boolean;
  authMethods: string[];
  lastChecked: string;
  notes?: string;
}

export interface SiteAccountRecord {
  id: string;
  domain: string;
  cms: string;
  username: string;
  status: 'active' | 'pending_verification' | 'disabled';
  lastUsed?: string;
}

export interface DocumentRecord {
  id: string; // docId
  docUrl: string;
  title: string;
  wordCount: number;
  headings: string[];
  importedAt: string;
}

export interface SubmissionRecord {
  id: string;
  websiteUrl: string;
  domain: string;
  docUrl: string;
  cms: string;
  articleTitle: string;
  submissionStatus: string;
  publicationStatus: string;
  verificationStatus: string;
  liveArticleUrl?: string;
  submissionDate: string;
  publicationDate?: string;
  errorDetails?: string;
}

export interface PublishingJobRecord {
  id: string;
  totalSites: number;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
  startedAt: string;
  completedAt?: string;
  successCount: number;
  failureCount: number;
}

export interface SubmissionEventRecord {
  id: string;
  submissionId: string;
  eventType: 'detected' | 'imported' | 'submitted' | 'published' | 'verified' | 'failed';
  timestamp: string;
  details: string;
}

export interface IntegrationRecord {
  id: string;
  service: 'google_workspace' | 'wordpress' | 'sheets' | 'docs';
  connected: boolean;
  accountEmail?: string;
  lastSyncAt?: string;
  details?: Record<string, any>;
}

export interface ActivityLogRecord {
  id: string;
  action: string;
  target?: string;
  status: 'success' | 'warning' | 'error' | 'info';
  timestamp: string;
  details?: string;
}

// In-memory & LocalStorage fallback caches for seamless operation
const LOCAL_STORAGE_KEY_SUBMISSIONS = 'guestposthub_db_submissions';
const LOCAL_STORAGE_KEY_ACTIVITIES = 'guestposthub_db_activities';
const LOCAL_STORAGE_KEY_WEBSITES = 'guestposthub_db_websites';

// 1. Users
export async function syncUserRecord(user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }): Promise<void> {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore syncUserRecord notice:', e);
  }
}

// 2. Websites
export async function recordWebsite(site: Omit<WebsiteRecord, 'id'>): Promise<void> {
  const cleanId = site.domain.replace(/[^a-zA-Z0-9_-]/g, '_');
  const record: WebsiteRecord = { ...site, id: cleanId };

  // Local fallback cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_WEBSITES) || '[]';
    const list: WebsiteRecord[] = JSON.parse(raw);
    const filtered = list.filter(s => s.domain !== site.domain);
    localStorage.setItem(LOCAL_STORAGE_KEY_WEBSITES, JSON.stringify([record, ...filtered].slice(0, 50)));
  } catch (e) {}

  if (!db) return;
  try {
    const siteRef = doc(db, 'websites', cleanId);
    await setDoc(siteRef, record, { merge: true });
  } catch (e) {
    console.warn('Firestore recordWebsite notice:', e);
  }
}

export async function getStoredWebsites(): Promise<WebsiteRecord[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'websites'));
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as WebsiteRecord);
      }
    } catch (e) {
      console.warn('Firestore getStoredWebsites notice:', e);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_WEBSITES) || '[]';
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

// 3. Submissions & Batch Items
export async function persistBatchItem(item: BatchItem, jobId?: string): Promise<void> {
  const record: SubmissionRecord = {
    id: item.id,
    websiteUrl: item.websiteUrl,
    domain: item.domain,
    docUrl: item.docUrl,
    cms: item.cms,
    articleTitle: item.articleTitle || 'Untitled Draft',
    submissionStatus: item.submissionStatus,
    publicationStatus: item.publicationStatus,
    verificationStatus: item.verificationStatus,
    liveArticleUrl: item.liveArticleUrl,
    submissionDate: item.submissionDate || new Date().toISOString().split('T')[0],
    publicationDate: item.publicationDate,
    errorDetails: item.errorDetails,
  };

  // Save to local cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SUBMISSIONS) || '[]';
    const list: SubmissionRecord[] = JSON.parse(raw);
    const filtered = list.filter(s => s.id !== record.id);
    localStorage.setItem(LOCAL_STORAGE_KEY_SUBMISSIONS, JSON.stringify([record, ...filtered].slice(0, 100)));
  } catch (e) {}

  if (!db) return;
  try {
    const subRef = doc(db, 'submissions', item.id);
    await setDoc(subRef, record, { merge: true });

    // Also record event
    await addDoc(collection(db, 'submissionEvents'), {
      submissionId: item.id,
      eventType: item.publicationStatus === 'Verified Live' ? 'verified' : (item.submissionStatus === 'Draft Created' ? 'submitted' : 'detected'),
      timestamp: new Date().toISOString(),
      details: item.stepMessage || `Status: ${item.submissionStatus}`,
    });
  } catch (e) {
    console.warn('Firestore persistBatchItem notice:', e);
  }
}

export async function getStoredSubmissions(): Promise<SubmissionRecord[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'submissions'));
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as SubmissionRecord);
      }
    } catch (e) {
      console.warn('Firestore getStoredSubmissions notice:', e);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SUBMISSIONS) || '[]';
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

// 4. Activity Logs
export async function logActivity(action: string, target?: string, status: 'success' | 'warning' | 'error' | 'info' = 'info', details?: string): Promise<void> {
  const log: ActivityLogRecord = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    action,
    target,
    status,
    timestamp: new Date().toISOString(),
    details,
  };

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVITIES) || '[]';
    const list: ActivityLogRecord[] = JSON.parse(raw);
    localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVITIES, JSON.stringify([log, ...list].slice(0, 50)));
  } catch (e) {}

  if (!db) return;
  try {
    await addDoc(collection(db, 'activityLogs'), log);
  } catch (e) {
    // Non-blocking
  }
}

export async function getActivityLogs(): Promise<ActivityLogRecord[]> {
  if (db) {
    try {
      const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(30));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as ActivityLogRecord);
      }
    } catch (e) {
      // Fallback
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVITIES) || '[]';
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}
