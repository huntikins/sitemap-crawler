import type { BUTTON_TYPES } from './button.constants';

export interface IButtonComponent {
  type: (typeof BUTTON_TYPES)[keyof typeof BUTTON_TYPES];
  handleClick: (event: Event) => void;
}
