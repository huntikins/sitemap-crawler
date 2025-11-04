export class ApiService {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async generate(
    formData: FormData
  ): Promise<{ jobId?: string; totalUrls?: number; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as {
        jobId?: string;
        totalUrls?: number;
        error?: string;
      };

      if (!response.ok) {
        return { error: data.error ?? 'Failed to start job' };
      }

      return data;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async retry(payload: {
    url?: string;
    retryAll?: boolean;
  }): Promise<{ message?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        return { error: data.error ?? 'Failed to retry' };
      }

      return data;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getProgress(): Promise<{
    hasJob: boolean;
    jobId?: string;
    isProcessing?: boolean;
    progress?: {
      total: number;
      completed: number;
      failed: number;
      pending: number;
      processing: number;
    };
    urls?: {
      url: string;
      status: string;
      error?: string;
      screenshotPath?: string;
      retryCount: number;
    }[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/progress`);

      if (!response.ok) {
        return { hasJob: false };
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return { hasJob: false };
      }

      const data = (await response.json()) as {
        hasJob: boolean;
        jobId?: string;
        isProcessing?: boolean;
        progress?: {
          total: number;
          completed: number;
          failed: number;
          pending: number;
          processing: number;
        };
        urls?: {
          url: string;
          status: string;
          error?: string;
          screenshotPath?: string;
          retryCount: number;
        }[];
      };
      return data;
    } catch (error) {
      console.error('Error fetching progress:', error);
      return { hasJob: false };
    }
  }

  getDownloadUrl(jobId: string): string {
    return `${this.baseUrl}/api/download/${jobId}`;
  }
}
