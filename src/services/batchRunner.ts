import { BatchItem, CMSDetectionResult, VerificationResult } from '../types';
import { importGoogleDoc } from './googleDocs';
import { findCredentialForDomain } from './credentialStore';
import { persistBatchItem, recordWebsite, logActivity } from './firestoreService';

export interface BatchRunCallbacks {
  onItemUpdate: (item: BatchItem) => void;
  onLog?: (msg: string) => void;
}

/**
 * Executes the complete 17-step pipeline on a single BatchItem
 */
export async function processBatchItem(
  item: BatchItem,
  callbacks: BatchRunCallbacks
): Promise<BatchItem> {
  const update = (patch: Partial<BatchItem>): BatchItem => {
    Object.assign(item, patch);
    callbacks.onItemUpdate({ ...item });
    persistBatchItem({ ...item }).catch(() => {});
    return item;
  };

  update({ isProcessing: true, stepMessage: 'Validating website and document links...' });

  // STEP 1 & 2: URL VALIDATION
  let validSiteUrl = item.websiteUrl.trim();
  if (!validSiteUrl.startsWith('http://') && !validSiteUrl.startsWith('https://')) {
    validSiteUrl = 'https://' + validSiteUrl;
    item.websiteUrl = validSiteUrl;
  }

  try {
    const parsed = new URL(validSiteUrl);
    item.domain = parsed.hostname.replace(/^www\./, '');
  } catch (err) {
    return update({
      isProcessing: false,
      cms: 'Unknown',
      accountStatus: 'Unsupported',
      submissionStatus: 'Failed',
      publicationStatus: 'Failed',
      verificationStatus: 'Not Published',
      errorDetails: 'Invalid Website URL format. Expected valid domain (e.g., https://example.com)',
      stepMessage: 'Failed: Invalid Website URL',
    });
  }

  // STEP 3 & 4: IMPORT GOOGLE DOC
  update({
    contentStatus: 'Importing',
    stepMessage: 'Importing original article from Google Docs...',
  });

  try {
    const docData = await importGoogleDoc(item.docUrl);
    update({
      docId: docData.docId,
      articleTitle: docData.title,
      articleContent: docData.body,
      articleHeadings: docData.headings,
      articleWordCount: docData.wordCount,
      articleLinks: docData.links,
      articleImagesCount: docData.imagesCount,
      contentStatus: 'Content Imported',
      stepMessage: `Imported "${docData.title}" (${docData.wordCount} words)`,
    });
  } catch (docErr: any) {
    update({
      contentStatus: 'Import Failed',
      submissionStatus: 'Failed',
      publicationStatus: 'Failed',
      errorDetails: `Google Doc Access Denied: ${docErr.message || 'Cannot access document'}`,
      actionRequired: {
        type: 'auth_missing',
        title: 'Google Doc Access Restricted',
        description: 'Document cannot be accessed. Ensure link sharing is enabled or sign in with Google.',
        suggestedAction: 'Connect Google Workspace or set doc share to Anyone with link',
      },
      stepMessage: 'Google Doc import failed',
    });
    // We continue with CMS detection even if doc failed, to report site eligibility
  }

  // STEP 5 & 6: CMS DETECTION & PUBLISHING METHODS INSPECTION
  update({
    stepMessage: 'Inspecting website headers, CMS signatures, and REST endpoints...',
  });

  let detection: CMSDetectionResult;
  try {
    const detRes = await fetch('/api/detect-cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: item.websiteUrl }),
    });

    if (!detRes.ok) {
      throw new Error(`CMS detection server returned status ${detRes.status}`);
    }

    detection = await detRes.json();
    recordWebsite({
      url: item.websiteUrl,
      domain: item.domain,
      cms: detection.cms || 'Unknown',
      apiAvailable: detection.apiAvailable || false,
      registrationAllowed: detection.registrationAllowed || false,
      authMethods: detection.authMethods || ['Publisher Portal Manual'],
      lastChecked: new Date().toISOString(),
      notes: detection.details,
    }).catch(() => {});
    update({
      cms: detection.cms || 'Unknown',
      apiAvailable: detection.apiAvailable || false,
      authMethods: detection.authMethods || ['Publisher Portal Manual'],
      registrationAllowed: detection.registrationAllowed || false,
      accountStatus: 'Detected',
    });
  } catch (detErr: any) {
    detection = {
      url: item.websiteUrl,
      cms: 'Unknown',
      confidence: 'low',
      apiAvailable: false,
      authMethods: ['Manual Review'],
      registrationAllowed: false,
      error: detErr.message,
    };
    update({
      cms: 'Unknown',
      errorDetails: 'CMS Not Detected: Unable to inspect target website response',
      accountStatus: 'Unsupported',
    });
  }

  // STEP 7 & 8: CHECK AUTHORIZATION & CREDENTIALS
  update({
    stepMessage: 'Checking authorization and account connections...',
  });

  const credential = findCredentialForDomain(item.domain);
  const isWp = item.cms.toLowerCase().includes('wordpress');

  if (credential && credential.appPassword) {
    update({
      accountStatus: 'Connected',
      stepMessage: `Authorized connection found for ${item.domain} (${credential.username})`,
    });
  } else {
    // Determine needed action
    if (isWp) {
      if (detection.apiAvailable) {
        update({
          accountStatus: 'Account Setup Pending',
          submissionStatus: 'Ready for Review',
          publicationStatus: 'Manual Action Required',
          errorDetails: 'Authorization Missing: WordPress REST API active, but publisher credentials not yet connected.',
          actionRequired: {
            type: 'auth_missing',
            title: `Authorization Missing for ${item.domain}`,
            description: 'WordPress REST API is accessible. Please add publisher Application Password in Admin Settings to publish or create drafts automatically.',
            suggestedAction: 'Add credentials in Admin Settings',
          },
          stepMessage: 'Awaiting WordPress publishing authorization',
        });
      } else {
        update({
          accountStatus: 'Verification Required',
          submissionStatus: 'Publisher Review Pending',
          publicationStatus: 'Manual Action Required',
          errorDetails: 'REST API not publicly advertised. Publisher manual review required.',
          actionRequired: {
            type: 'publisher_approval',
            title: `Publisher Review Required: ${item.domain}`,
            description: 'This WordPress publisher requires editorial approval or manual contributor login.',
            suggestedAction: 'Submit via publisher contributor portal',
            portalUrl: `${item.websiteUrl}/wp-login.php`,
          },
          stepMessage: 'Publisher review required',
        });
      }
    } else if (item.cms === 'Custom / Static' || item.cms === 'Unknown') {
      update({
        accountStatus: 'Unsupported',
        submissionStatus: 'Failed',
        publicationStatus: 'Unsupported',
        errorDetails: 'Publishing API Not Available: Target platform does not support standard authorized REST publishing.',
        actionRequired: {
          type: 'unsupported_cms',
          title: `Unsupported CMS on ${item.domain}`,
          description: 'No authorized remote publishing API detected. Direct editorial contact or email submission is required.',
          suggestedAction: 'Contact editor directly with article text',
        },
        stepMessage: 'Platform does not support remote REST API publishing',
      });
      return update({ isProcessing: false });
    } else {
      // Other CMS (Blogger, Drupal, Ghost, etc.)
      update({
        accountStatus: 'Account Setup Pending',
        submissionStatus: 'Publisher Review Pending',
        publicationStatus: 'Manual Action Required',
        errorDetails: `Publisher credentials or review token required for ${item.cms}.`,
        actionRequired: {
          type: 'publisher_approval',
          title: `${item.cms} Publisher Connection Required`,
          description: `Authorized publishing on ${item.cms} requires API access token or editorial portal approval.`,
          suggestedAction: 'Review publisher editorial guidelines',
        },
        stepMessage: `Requires ${item.cms} authorization`,
      });
    }
  }

  // STEP 9 - 13: SUBMISSION & PUBLISHING (IF AUTHORIZED)
  if (isWp && credential && credential.appPassword && item.contentStatus === 'Content Imported') {
    update({
      stepMessage: 'Submitting article to WordPress REST API...',
      submissionDate: new Date().toISOString().split('T')[0],
    });

    try {
      const restEndpoint = `${item.websiteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
      const publishRes = await fetch('/api/publish/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: restEndpoint,
          username: credential.username,
          appPassword: credential.appPassword,
          title: item.articleTitle,
          content: item.articleContent.replace(/\n\n/g, '<p></p>'),
          status: 'draft', // User requested: create authorized draft or submit for review
        }),
      });

      const publishData = await publishRes.json();

      if (publishRes.ok && publishData.success) {
        const liveUrl = publishData.link || `${item.websiteUrl}/?p=${publishData.id}`;
        update({
          submissionStatus: 'Draft Created',
          publicationStatus: publishData.status === 'publish' ? 'Published' : 'Draft Created',
          liveArticleUrl: liveUrl,
          publicationDate: new Date().toISOString().split('T')[0],
          stepMessage: `Draft successfully created on WordPress (#${publishData.id})`,
        });

        // STEP 14 & 15: LIVE URL VERIFICATION
        if (publishData.status === 'publish') {
          update({
            verificationStatus: 'Verifying...',
            stepMessage: 'Verifying public article accessibility and content match...',
          });

          const verRes = await fetch('/api/verify-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: liveUrl,
              expectedTitle: item.articleTitle,
            }),
          });

          const verData: VerificationResult = await verRes.json();
          if (verData.verified) {
            update({
              publicationStatus: 'Verified Live',
              verificationStatus: 'Verified Live',
              stepMessage: 'Verified Live: Article is publicly viewable and content verified',
            });
          } else {
            update({
              verificationStatus: 'Verification Failed',
              errorDetails: `Publication Not Verified: ${verData.reason}`,
              stepMessage: 'Verification failed: Page not yet indexed or pending cache refresh',
            });
          }
        } else {
          update({
            verificationStatus: 'Not Published',
            stepMessage: 'Authorized draft created. Pending publisher editorial review.',
          });
        }
      } else {
        update({
          submissionStatus: 'Failed',
          publicationStatus: 'Failed',
          errorDetails: `Submission Rejected: ${publishData.error || 'WordPress refused post creation'}`,
          actionRequired: {
            type: 'auth_missing',
            title: 'WordPress REST API Rejected Post',
            description: publishData.error || 'Application password or permissions invalid.',
            suggestedAction: 'Verify WordPress user role has contributor/author rights',
          },
          stepMessage: 'WordPress post creation rejected',
        });
      }
    } catch (wpErr: any) {
      update({
        submissionStatus: 'Failed',
        publicationStatus: 'Failed',
        errorDetails: `Submission Error: ${wpErr.message}`,
        stepMessage: 'Failed to communicate with WordPress REST API',
      });
    }
  }

  // STEP 16: FINALIZE RESULTS
  update({ isProcessing: false });
  return item;
}

/**
 * Runs batch processing sequentially across all items, ensuring failures in one item
 * do not interrupt the remaining batch.
 */
export async function runBatch(
  items: BatchItem[],
  callbacks: BatchRunCallbacks,
  signal?: AbortSignal
): Promise<BatchItem[]> {
  const results: BatchItem[] = [];

  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) {
      callbacks.onLog?.('Batch processing cancelled by user.');
      break;
    }

    const currentItem = items[i];
    callbacks.onLog?.(`[${i + 1}/${items.length}] Processing ${currentItem.websiteUrl}...`);

    try {
      const processed = await processBatchItem(currentItem, callbacks);
      results.push(processed);
    } catch (unexpectedErr: any) {
      console.error(`Error processing item ${currentItem.websiteUrl}:`, unexpectedErr);
      const failed = {
        ...currentItem,
        isProcessing: false,
        errorDetails: `Unexpected batch error: ${unexpectedErr.message || 'System fault'}`,
        publicationStatus: 'Failed' as const,
        submissionStatus: 'Failed' as const,
      };
      callbacks.onItemUpdate(failed);
      results.push(failed);
    }
  }

  return results;
}
