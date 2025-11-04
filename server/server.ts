import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import cors from 'cors';
import express, { Request, Response } from 'express';
import multer from 'multer';

import { defaultConfig } from './config.js';
import { logger } from './logger.js';
import { CsvGenerator } from './modules/csvGenerator.js';
import { ScreenshotWorker } from './modules/screenshotWorker.js';
import { parseSitemap } from './modules/sitemapParser.js';
import { QueuedUrl, UrlQueue } from './modules/urlQueue.js';
import { ZipGenerator } from './modules/zipGenerator.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Multer for parsing FormData
const upload = multer();

// Ensure directories exist
const ensureDirs = () => {
  if (!existsSync(defaultConfig.storage.tmp)) {
    mkdirSync(defaultConfig.storage.tmp, { recursive: true });
  }
  if (!existsSync(defaultConfig.storage.logs)) {
    mkdirSync(defaultConfig.storage.logs, { recursive: true });
  }
  if (!existsSync(defaultConfig.storage.screenshots)) {
    mkdirSync(defaultConfig.storage.screenshots, { recursive: true });
  }
};

ensureDirs();

// Global state
let currentJob: {
  id: string;
  queue: UrlQueue;
  worker: ScreenshotWorker;
  csvGenerator: CsvGenerator;
  zipGenerator: ZipGenerator;
  isProcessing: boolean;
} | null = null;

// Serve static files from client dist
if (existsSync(defaultConfig.clientDist)) {
  app.use(express.static(defaultConfig.clientDist));
  app.get('/', (req, res) => {
    res.sendFile(join(defaultConfig.clientDist, 'index.html'));
  });
}

// Process a single URL
async function processUrl(url: QueuedUrl): Promise<void> {
  if (!currentJob) return;

  const { queue, worker, csvGenerator } = currentJob;

  try {
    const filename = worker.generateFilename(url.url);
    await worker.captureScreenshot(url.url, filename);
    const screenshotPath = join('screenshots', filename);

    queue.markCompleted(url.url, screenshotPath);
    const updatedUrl = queue.getAllUrls().find((u) => u.url === url.url);
    if (updatedUrl) {
      await csvGenerator.appendUrl(updatedUrl);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    queue.markFailed(url.url, errorMessage);
    const updatedUrl = queue.getAllUrls().find((u) => u.url === url.url);
    if (updatedUrl) {
      await csvGenerator.appendUrl(updatedUrl);
    }
  }
}

// Process URLs with concurrency control
async function processQueue() {
  if (!currentJob?.isProcessing) {
    return;
  }

  const { queue } = currentJob;
  const processingPromises: Promise<void>[] = [];

  while (true) {
    // Check if all done
    const progress = queue.getProgress();
    if (progress.processing === 0 && progress.pending === 0) {
      // Wait for all processing promises to complete
      if (processingPromises.length > 0) {
        await Promise.all(processingPromises);
      }
      if (currentJob) {
        currentJob.isProcessing = false;
        logger.info('All URLs processed');
      }
      break;
    }

    // Get next URL to process
    const queuedUrl = queue.getNextUrl();
    if (queuedUrl) {
      // Process URL concurrently
      const promise = processUrl(queuedUrl).finally(() => {
        // Remove from processing promises when done
        const index = processingPromises.indexOf(promise);
        if (index > -1) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          processingPromises.splice(index, 1);
        }
      });
      processingPromises.push(promise);
      // Promise is tracked and awaited later in Promise.all(processingPromises)
      // Suppress floating promise warning - promise is awaited in Promise.all above
      void promise;
    } else {
      // Wait a bit before checking again if at max concurrency
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

// Generate job ID
function generateJobId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// API Routes

app.post(
  '/api/generate',
  upload.none(),
  (req: Request, res: Response) => {
    void (async () => {
    try {
      if (currentJob?.isProcessing) {
        return res.status(400).json({ error: 'A job is already in progress' });
      }

      const {
        sitemapUrl,
        concurrency,
      } = req.body as {
        sitemapUrl?: string;
        concurrency?: string;
      };

      if (!sitemapUrl) {
        return res.status(400).json({ error: 'Sitemap URL is required' });
      }

      const urlList = await parseSitemap(sitemapUrl);

      if (urlList.length === 0) {
        return res.status(400).json({ error: 'No valid URLs found in sitemap' });
      }

      // Parse concurrency as number (FormData sends strings)
      const concurrencyNum = concurrency
        ? parseInt(concurrency, 10)
        : defaultConfig.screenshot.concurrency;

      // Create new job
      const jobId = generateJobId();
      const queue = new UrlQueue(concurrencyNum);
      const worker = new ScreenshotWorker();
      const csvGenerator = new CsvGenerator(jobId);
      const zipGenerator = new ZipGenerator();

      queue.addUrls(urlList);

      currentJob = {
        id: jobId,
        queue,
        worker,
        csvGenerator,
        zipGenerator,
        isProcessing: true,
      };

      // Initialize worker and start processing
      worker
        .initialize()
        .then(() => {
          void processQueue().catch((error) => {
            logger.error('Error in processQueue', error);
            if (currentJob) {
              currentJob.isProcessing = false;
            }
          });
        })
        .catch((error) => {
          logger.error('Error initializing worker', error);
          if (currentJob) {
            currentJob.isProcessing = false;
          }
        })

      res.json({
        jobId,
        totalUrls: urlList.length,
        message: 'Job started',
      });
    } catch (error) {
      logger.error('Error in /api/generate', error);
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
    })();
  }
);

app.post('/api/retry', (req: Request, res: Response) => {
  try {
    if (!currentJob) {
      res.status(400).json({ error: 'No active job' });
      return;
    }

    const { url, retryAll } = req.body as {
      url?: string;
      retryAll?: boolean;
    };

    const startProcessing = (): void => {
      if (currentJob && !currentJob.isProcessing) {
        currentJob.isProcessing = true;
        void processQueue().catch((error) => {
          logger.error('Error in processQueue', error);
          if (currentJob) {
            currentJob.isProcessing = false;
          }
        });
      }
    };

    if (retryAll) {
      currentJob.queue.retryAllFailed();
      startProcessing();
      res.json({ message: 'Retrying all failed URLs' });
    } else if (url) {
      currentJob.queue.retryUrl(url);
      startProcessing();
      res.json({ message: 'Retrying URL' });
    } else {
      res.status(400).json({ error: 'No URL or retryAll specified' });
    }
  } catch (error) {
    logger.error('Error in /api/retry', error);
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
  }
});

app.get('/api/progress', (req: Request, res: Response) => {
  if (!currentJob) {
    return res.json({
      hasJob: false,
      progress: {
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        processing: 0,
      },
      urls: [],
    });
  }

  const progress = currentJob.queue.getProgress();
  const urls = currentJob.queue.getAllUrls();

  res.json({
    hasJob: true,
    jobId: currentJob.id,
    isProcessing: currentJob.isProcessing,
    progress,
    urls: urls.map((u) => ({
      url: u.url,
      status: u.status,
      error: u.error,
      screenshotPath: u.screenshotPath,
      retryCount: u.retryCount,
    })),
  });
});

app.get('/api/screenshots/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const screenshotPath = join(defaultConfig.storage.screenshots, filename);
    
    if (!existsSync(screenshotPath)) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }

    res.sendFile(screenshotPath);
  } catch (error) {
    logger.error('Error serving screenshot', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/download/:jobId', (req: Request, res: Response) => {
  void (async () => {
  try {
    const { jobId } = req.params;

    if (!currentJob?.id || currentJob.id !== jobId) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const progress = currentJob.queue.getProgress();
    if (progress.processing > 0 || progress.pending > 0) {
      return res.status(400).json({ error: 'Job is still processing' });
    }

    // Generate ZIP
    const csvPath = currentJob.csvGenerator.getPath();
    const screenshotsDir = defaultConfig.storage.screenshots;
    const zipPath = await currentJob.zipGenerator.createZip(
      csvPath,
      screenshotsDir,
      jobId
    );

    // Send ZIP file
    res.download(zipPath, `screenshots-${jobId}.zip`, (err) => {
      if (err) {
        logger.error('Error sending ZIP file', err);
      } else {
        // Cleanup after download
        currentJob?.zipGenerator.cleanup(jobId);
        logger.info(`ZIP downloaded and cleaned up for job ${jobId}`);
      }
    });
  } catch (error) {
    logger.error('Error in /api/download', error);
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
  }
  })();
});

// Error handling middleware
app.use(
  (err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down server...');
  if (currentJob?.worker) {
    void currentJob.worker.close().then(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

const PORT = defaultConfig.port;
const HOST = defaultConfig.host;

app.listen(PORT, HOST, () => {
  logger.info(`Server running on http://${HOST}:${PORT}`);
});
