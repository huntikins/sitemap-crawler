import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ScreenshotConfig {
  waitTime: number;
  viewportWidth: number;
  viewportHeight: number;
  imageFormat: 'png' | 'jpg';
  fullPage: boolean;
  timeout: number;
  concurrency: number;
}

export interface ServerConfig {
  port: number;
  host: string;
  puppeteer: {
    headless: boolean;
    args: string[];
  };
  screenshot: ScreenshotConfig;
  storage: {
    tmp: string;
    logs: string;
    screenshots: string;
  };
  clientDist: string;
}

export const defaultConfig: ServerConfig = {
  port: 5173,
  host: 'localhost',
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  },
  screenshot: {
    waitTime: 2000,
    viewportWidth: 1920,
    viewportHeight: 1080,
    imageFormat: 'png',
    fullPage: true,
    timeout: 30000,
    concurrency: 3,
  },
  storage: {
    tmp: join(__dirname, 'tmp'),
    logs: join(__dirname, 'logs'),
    screenshots: join(__dirname, 'tmp', 'screenshots'),
  },
  clientDist: join(__dirname, '..', 'client', 'dist'),
};
