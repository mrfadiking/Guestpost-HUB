import express, { Request, Response } from 'express';

export const app = express();
app.use(express.json({ limit: '10mb' }));

// Helper to normalize and validate URL
export const normalizeUrl = (input: string): string => {
  let url = (input || '').trim();
  if (!url) return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
};

// SSRF Protection: verify host is not a private/reserved network address
export const isSafeUrl = (urlString: string): { safe: boolean; reason?: string } => {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Protocol must be http or https' };
    }

    const hostname = parsed.hostname.toLowerCase();
    
    // Check localhost & local names
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' // Cloud metadata service
    ) {
      return { safe: false, reason: 'Access to loopback or metadata addresses is restricted' };
    }

    // Check private IPv4 ranges (10.x.x.x, 192.168.x.x, 172.16.x.x - 172.31.x.x)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const b1 = parseInt(ipMatch[1], 10);
      const b2 = parseInt(ipMatch[2], 10);
      if (b1 === 10) return { safe: false, reason: 'Private network IP range 10.0.0.0/8 is restricted' };
      if (b1 === 127) return { safe: false, reason: 'Loopback IP range is restricted' };
      if (b1 === 169 && b2 === 254) return { safe: false, reason: 'Link-local metadata IP range is restricted' };
      if (b1 === 172 && b2 >= 16 && b2 <= 31) return { safe: false, reason: 'Private network IP range 172.16.0.0/12 is restricted' };
      if (b1 === 192 && b2 === 168) return { safe: false, reason: 'Private network IP range 192.168.0.0/16 is restricted' };
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, reason: 'Malformed URL: ' + err.message };
  }
};

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    name: 'GuestPost Hub API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: ['cms-detection', 'wordpress-rest', 'url-verification', 'google-docs-export'],
  });
});

// API 1: CMS Detection & Publishing Method Inspection
app.post('/api/detect-cms', async (req: Request, res: Response) => {
  try {
    const { url: rawUrl } = req.body;
    if (!rawUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const targetUrl = normalizeUrl(rawUrl);
    const ssrfCheck = isSafeUrl(targetUrl);
    if (!ssrfCheck.safe) {
      return res.status(400).json({ error: ssrfCheck.reason || 'Restricted URL' });
    }

    const parsedUrl = new URL(targetUrl);
    const origin = parsedUrl.origin;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response: globalThis.Response | null = null;
    let html = '';
    const headers: Record<string, string> = {};

    try {
      response = await fetch(origin, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 GuestPostHub/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      html = await response.text();
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      return res.json({
        url: targetUrl,
        cms: 'Unknown',
        confidence: 'low',
        apiAvailable: false,
        authMethods: ['Manual Publisher Review'],
        registrationAllowed: false,
        error: fetchErr.name === 'AbortError' ? 'Connection timed out' : 'Could not reach target website',
        details: 'Unable to inspect HTTP headers or HTML markup',
      });
    }

    // 1. Check WordPress indicators
    const isWpLink = headers['link'] && headers['link'].includes('https://api.w.org/');
    const hasWpMeta = /<meta[^>]*name=["']generator["'][^>]*content=["'][^"']*WordPress[^"']*["']/i.test(html);
    const hasWpPaths = html.includes('/wp-content/') || html.includes('/wp-includes/') || html.includes('wp-json');
    const hasWpHeader = headers['x-powered-by']?.toLowerCase().includes('wordpress');

    if (isWpLink || hasWpMeta || hasWpPaths || hasWpHeader) {
      let wpApiAvailable = false;
      const wpAuthMethods: string[] = [];

      try {
        const wpController = new AbortController();
        const wpTimeout = setTimeout(() => wpController.abort(), 4000);
        const wpRes = await fetch(`${origin}/wp-json/`, {
          signal: wpController.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(wpTimeout);
        if (wpRes.ok) {
          const wpData: any = await wpRes.json();
          if (wpData && (wpData.namespaces || wpData.name)) {
            wpApiAvailable = true;
            if (wpData.authentication) {
              if (wpData.authentication['application-passwords']) {
                wpAuthMethods.push('Application Passwords');
              }
              if (wpData.authentication['oauth2'] || wpData.authentication['oauth1']) {
                wpAuthMethods.push('OAuth');
              }
            }
            if (wpAuthMethods.length === 0) {
              wpAuthMethods.push('REST API Bearer / Basic Auth');
            }
          }
        }
      } catch (e) {
        // REST API protected or firewalled
      }

      return res.json({
        url: targetUrl,
        cms: 'WordPress',
        confidence: 'high',
        apiAvailable: wpApiAvailable,
        authMethods: wpAuthMethods.length > 0 ? wpAuthMethods : ['REST API (Application Passwords)', 'Publisher Portal Manual'],
        registrationAllowed: html.includes('wp-login.php?action=register') || wpApiAvailable,
        restEndpoint: wpApiAvailable ? `${origin}/wp-json/wp/v2/posts` : null,
        details: wpApiAvailable 
          ? 'WordPress REST API detected and active at /wp-json/' 
          : 'WordPress detected via theme and asset structure. REST API requires authorization or is protected.',
      });
    }

    // 2. Check Drupal
    const isDrupalHeader = headers['x-generator']?.toLowerCase().includes('drupal') || headers['x-drupal-cache'] !== undefined;
    const hasDrupalMeta = /<meta[^>]*name=["']generator["'][^>]*content=["'][^"']*Drupal[^"']*["']/i.test(html);
    const hasDrupalPaths = html.includes('/sites/default/files/') || html.includes('drupal.js') || html.includes('/core/assets/');

    if (isDrupalHeader || hasDrupalMeta || hasDrupalPaths) {
      return res.json({
        url: targetUrl,
        cms: 'Drupal',
        confidence: 'high',
        apiAvailable: false,
        authMethods: ['JSON:API / REST (Requires Module)', 'Publisher Portal Manual'],
        registrationAllowed: html.includes('/user/register'),
        details: 'Drupal platform identified. Publishing requires authorized JSON:API credentials or editorial portal.',
      });
    }

    // 3. Check Ghost
    const hasGhostMeta = /<meta[^>]*name=["']generator["'][^>]*content=["'][^"']*Ghost[^"']*["']/i.test(html);
    const hasGhostAsset = html.includes('ghost-head') || html.includes('/public/ghost.js');

    if (hasGhostMeta || hasGhostAsset) {
      return res.json({
        url: targetUrl,
        cms: 'Ghost',
        confidence: 'high',
        apiAvailable: true,
        authMethods: ['Ghost Admin API (JWT/Key)', 'Publisher Portal Manual'],
        registrationAllowed: html.includes('/#/portal/signup'),
        details: 'Ghost publishing engine detected. Supports Admin API with custom integration key.',
      });
    }

    // 4. Check Blogger
    const hasBlogger = html.includes('blogger.com') || html.includes('blogspot.com') || /<meta[^>]*name=["']generator["'][^>]*content=["'][^"']*Blogger[^"']*["']/i.test(html);

    if (hasBlogger) {
      return res.json({
        url: targetUrl,
        cms: 'Blogger',
        confidence: 'high',
        apiAvailable: true,
        authMethods: ['Google Blogger API v3 (OAuth)', 'Publisher Portal Manual'],
        registrationAllowed: false,
        details: 'Google Blogger platform detected. Authorized access available via Google Blogger API.',
      });
    }

    // 5. Check Webflow
    const hasWebflow = html.includes('webflow.com') || html.includes('w-layout-') || /<meta[^>]*content=["'][^"']*Webflow[^"']*["']/i.test(html);

    if (hasWebflow) {
      return res.json({
        url: targetUrl,
        cms: 'Webflow',
        confidence: 'high',
        apiAvailable: true,
        authMethods: ['Webflow CMS API (Bearer Token)', 'Publisher Portal Manual'],
        registrationAllowed: false,
        details: 'Webflow site detected. Publishing supported via authorized Webflow CMS API token.',
      });
    }

    // 6. Check Shopify
    const hasShopify = html.includes('cdn.shopify.com') || headers['x-shopid'] !== undefined;
    if (hasShopify) {
      return res.json({
        url: targetUrl,
        cms: 'Shopify',
        confidence: 'high',
        apiAvailable: true,
        authMethods: ['Shopify Admin GraphQL / REST', 'Publisher Portal Manual'],
        registrationAllowed: html.includes('/account/register'),
        details: 'Shopify Blog detected. Requires authorized Admin API access or publisher account.',
      });
    }

    // 7. Check Medium / Substack
    if (parsedUrl.hostname.includes('medium.com') || html.includes('medium.com')) {
      return res.json({
        url: targetUrl,
        cms: 'Medium',
        confidence: 'high',
        apiAvailable: true,
        authMethods: ['Medium Integration Token', 'Publication Editor Submission'],
        registrationAllowed: true,
        details: 'Medium publication detected. Supports OAuth or authorized Integration Token submission.',
      });
    }

    // 8. Custom / Unknown CMS
    const metaGeneratorMatch = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i);
    const customGenerator = metaGeneratorMatch ? metaGeneratorMatch[1] : null;

    return res.json({
      url: targetUrl,
      cms: customGenerator || 'Custom / Static',
      confidence: customGenerator ? 'medium' : 'low',
      apiAvailable: false,
      authMethods: ['Publisher Editorial Submission', 'Manual Review Portal'],
      registrationAllowed: html.includes('signup') || html.includes('register'),
      details: customGenerator 
        ? `Detected generator: ${customGenerator}. Editorial review or manual connection required.`
        : 'Custom web architecture or static site. Automated REST endpoint not advertised; publisher review required.',
    });

  } catch (error: any) {
    console.error('Error in detect-cms:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// API 2: Public Article Live URL Verification
app.post('/api/verify-url', async (req: Request, res: Response) => {
  try {
    const { url: rawUrl, expectedTitle } = req.body;
    if (!rawUrl) {
      return res.status(400).json({ error: 'Live URL is required' });
    }

    const targetUrl = normalizeUrl(rawUrl);
    const ssrfCheck = isSafeUrl(targetUrl);
    if (!ssrfCheck.safe) {
      return res.status(400).json({ error: ssrfCheck.reason || 'Restricted URL' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 GuestPostHub-Verifier/2.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const statusCode = response.status;
    if (!response.ok) {
      return res.json({
        verified: false,
        statusCode,
        reason: `HTTP Status ${statusCode} returned from target URL`,
        pageTitle: '',
      });
    }

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '';

    let titleMatched = true;
    let matchedTerms: string[] = [];

    if (expectedTitle && expectedTitle.trim()) {
      const cleanExpected = expectedTitle.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
      const cleanActual = (pageTitle + ' ' + html.slice(0, 5000)).toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
      
      const words = cleanExpected.split(/\s+/).filter((w: string) => w.length > 3);
      const matches = words.filter((w: string) => cleanActual.includes(w));
      const matchRatio = words.length > 0 ? matches.length / words.length : 1;
      titleMatched = matchRatio >= 0.35;
      matchedTerms = matches;
    }

    const isVerified = response.ok && titleMatched && html.length > 300;

    return res.json({
      verified: isVerified,
      statusCode,
      pageTitle,
      contentLength: html.length,
      titleMatched,
      matchedTerms,
      reason: isVerified ? 'Verified Live & Accessible' : 'Page accessible but content does not sufficiently match expected article',
    });
  } catch (err: any) {
    return res.json({
      verified: false,
      statusCode: 0,
      reason: err.name === 'AbortError' ? 'Verification request timed out' : (err.message || 'Unable to connect to live URL'),
      pageTitle: '',
    });
  }
});

// API 3: Fallback Public Google Doc Exporter
app.post('/api/fetch-doc-public', async (req: Request, res: Response) => {
  try {
    const { docUrl } = req.body;
    if (!docUrl) {
      return res.status(400).json({ error: 'Google Doc URL required' });
    }

    const match = docUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      return res.status(400).json({ error: 'Invalid Google Docs URL format. Expected: https://docs.google.com/document/d/<id>/...' });
    }

    const docId = match[1];
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

    const response = await fetch(exportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GuestPostHub/2.0',
      },
    });

    if (!response.ok) {
      return res.status(403).json({
        error: 'Google Doc Access Denied or private document. Ensure document is shared or sign in with Google.',
        docId,
      });
    }

    const text = await response.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0] || 'Untitled Document';
    const body = lines.slice(1).join('\n\n');

    return res.json({
      docId,
      title,
      body,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      paragraphs: lines.slice(1),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch document' });
  }
});

// API 4: WordPress Authorized REST API Connection Test
app.post('/api/wordpress/test-connection', async (req: Request, res: Response) => {
  try {
    const { endpoint, username, appPassword } = req.body;
    if (!endpoint || !username || !appPassword) {
      return res.status(400).json({ error: 'Endpoint, username, and application password are required' });
    }

    const ssrfCheck = isSafeUrl(endpoint);
    if (!ssrfCheck.safe) {
      return res.status(400).json({ error: ssrfCheck.reason || 'Restricted endpoint URL' });
    }

    const cleanPassword = appPassword.replace(/\s+/g, '');
    const authHeader = 'Basic ' + Buffer.from(`${username}:${cleanPassword}`).toString('base64');

    // Test with /wp-json/wp/v2/users/me
    const baseWp = endpoint.replace(/\/wp\/v2\/posts\/?$/, '').replace(/\/$/, '');
    const testUrl = `${baseWp}/wp/v2/users/me`;

    const testRes = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    const userData: any = await testRes.json().catch(() => ({}));

    if (!testRes.ok) {
      return res.status(testRes.status).json({
        success: false,
        error: userData.message || `WordPress test failed with HTTP ${testRes.status}`,
        details: userData,
      });
    }

    return res.json({
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        slug: userData.slug,
        roles: userData.roles || [],
      },
      message: `Successfully connected to WordPress as "${userData.name}" (roles: ${(userData.roles || []).join(', ') || 'author'})`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Connection test failed' });
  }
});

// API 5: WordPress Authorized REST API Publish/Draft Endpoint
app.post('/api/publish/wordpress', async (req: Request, res: Response) => {
  try {
    const { endpoint, username, appPassword, title, content, status = 'draft' } = req.body;
    if (!endpoint || !username || !appPassword || !title) {
      return res.status(400).json({ error: 'Missing required WordPress publish parameters' });
    }

    const ssrfCheck = isSafeUrl(endpoint);
    if (!ssrfCheck.safe) {
      return res.status(400).json({ error: ssrfCheck.reason || 'Restricted endpoint URL' });
    }

    const cleanPassword = appPassword.replace(/\s+/g, '');
    const authHeader = 'Basic ' + Buffer.from(`${username}:${cleanPassword}`).toString('base64');

    const wpRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        title,
        content,
        status, // 'draft' | 'pending' | 'publish'
      }),
    });

    const wpData: any = await wpRes.json().catch(() => ({}));

    if (!wpRes.ok) {
      return res.status(wpRes.status).json({
        error: wpData.message || 'WordPress publication rejected',
        details: wpData,
      });
    }

    return res.json({
      success: true,
      id: wpData.id,
      link: wpData.link,
      status: wpData.status,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'WordPress API request failed' });
  }
});
