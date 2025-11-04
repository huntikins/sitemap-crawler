import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import puppeteer, { Browser, Page } from 'puppeteer';

import { defaultConfig } from '../config.js';
import { logger } from '../logger.js';

export class ScreenshotWorker {
  private browser: Browser | null = null;
  private config = defaultConfig.screenshot;

  async initialize(): Promise<void> {
    if (!this.browser) {
      logger.info('Initializing Puppeteer browser');
      this.browser = await puppeteer.launch({
        headless: defaultConfig.puppeteer.headless,
        args: defaultConfig.puppeteer.args,
      });
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }
  }

  async captureScreenshot(
    url: string,
    outputPath: string,
    customConfig?: Partial<typeof defaultConfig.screenshot>
  ): Promise<void> {
    if (!this.browser) {
      await this.initialize();
    }

    const config = { ...this.config, ...customConfig };
    let page: Page | null = null;

    try {
      logger.debug(`Capturing screenshot: ${url}`);
      page = await this.browser!.newPage();

      await page.setViewport({
        width: config.viewportWidth,
        height: config.viewportHeight,
      });

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: config.timeout,
      });

      // Wait for additional time if specified
      if (config.waitTime > 0) {
        await page.waitForTimeout(config.waitTime);
      }

      // Ensure screenshots directory exists
      const screenshotsDir = defaultConfig.storage.screenshots;
      if (!existsSync(screenshotsDir)) {
        mkdirSync(screenshotsDir, { recursive: true });
      }

      const fullPath = join(screenshotsDir, outputPath);

      // Map 'jpg' to 'jpeg' for Puppeteer compatibility
      const imageFormat = config.imageFormat === 'jpg' ? 'jpeg' : config.imageFormat;

      await page.screenshot({
        path: fullPath,
        fullPage: config.fullPage,
        type: imageFormat,
      });

      logger.debug(`Screenshot saved: ${fullPath}`);
    } catch (error) {
      logger.error(`Failed to capture screenshot for ${url}`, error);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  generateFilename(url: string): string {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/\./g, '_');
    const pathname =
      urlObj.pathname.replace(/\//g, '_').replace(/^_|_$/g, '') || 'index';
    const timestamp = Date.now();
    const hash = Math.random().toString(36).substring(2, 9);
    const ext = this.config.imageFormat;
    return `${hostname}_${pathname}_${timestamp}_${hash}.${ext}`;
  }
}
