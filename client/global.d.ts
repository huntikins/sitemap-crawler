import type Alpine from 'alpinejs';

import type { ApiService } from './services/api/api.service';
import type { EventBus } from './services/event-bus/event-bus.service';

declare global {
  interface Window {
    Alpine: Alpine;
    app: {
      bus: EventBus;
      api?: ApiService;
    };
  }
}

export {};
