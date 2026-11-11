import { StoredCredential } from '../types';

const STORAGE_KEY = 'guestposthub_credentials_vault_v1';

// Base64 + XOR simple client-side vault encryption with local device key
function getDeviceKey(): number {
  return 0x5a;
}

function encrypt(text: string): string {
  if (!text) return '';
  const key = getDeviceKey();
  const bytes = new TextEncoder().encode(text);
  const encrypted = bytes.map(b => b ^ key);
  return btoa(String.fromCharCode(...encrypted));
}

function decrypt(cipher: string): string {
  if (!cipher) return '';
  try {
    const key = getDeviceKey();
    const binary = atob(cipher);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) ^ key;
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return '';
  }
}

export function loadStoredCredentials(): StoredCredential[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: any[] = JSON.parse(raw);
    return list.map(item => ({
      ...item,
      appPassword: item.appPassword ? decrypt(item.appPassword) : undefined,
      apiToken: item.apiToken ? decrypt(item.apiToken) : undefined,
    }));
  } catch (e) {
    console.error('Failed to load credentials:', e);
    return [];
  }
}

export function saveCredential(cred: StoredCredential): void {
  const current = loadStoredCredentials();
  const domain = cred.domain.toLowerCase().trim();
  const filtered = current.filter(c => c.domain.toLowerCase().trim() !== domain);

  const secureCred = {
    ...cred,
    domain,
    appPassword: cred.appPassword ? encrypt(cred.appPassword) : undefined,
    apiToken: cred.apiToken ? encrypt(cred.apiToken) : undefined,
    lastUpdated: new Date().toISOString(),
  };

  const toSave = [...filtered, secureCred];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

export function deleteCredential(domain: string): void {
  const current = loadStoredCredentials();
  const filtered = current.filter(c => c.domain.toLowerCase().trim() !== domain.toLowerCase().trim());
  const toSave = filtered.map(item => ({
    ...item,
    appPassword: item.appPassword ? encrypt(item.appPassword) : undefined,
    apiToken: item.apiToken ? encrypt(item.apiToken) : undefined,
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

export function findCredentialForDomain(domainOrUrl: string): StoredCredential | undefined {
  const creds = loadStoredCredentials();
  let cleanDomain = domainOrUrl.toLowerCase().trim();
  try {
    if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
      cleanDomain = new URL(cleanDomain).hostname;
    }
  } catch (e) {
    // leave as is
  }
  cleanDomain = cleanDomain.replace(/^www\./, '');

  return creds.find(c => {
    const d = c.domain.toLowerCase().trim().replace(/^www\./, '');
    return d === cleanDomain || cleanDomain.endsWith('.' + d);
  });
}
