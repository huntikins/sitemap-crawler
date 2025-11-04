export interface FailedUrl {
  url: string;
  status: string;
  error?: string;
  retryCount: number;
}

export interface IRetryComponent {
  failedUrls: FailedUrl[];
  isRetrying: boolean;
  loadFailedUrls: () => Promise<void>;
  retryUrl: (url: string) => Promise<void>;
  retryAll: () => Promise<void>;
}
