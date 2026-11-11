import { getAccessToken } from './googleAuth';

export interface ExtractedDocContent {
  docId: string;
  title: string;
  body: string;
  headings: string[];
  paragraphs: string[];
  links: { text: string; url: string }[];
  imagesCount: number;
  wordCount: number;
  rawText: string;
}

/**
 * Extracts Google Document ID from various Google Docs URL structures:
 * - https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * - https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/
 */
export function extractDocId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  return match && match[1] ? match[1] : null;
}

/**
 * Imports a Google Doc using authorized Google Docs API (v1),
 * with graceful fallback to public text export if token is not available.
 */
export async function importGoogleDoc(docUrl: string): Promise<ExtractedDocContent> {
  const docId = extractDocId(docUrl);
  if (!docId) {
    throw new Error('Invalid Google Docs URL format. Must contain /document/d/<document-id>');
  }

  const accessToken = await getAccessToken();

  // 1. If user is authenticated with Google Docs OAuth scope, call official Docs REST API
  if (accessToken) {
    try {
      const response = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const docData = await response.json();
        return parseGoogleDocApiResponse(docId, docData);
      } else if (response.status === 403 || response.status === 404) {
        // Permission denied or doc not found under this account, try public export fallback
        console.warn(`Direct Docs API returned ${response.status}. Attempting public export fallback...`);
      }
    } catch (apiErr) {
      console.warn('Direct Docs API call failed, attempting fallback...', apiErr);
    }
  }

  // 2. Fallback: server-side public export handler
  const res = await fetch('/api/fetch-doc-public', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docUrl }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Google Doc Access Denied. Please connect your Google account or ensure the document link sharing is set to Anyone with link.');
  }

  const data = await res.json();
  const headings = (data.paragraphs || [])
    .filter((p: string) => p.length < 90 && (p.startsWith('#') || p.endsWith(':') || /^[A-Z0-9 ]+$/.test(p)))
    .slice(0, 5);

  return {
    docId,
    title: data.title || 'Imported Document',
    body: data.body || '',
    headings,
    paragraphs: data.paragraphs || [],
    links: [],
    imagesCount: 0,
    wordCount: data.wordCount || 0,
    rawText: data.body || '',
  };
}

/**
 * Parses full structural elements from the official Google Docs API response
 */
function parseGoogleDocApiResponse(docId: string, docData: any): ExtractedDocContent {
  const title = docData.title || 'Untitled Document';
  const headings: string[] = [];
  const paragraphs: string[] = [];
  const links: { text: string; url: string }[] = [];
  let fullBodyText = '';

  const content = docData.body?.content || [];

  for (const element of content) {
    if (element.paragraph) {
      const style = element.paragraph.paragraphStyle?.namedStyleType || 'NORMAL_TEXT';
      let paragraphText = '';

      for (const el of element.paragraph.elements || []) {
        if (el.textRun) {
          const runText = el.textRun.content || '';
          paragraphText += runText;

          if (el.textRun.textStyle?.link?.url) {
            links.push({
              text: runText.trim(),
              url: el.textRun.textStyle.link.url,
            });
          }
        }
      }

      const trimmed = paragraphText.trim();
      if (trimmed) {
        paragraphs.push(trimmed);
        fullBodyText += trimmed + '\n\n';

        if (style.includes('HEADING') || style === 'SUBTITLE') {
          headings.push(trimmed);
        }
      }
    }
  }

  const imagesCount = Object.keys(docData.inlineObjects || {}).length;
  const wordCount = fullBodyText.split(/\s+/).filter(Boolean).length;

  return {
    docId,
    title,
    body: fullBodyText.trim(),
    headings,
    paragraphs,
    links,
    imagesCount,
    wordCount,
    rawText: fullBodyText.trim(),
  };
}
