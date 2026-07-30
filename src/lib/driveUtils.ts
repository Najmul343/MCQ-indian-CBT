/**
 * Utility functions for Google Drive Open Image Link Smart Conversion & Processing
 */

/**
 * Smartly converts Google Drive open/sharing links into direct embeddable image URLs
 * Supports formats like:
 * - https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I/view?usp=sharing
 * - https://drive.google.com/open?id=1A2B3C4D5E6F7G8H9I
 * - https://drive.google.com/uc?id=1A2B3C4D5E6F7G8H9I
 * - https://drive.google.com/uc?export=view&id=1A2B3C4D5E6F7G8H9I
 * - https://lh3.googleusercontent.com/d/1A2B3C4D5E6F7G8H9I
 * - Regular web URLs or Base64 data strings
 */
export function convertGoogleDriveUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return undefined;
  }

  // Check if it's a Google Drive link
  if (trimmed.includes('drive.google.com') || trimmed.includes('googleusercontent.com')) {
    const matchD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const matchLh3 = trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);

    const fileId = matchD?.[1] || matchId?.[1] || matchLh3?.[1];
    if (fileId) {
      // lh3.googleusercontent.com/d/FILE_ID is the most reliable direct image embed link for Drive
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // If standard web URL or data URI
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image')) {
    return trimmed;
  }

  return undefined;
}
