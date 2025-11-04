import './button.css';
import type { AlpineComponent } from 'alpinejs';

import { BUTTON_CHANNEL, BUTTON_TYPES } from './button.constants';
import type { IButtonComponent } from './button.interface';

// Button Component Context
export const buttonComponent = (): AlpineComponent<IButtonComponent> => ({
  type: BUTTON_TYPES.ACTION,

  init() {
    this.type =
      (this.$root.getAttribute(
        'data-button-type'
      ) as (typeof BUTTON_TYPES)[keyof typeof BUTTON_TYPES]) ??
      BUTTON_TYPES.ACTION;
  },

  handleClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    // Get action from data attribute if provided
    const action = this.$root.getAttribute('data-action');
    const payload = this.$root.getAttribute('data-payload');

    window?.app?.bus?.publish?.(BUTTON_CHANNEL, this.type, {
      action: action ?? null,
      payload: payload ? (JSON.parse(payload) as unknown) : null,
      element: this.$root,
    });
  },
});
