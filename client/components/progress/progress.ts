import './progress.css';
import type { AlpineComponent } from 'alpinejs';

import { PROGRESS_CHANNEL, PROGRESS_TOPICS } from './progress.constants';
import type {
  IProgressComponent,
  ProgressData,
  UrlStatus,
} from './progress.interface';

export const progressComponent = (): AlpineComponent<IProgressComponent> => ({
  progress: {
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    processing: 0,
  },
  urls: [],
  hasJob: false,
  isProcessing: false,
  jobId: null,
  progressPercent: 0,
  pollInterval: null,
  selectedImageUrl: null,
  selectedImagePath: null,
  imageDialog: null,

  init() {
    // Subscribe to form submit events
    window?.app?.bus?.subscribe?.(
      PROGRESS_CHANNEL,
      PROGRESS_TOPICS.UPDATE,
      (_datagram) => {
        void this.updateProgress();
      }
    );

    // Start polling when component is initialized
    void this.startPolling();

    // Initialize a11yDialog
    this.initializeDialog();
  },

  initializeDialog() {
    // Use Alpine's $nextTick to ensure DOM is ready
    this.$nextTick(() => {
      const tryInitialize = (retries = 10) => {
        const dialogElement = document.getElementById('image-dialog') as HTMLElement;
        if (dialogElement && (window as any).A11yDialog) {
          try {
            // Check if dialog is already initialized (by auto-instantiation from vendor)
            const instancesMap = (window as any).__a11yDialogInstances;
            const existingDialog = 
              (dialogElement as any)._a11yDialog || 
              instancesMap?.get('image-dialog') ||
              instancesMap?.get(dialogElement.id);
            
            if (existingDialog && typeof existingDialog.show === 'function') {
              this.imageDialog = existingDialog;
            } else {
              // Manually initialize if auto-instantiation hasn't happened yet
              this.imageDialog = new (window as any).A11yDialog(dialogElement);
              // Store reference for future access
              (dialogElement as any)._a11yDialog = this.imageDialog;
              if (instancesMap) {
                instancesMap.set('image-dialog', this.imageDialog);
                instancesMap.set(dialogElement.id, this.imageDialog);
              }
            }
          } catch (error) {
            console.error('Error initializing dialog:', error);
          }
        } else if (retries > 0) {
          // Retry if element or A11yDialog not available yet
          setTimeout(() => tryInitialize(retries - 1), 100);
        }
      };
      tryInitialize();
    });
  },
  
  getDialogInstance() {
    if (this.imageDialog && typeof this.imageDialog.show === 'function') {
      return this.imageDialog;
    }
    
    const dialogElement = document.getElementById('image-dialog') as HTMLElement;
    if (!dialogElement) {
      console.warn('Dialog element not found');
      return null;
    }
    
    const instancesMap = (window as any).__a11yDialogInstances;
    
    // Try to get existing instance from multiple sources
    const existingDialog = 
      (dialogElement as any)._a11yDialog || 
      instancesMap?.get('image-dialog') ||
      instancesMap?.get(dialogElement.id);
    
    if (existingDialog && typeof existingDialog.show === 'function') {
      this.imageDialog = existingDialog;
      return existingDialog;
    }
    
    // Create new instance if A11yDialog is available
    if ((window as any).A11yDialog) {
      try {
        this.imageDialog = new (window as any).A11yDialog(dialogElement);
        
        // Store reference for future access
        (dialogElement as any)._a11yDialog = this.imageDialog;
        
        // Store in global instances map
        if (!instancesMap) {
          (window as any).__a11yDialogInstances = new Map();
        }
        (window as any).__a11yDialogInstances.set('image-dialog', this.imageDialog);
        (window as any).__a11yDialogInstances.set(dialogElement.id, this.imageDialog);
        
        // Mark as initialized to prevent vendor from re-initializing
        dialogElement.setAttribute('data-a11y-dialog-initialized', 'true');
        
        return this.imageDialog;
      } catch (error) {
        console.error('Error creating dialog instance:', error);
        return null;
      }
    }
    
    console.warn('A11yDialog not available');
    return null;
  },

  startPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = window.setInterval(() => {
      void this.updateProgress();
    }, 2000); // Poll every 2 seconds
  },

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  },

  async updateProgress() {
    try {
      const response = await window.app.api?.getProgress();

      if (response) {
        this.hasJob = response.hasJob ?? false;
        this.isProcessing = response.isProcessing ?? false;
        this.jobId = response.jobId ?? null;

        if (response.progress) {
          this.progress = response.progress as ProgressData;
          const total = this.progress.total;
          this.progressPercent =
            total > 0
              ? Math.round((this.progress.completed / total) * 100)
              : 0;
        }

        if (response.urls) {
          this.urls = response.urls as UrlStatus[];
        }

        // Publish update event
        window?.app?.bus?.publish?.(PROGRESS_CHANNEL, PROGRESS_TOPICS.UPDATE, {
          progress: this.progress,
          urls: this.urls,
        });

        // If job is complete, trigger completion event
        if (
          !this.isProcessing &&
          this.progress.total > 0 &&
          this.progress.processing === 0 &&
          this.progress.pending === 0
        ) {
          window?.app?.bus?.publish?.(
            PROGRESS_CHANNEL,
            PROGRESS_TOPICS.COMPLETED,
            {
              jobId: this.jobId,
              progress: this.progress,
            }
          );
        }
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  },

  get canDownload() {
    return (
      this.hasJob &&
      !this.isProcessing &&
      this.progress.total > 0 &&
      this.progress.processing === 0 &&
      this.progress.pending === 0
    );
  },

  getProcessedUrls() {
    return this.urls.filter((u) => u.status === 'completed' && u.screenshotPath);
  },

  getScreenshotUrl(screenshotPath: string) {
    // Extract filename from path like 'screenshots/filename.png'
    const filename = screenshotPath.split('/').pop() || screenshotPath;
    return `/api/screenshots/${filename}`;
  },

  openImageModal(url: string, screenshotPath: string) {
    console.log('openImageModal called', { url, screenshotPath });
    
    // Validate inputs
    if (!url || !screenshotPath) {
      console.error('openImageModal: Missing required parameters', { url, screenshotPath });
      return;
    }
    
    // Set the image data first
    this.selectedImageUrl = url;
    this.selectedImagePath = screenshotPath;
    
    console.log('Image data set', {
      selectedImageUrl: this.selectedImageUrl,
      selectedImagePath: this.selectedImagePath
    });
    
    // Wait for Alpine to update the DOM with the new image data
    this.$nextTick(() => {
      console.log('$nextTick executed, getting dialog instance');
      const dialog = this.getDialogInstance();
      
      console.log('Dialog instance', {
        dialog,
        hasDialog: !!dialog,
        hasShow: dialog && typeof dialog.show === 'function',
        A11yDialog: !!(window as any).A11yDialog,
        element: !!document.getElementById('image-dialog')
      });
      
      if (dialog && typeof dialog.show === 'function') {
        try {
          console.log('Calling dialog.show()');
          dialog.show();
          console.log('dialog.show() called successfully');
          
          // Verify the dialog element state after show()
          const dialogElement = document.getElementById('image-dialog') as HTMLElement;
          if (dialogElement) {
            console.log('Dialog element state after show()', {
              ariaHidden: dialogElement.getAttribute('aria-hidden'),
              ariaModal: dialogElement.getAttribute('aria-modal'),
              computedDisplay: window.getComputedStyle(dialogElement).display,
              classList: Array.from(dialogElement.classList)
            });
          }
        } catch (error) {
          console.error('Error showing dialog:', error);
        }
      } else {
        console.error('Failed to get dialog instance', {
          dialog,
          hasDialog: !!dialog,
          hasShow: dialog && typeof dialog.show === 'function',
          A11yDialog: !!(window as any).A11yDialog,
          element: !!document.getElementById('image-dialog')
        });
      }
    });
  },

  closeImageModal() {
    if (this.imageDialog) {
      this.imageDialog.hide();
    }
    this.selectedImageUrl = null;
    this.selectedImagePath = null;
  },
});
