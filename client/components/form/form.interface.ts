export interface IFormComponent {
  urlInput: string;
  waitTime: number;
  viewportWidth: number;
  viewportHeight: number;
  imageFormat: 'png' | 'jpg';
  timeout: number;
  concurrency: number;
  isSubmitting: boolean;
  showAdvanced: boolean;
  isValidUrl: boolean;
  serviceStatus: 'idle' | 'starting' | 'ready';
  handleSubmit: () => void;
  validateUrl: () => void;
  toggleAdvanced: () => void;
}
