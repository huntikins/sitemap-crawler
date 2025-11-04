import { ApiService } from './services/api/api.service';
import { EventBus } from './services/event-bus/event-bus.service';
import { ThemeService } from './services/theme/theme.service';

import './vendor/alpine/alpine';
import './vendor/a11y-dialog/a11y-dialog';

const bus = new EventBus();
const api = new ApiService();
const theme = new ThemeService();

window.app = window.app ?? {};
window.app.bus = bus;
window.app.api = api;

// Load theme on page load
void theme.loadTheme();
