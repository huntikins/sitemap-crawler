import './retry.css';
import type { AlpineComponent } from 'alpinejs';

import {
  PROGRESS_CHANNEL,
  PROGRESS_TOPICS,
} from '../progress/progress.constants';

import { RETRY_CHANNEL, RETRY_TOPICS } from './retry.constants';
import type { IRetryComponent } from './retry.interface';

export const retryComponent = (): AlpineComponent<IRetryComponent> => ({
  failedUrls: [],
  isRetrying: false,

  init() {
    // Subscribe to progress updates to get failed URLs
    window?.app?.bus?.subscribe?.(
      PROGRESS_CHANNEL,
      PROGRESS_TOPICS.UPDATE,
      () => {
        void this.loadFailedUrls();
      }
    );

    // Load failed URLs on init
    void this.loadFailedUrls();
  },

  async loadFailedUrls() {
    try {
      const response = await window?.app?.api?.getProgress();

      if (response?.urls) {
        this.failedUrls = response.urls
          .filter(
            (url: { status?: string }) => url.status === 'failed'
          )
          .map(
            (url: {
              url?: string;
              status?: string;
              error?: string;
              retryCount?: number;
            }) => ({
              url: url.url ?? '',
              status: url.status ?? 'failed',
              error: url.error,
              retryCount: url.retryCount ?? 0,
            })
          );

        if (this.failedUrls.length > 0) {
          window?.app?.bus?.publish?.(
            RETRY_CHANNEL,
            RETRY_TOPICS.FAILED_URLS_LOADED,
            {
              failedUrls: this.failedUrls,
            }
          );
        }
      }
    } catch (error) {
      console.error('Error loading failed URLs:', error);
    }
  },

  async retryUrl(url: string) {
    if (this.isRetrying) return;

    this.isRetrying = true;

    try {
      const response = await window?.app?.api?.retry({ url });

      if (response?.error) {
        window?.app?.bus?.publish?.(RETRY_CHANNEL, RETRY_TOPICS.RETRY_URL, {
          url,
          error: response.error,
        });
      } else {
        window?.app?.bus?.publish?.(RETRY_CHANNEL, RETRY_TOPICS.RETRY_URL, {
          url,
          success: true,
        });
        // Reload failed URLs after retry
        await this.loadFailedUrls();
      }
    } catch (error) {
      window?.app?.bus?.publish?.(RETRY_CHANNEL, RETRY_TOPICS.RETRY_URL, {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.isRetrying = false;
    }
  },

  async retryAll() {
    if (this.isRetrying) return;

    this.isRetrying = true;

    try {
      const response = await window?.app?.api?.retry({ retryAll: true });

      if (response?.error) {
        window?.app?.bus?.publish?.(RETRY_CHANNEL, RETRY_TOPICS.RETRY_ALL, {
          error: response.error,
        });
      } else {
        window?.app?.bus?.publish?.(RETRY_CHANNEL, RETRY_TOPICS.RETRY_ALL, {
          success: true,
        });
        // Reload failed URLs after retry
        await this.loadFailedUrls();
      }
    } catch (error) {
      window?.app?.bus?.publish?.(RETRY_CHANNEL, RETRY_TOPICS.RETRY_ALL, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.isRetrying = false;
    }
  },
});
