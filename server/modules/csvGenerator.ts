import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import { createObjectCsvWriter } from 'csv-writer';

import { defaultConfig } from '../config.js';
import { logger } from '../logger.js';

import { QueuedUrl } from './urlQueue.js';

export class CsvGenerator {
  private csvPath: string;
  private csvWriter: ReturnType<typeof createObjectCsvWriter> | null = null;

  constructor(jobId: string) {
    const tmpDir = defaultConfig.storage.tmp;
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }
    this.csvPath = join(tmpDir, `screenshots-${jobId}.csv`);
    this.initialize();
  }

  private initialize(): void {
    this.csvWriter = createObjectCsvWriter({
      path: this.csvPath,
      header: [
        { id: 'url', title: 'URL' },
        { id: 'screenshot', title: 'Screenshot' },
        { id: 'status', title: 'Status' },
      ],
    });
  }

  async appendUrl(urlData: QueuedUrl): Promise<void> {
    if (!this.csvWriter) {
      this.initialize();
    }

    const csvWriter = this.csvWriter;
    if (!csvWriter) {
      throw new Error('CSV writer failed to initialize');
    }

    try {
      const record = {
        url: urlData.url,
        screenshot: urlData.screenshotPath ?? '',
        status: urlData.status,
      };

      await csvWriter.writeRecords([record]);
      logger.debug(`Added URL to CSV: ${urlData.url}`);
    } catch (error) {
      logger.error('Error writing to CSV', error);
      throw error;
    }
  }

  async writeAll(urls: QueuedUrl[]): Promise<void> {
    if (!this.csvWriter) {
      this.initialize();
    }

    const csvWriter = this.csvWriter;
    if (!csvWriter) {
      throw new Error('CSV writer failed to initialize');
    }

    try {
      const records = urls.map((url) => ({
        url: url.url,
        screenshot: url.screenshotPath ?? '',
        status: url.status,
      }));

      await csvWriter.writeRecords(records);
      logger.info(`Wrote ${records.length} URLs to CSV`);
    } catch (error) {
      logger.error('Error writing CSV', error);
      throw error;
    }
  }

  getPath(): string {
    return this.csvPath;
  }
}
