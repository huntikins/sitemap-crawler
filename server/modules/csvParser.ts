import { logger } from '../logger.js';

export function parseCsv(csvText: string): string[] {
  try {
    const lines = csvText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const urls: string[] = [];

    // Check if first line looks like a header (common patterns)
    const firstLine = lines[0]?.toLowerCase();
    const isHeader =
      firstLine?.includes('url') ||
      firstLine?.includes('link') ||
      firstLine?.includes('http');

    const startIndex = isHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Handle CSV with quotes and commas
      const columns = line
        .split(',')
        .map((col) => col.trim().replace(/^"|"$/g, ''));

      // Take the first column that looks like a URL
      for (const col of columns) {
        if (isValidUrl(col)) {
          urls.push(col);
          break;
        }
      }
    }

    logger.info(`Parsed ${urls.length} URLs from CSV`);
    return urls;
  } catch (error) {
    logger.error('Error parsing CSV', error);
    throw error;
  }
}

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
