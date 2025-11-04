import Alpine from 'alpinejs';
// @ts-ignore
import collapse from '@alpinejs/collapse';
import { buttonComponent } from '../../components/button/button';
import { formComponent } from '../../components/form/form';
import { progressComponent } from '../../components/progress/progress';
import { retryComponent } from '../../components/retry/retry';



document.addEventListener('alpine:init', () => {
    // Register Alpine plugins
Alpine.plugin(collapse);
  // Register Components
  Alpine.data('button', buttonComponent);
  Alpine.data('form', formComponent);
  Alpine.data('progress', progressComponent);
  Alpine.data('retry', retryComponent);
});

// Register Alpine to the window
window.Alpine = Alpine;
Alpine.start();
