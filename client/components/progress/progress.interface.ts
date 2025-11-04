export interface UrlStatus {
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  screenshotPath?: string;
  retryCount: number;
}

export interface ProgressData {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
}

export interface IProgressComponent {
  progress: ProgressData;
  urls: UrlStatus[];
  hasJob: boolean;
  isProcessing: boolean;
  jobId: string | null;
  progressPercent: number;
  pollInterval: number | null;
  canDownload: boolean;
  selectedImageUrl: string | null;
  selectedImagePath: string | null;
  imageDialog: {
    show: () => void;
    hide: () => void;
  } | null;
  initializeDialog: () => void;
  getDialogInstance: () => {
    show: () => void;
    hide: () => void;
  } | null;
  startPolling: () => void;
  stopPolling: () => void;
  updateProgress: () => Promise<void>;
  openImageModal: (url: string, screenshotPath: string) => void;
  closeImageModal: () => void;
  getProcessedUrls: () => UrlStatus[];
  getScreenshotUrl: (screenshotPath: string) => string;
}
