import { getAccessToken } from './googleAuth';
import { BatchItem } from '../types';

export const SHEET_COLUMNS = [
  'Website URL',
  'CMS',
  'Account Status',
  'Content Title',
  'Google Docs URL',
  'Submission Status',
  'Publication Status',
  'Live Article URL',
  'Publication Date',
  'Verification Status',
  'Error Details',
];

export interface SheetSyncResult {
  success: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowsUpdated: number;
  rowsInserted: number;
  message: string;
}

/**
 * Extracts Spreadsheet ID from URL or bare ID
 */
export function extractSpreadsheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return urlOrId.trim();
}

/**
 * Creates a new Google Spreadsheet specifically configured for GuestPost Hub Batch records
 */
export async function createBatchSpreadsheet(accessToken: string): Promise<{ id: string; url: string }> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `GuestPost Hub - Batch Submissions (${new Date().toISOString().split('T')[0]})`,
      },
      sheets: [
        {
          properties: {
            title: 'Submissions',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: SHEET_COLUMNS.map(col => ({
                    userEnteredValue: { stringValue: col },
                    userEnteredFormat: {
                      textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                      backgroundColor: { red: 0.12, green: 0.28, blue: 0.49 }, // Deep navy
                      horizontalAlignment: 'CENTER',
                    },
                  })),
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create new Google Spreadsheet');
  }

  const data = await response.json();
  return {
    id: data.spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

/**
 * Ensures header row exists with the 11 required columns
 */
async function ensureHeaders(spreadsheetId: string, accessToken: string) {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Submissions!A1:K1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (!data.values || data.values.length === 0 || data.values[0].length === 0) {
        // Write headers
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Submissions!A1:K1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: 'Submissions!A1:K1',
              majorDimension: 'ROWS',
              values: [SHEET_COLUMNS],
            }),
          }
        );
      }
    }
  } catch (e) {
    console.warn('Could not ensure headers on Submissions sheet, proceeding...', e);
  }
}

/**
 * Synchronizes batch items to connected Google Spreadsheet.
 * Updates existing rows matched by Website URL + Doc URL, or appends new rows.
 */
export async function syncBatchToGoogleSheets(
  items: BatchItem[],
  existingSpreadsheetId?: string
): Promise<SheetSyncResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Google Workspace authorization required. Please click "Sign in with Google" first.');
  }

  let spreadsheetId = existingSpreadsheetId ? extractSpreadsheetId(existingSpreadsheetId) : '';
  let spreadsheetUrl = '';

  // 1. If no spreadsheet ID provided, auto-create one
  if (!spreadsheetId) {
    const created = await createBatchSpreadsheet(accessToken);
    spreadsheetId = created.id;
    spreadsheetUrl = created.url;
  } else {
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    await ensureHeaders(spreadsheetId, accessToken);
  }

  // 2. Fetch existing rows to match keys (Website URL + Google Docs URL) to prevent duplicates
  let existingRows: string[][] = [];
  try {
    const readRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Submissions!A2:K500`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (readRes.ok) {
      const readData = await readRes.json();
      existingRows = readData.values || [];
    }
  } catch (err) {
    console.warn('Could not read existing sheet rows, will append records', err);
  }

  let rowsUpdated = 0;
  let rowsInserted = 0;
  const rowsToAppend: string[][] = [];

  for (const item of items) {
    // Columns:
    // 0: Website URL
    // 1: CMS
    // 2: Account Status
    // 3: Content Title
    // 4: Google Docs URL
    // 5: Submission Status
    // 6: Publication Status
    // 7: Live Article URL
    // 8: Publication Date
    // 9: Verification Status
    // 10: Error Details
    const rowValues = [
      item.websiteUrl,
      item.cms,
      item.accountStatus,
      item.articleTitle || 'Untitled Draft',
      item.docUrl,
      item.submissionStatus,
      item.publicationStatus,
      item.liveArticleUrl || 'N/A',
      item.publicationDate || item.submissionDate || new Date().toISOString().split('T')[0],
      item.verificationStatus,
      item.errorDetails || 'None',
    ];

    // Find if row exists (match websiteUrl [col 0] and docUrl [col 4])
    const existingIndex = existingRows.findIndex(
      row => (row[0] && row[0].toLowerCase().trim() === item.websiteUrl.toLowerCase().trim()) &&
             (row[4] && row[4].trim() === item.docUrl.trim())
    );

    if (existingIndex >= 0) {
      // Update existing row (index + 2 because row 1 is header, 1-indexed)
      const rowIndex = existingIndex + 2;
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Submissions!A${rowIndex}:K${rowIndex}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `Submissions!A${rowIndex}:K${rowIndex}`,
              majorDimension: 'ROWS',
              values: [rowValues],
            }),
          }
        );
        rowsUpdated++;
      } catch (upErr) {
        console.error(`Failed to update row ${rowIndex}:`, upErr);
      }
    } else {
      rowsToAppend.push(rowValues);
    }
  }

  // 3. Append remaining new rows
  if (rowsToAppend.length > 0) {
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Submissions!A:K:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: 'Submissions!A:K',
          majorDimension: 'ROWS',
          values: rowsToAppend,
        }),
      }
    );

    if (appendRes.ok) {
      rowsInserted = rowsToAppend.length;
    } else {
      const err = await appendRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to append rows to Google Sheet');
    }
  }

  return {
    success: true,
    spreadsheetId,
    spreadsheetUrl,
    rowsUpdated,
    rowsInserted,
    message: `Synchronized ${rowsUpdated} updated row(s) and ${rowsInserted} new row(s).`,
  };
}
