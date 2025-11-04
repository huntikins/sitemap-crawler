import { logger } from '../logger.js';

export enum UrlStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface QueuedUrl {
  url: string;
  status: UrlStatus;
  error?: string;
  screenshotPath?: string;
  retryCount: number;
}

export class UrlQueue {
  private mainQueue = new Map<string, QueuedUrl>();
  private retryQueue = new Map<string, QueuedUrl>();
  private processingSet = new Set<string>();
  private maxConcurrency: number;
  private onStatusChange?: (url: string, status: UrlStatus) => void;

  constructor(maxConcurrency = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  setStatusChangeCallback(
    callback: (url: string, status: UrlStatus) => void
  ): void {
    this.onStatusChange = callback;
  }

  addUrls(urls: string[]): void {
    for (const url of urls) {
      if (!this.mainQueue.has(url) && !this.retryQueue.has(url)) {
        this.mainQueue.set(url, {
          url,
          status: UrlStatus.PENDING,
          retryCount: 0,
        });
      }
    }
    logger.info(`Added ${urls.length} URLs to queue`);
  }

  getNextUrl(): QueuedUrl | null {
    if (this.processingSet.size >= this.maxConcurrency) {
      return null;
    }

    // First check retry queue
    for (const [url, queuedUrl] of this.retryQueue.entries()) {
      if (queuedUrl.status === UrlStatus.PENDING) {
        this.processingSet.add(url);
        queuedUrl.status = UrlStatus.PROCESSING;
        this.notifyStatusChange(url, UrlStatus.PROCESSING);
        return queuedUrl;
      }
    }

    // Then check main queue
    for (const [url, queuedUrl] of this.mainQueue.entries()) {
      if (queuedUrl.status === UrlStatus.PENDING) {
        this.processingSet.add(url);
        queuedUrl.status = UrlStatus.PROCESSING;
        this.notifyStatusChange(url, UrlStatus.PROCESSING);
        return queuedUrl;
      }
    }

    return null;
  }

  markCompleted(url: string, screenshotPath: string): void {
    this.processingSet.delete(url);

    const queuedUrl = this.mainQueue.get(url) ?? this.retryQueue.get(url);
    if (queuedUrl) {
      queuedUrl.status = UrlStatus.COMPLETED;
      queuedUrl.screenshotPath = screenshotPath;
      this.notifyStatusChange(url, UrlStatus.COMPLETED);
    }
  }

  markFailed(url: string, error: string): void {
    this.processingSet.delete(url);

    const queuedUrl = this.mainQueue.get(url) ?? this.retryQueue.get(url);
    if (queuedUrl) {
      queuedUrl.status = UrlStatus.FAILED;
      queuedUrl.error = error;
      this.notifyStatusChange(url, UrlStatus.FAILED);

      // Move to retry queue
      this.mainQueue.delete(url);
      this.retryQueue.set(url, queuedUrl);
    }
  }

  retryUrl(url: string): void {
    const queuedUrl = this.retryQueue.get(url);
    if (queuedUrl) {
      queuedUrl.status = UrlStatus.PENDING;
      queuedUrl.retryCount++;
      queuedUrl.error = undefined;
      this.notifyStatusChange(url, UrlStatus.PENDING);
    }
  }

  retryAllFailed(): void {
    for (const [url, queuedUrl] of this.retryQueue.entries()) {
      if (queuedUrl.status === UrlStatus.FAILED) {
        this.retryUrl(url);
      }
    }
    logger.info('Retrying all failed URLs');
  }

  getFailedUrls(): QueuedUrl[] {
    return Array.from(this.retryQueue.values()).filter(
      (url) => url.status === UrlStatus.FAILED
    );
  }

  getAllUrls(): QueuedUrl[] {
    return Array.from(this.mainQueue.values()).concat(
      Array.from(this.retryQueue.values())
    );
  }

  getProgress(): {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    processing: number;
  } {
    const allUrls = this.getAllUrls();
    return {
      total: allUrls.length,
      completed: allUrls.filter((u) => u.status === UrlStatus.COMPLETED).length,
      failed: allUrls.filter((u) => u.status === UrlStatus.FAILED).length,
      pending: allUrls.filter((u) => u.status === UrlStatus.PENDING).length,
      processing: allUrls.filter((u) => u.status === UrlStatus.PROCESSING)
        .length,
    };
  }

  private notifyStatusChange(url: string, status: UrlStatus): void {
    if (this.onStatusChange) {
      this.onStatusChange(url, status);
    }
  }

  clear(): void {
    this.mainQueue.clear();
    this.retryQueue.clear();
    this.processingSet.clear();
  }
}
