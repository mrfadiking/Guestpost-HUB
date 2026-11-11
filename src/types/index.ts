export type CMSPlatform = 
  | 'WordPress'
  | 'Blogger'
  | 'Drupal'
  | 'Ghost'
  | 'Webflow'
  | 'Shopify'
  | 'Medium'
  | 'Custom / Static'
  | 'Unknown';

export type AccountStatus = 
  | 'Detected'
  | 'Account Setup Pending'
  | 'Verification Required'
  | 'Connected'
  | 'Manual Action Required'
  | 'Unsupported';

export type ContentStatus = 
  | 'Pending'
  | 'Importing'
  | 'Content Imported'
  | 'Import Failed';

export type SubmissionStatus = 
  | 'Pending'
  | 'Ready for Review'
  | 'Submitted'
  | 'Publisher Review Pending'
  | 'Draft Created'
  | 'Failed';

export type PublicationStatus = 
  | 'Pending'
  | 'Draft Created'
  | 'Published'
  | 'Verified Live'
  | 'Failed'
  | 'Manual Action Required'
  | 'Unsupported';

export type VerificationStatus = 
  | 'Unverified'
  | 'Verifying...'
  | 'Verified Live'
  | 'Verification Failed'
  | 'Not Published';

export interface ActionRequiredItem {
  type: 'email_verification' | 'auth_missing' | 'publisher_approval' | 'unsupported_cms' | 'captcha_2fa';
  title: string;
  description: string;
  suggestedAction: string;
  portalUrl?: string;
}

export interface BatchItem {
  id: string;
  lineIndex: number;
  websiteUrl: string;
  domain: string;
  docUrl: string;
  docId?: string;
  
  // Statuses requested by user specification
  cms: CMSPlatform | string;
  accountStatus: AccountStatus;
  contentStatus: ContentStatus;
  submissionStatus: SubmissionStatus;
  publicationStatus: PublicationStatus;
  verificationStatus: VerificationStatus;

  // Extracted Document Data
  articleTitle: string;
  articleContent: string;
  articleHeadings: string[];
  articleWordCount: number;
  articleLinks: { text: string; url: string }[];
  articleImagesCount: number;

  // Publishing & Live URLs
  liveArticleUrl?: string;
  submissionDate?: string;
  publicationDate?: string;

  // Inspection details
  apiAvailable: boolean;
  authMethods: string[];
  registrationAllowed: boolean;
  errorDetails?: string;
  actionRequired?: ActionRequiredItem;
  
  // Processing state
  isProcessing: boolean;
  stepMessage?: string;
}

export interface CMSDetectionResult {
  url: string;
  cms: string;
  confidence: 'high' | 'medium' | 'low';
  apiAvailable: boolean;
  authMethods: string[];
  registrationAllowed: boolean;
  restEndpoint?: string | null;
  details?: string;
  error?: string;
}

export interface VerificationResult {
  verified: boolean;
  statusCode: number;
  pageTitle?: string;
  contentLength?: number;
  titleMatched?: boolean;
  reason: string;
}

export interface StoredCredential {
  domain: string;
  cms: CMSPlatform | string;
  username: string;
  appPassword?: string;
  apiToken?: string;
  lastUpdated: string;
}
