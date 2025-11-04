import './form.css';
import type { AlpineComponent } from 'alpinejs';

import { FORM_CHANNEL, FORM_TOPICS } from './form.constants';
import type { IFormComponent } from './form.interface';

export const formComponent = (): AlpineComponent<IFormComponent> => ({
  urlInput: '',
  waitTime: 2000,
  viewportWidth: 1920,
  viewportHeight: 1080,
  imageFormat: 'png',
  timeout: 30000,
  concurrency: 3,
  isSubmitting: false,
  showAdvanced: false,
  isValidUrl: false,
  serviceStatus: 'idle',

  init() {
    this.validateUrl();
  },

  validateUrl() {
    const trimmed = this.urlInput.trim();
    if (!trimmed) {
      this.isValidUrl = false;
      return;
    }

    // Check if it's a valid sitemap URL (ending with .xml or containing 'sitemap')
    try {
      const url = new URL(trimmed);
      this.isValidUrl = url.href.endsWith('.xml') || url.href.toLowerCase().includes('sitemap');
    } catch {
      this.isValidUrl = false;
    }
  },

  toggleAdvanced() {
    this.showAdvanced = !this.showAdvanced;
  },

  handleSubmit() {
    void (async () => {
    if (this.isSubmitting || !this.isValidUrl) return;

    this.isSubmitting = true;
    this.serviceStatus = 'starting';

    try {
      const formData = new FormData();
      const trimmed = this.urlInput.trim();

      // Only sitemap URLs are supported
      formData.append('sitemapUrl', trimmed);

      formData.append('waitTime', this.waitTime.toString());
      formData.append('viewportWidth', this.viewportWidth.toString());
      formData.append('viewportHeight', this.viewportHeight.toString());
      formData.append('imageFormat', this.imageFormat);
      formData.append('fullPage', 'true'); // Always true
      formData.append('timeout', this.timeout.toString());
      formData.append('concurrency', this.concurrency.toString());

      const response = await window.app.api?.generate(formData);

      if (response?.error) {
        this.serviceStatus = 'idle';
        window?.app?.bus?.publish?.(FORM_CHANNEL, FORM_TOPICS.SUBMIT, {
          error: response.error,
        });
      } else {
        this.serviceStatus = 'ready';
        window?.app?.bus?.publish?.(FORM_CHANNEL, FORM_TOPICS.SUBMIT, {
          jobId: response?.jobId,
          totalUrls: response?.totalUrls,
        });
        // Clear form after successful submission
        this.urlInput = '';
        this.validateUrl();
        // Reset status after a delay
        setTimeout(() => {
          this.serviceStatus = 'idle';
        }, 2000);
      }
    } catch (error) {
      this.serviceStatus = 'idle';
      window?.app?.bus?.publish?.(FORM_CHANNEL, FORM_TOPICS.SUBMIT, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.isSubmitting = false;
    }
    })();
  },
});
