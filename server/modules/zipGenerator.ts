import { createWriteStream, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

import archiver from 'archiver';

import { defaultConfig } from '../config.js';
import { logger } from '../logger.js';

export class ZipGenerator {
  async createZip(
    csvPath: string,
    screenshotsDir: string,
    jobId: string
  ): Promise<string> {
    const tmpDir = defaultConfig.storage.tmp;
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }

    const zipPath = join(tmpDir, `screenshots-${jobId}.zip`);
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        logger.info(`ZIP file created: ${zipPath}`);
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        logger.error('Error creating ZIP', err);
        reject(err);
      });

      archive.pipe(output);

      // Add CSV file
      if (existsSync(csvPath)) {
        archive.file(csvPath, { name: 'screenshots.csv' });
      }

      // Add screenshots directory
      if (existsSync(screenshotsDir)) {
        archive.directory(screenshotsDir, 'screenshots');
      }

      void archive.finalize();
    });
  }

  cleanup(jobId: string): void {
    const tmpDir = defaultConfig.storage.tmp;
    const zipPath = join(tmpDir, `screenshots-${jobId}.zip`);

    if (existsSync(zipPath)) {
      rmSync(zipPath);
      logger.debug(`Cleaned up ZIP file: ${zipPath}`);
    }
  }
}

