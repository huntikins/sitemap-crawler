export const BUTTON_TYPES = {
  ACTION: 'ACTION',
  CANCEL: 'CANCEL',
  CONFIRM: 'CONFIRM',
  DELETE: 'DELETE',
  EDIT: 'EDIT',
  SAVE: 'SAVE',
  SEARCH: 'SEARCH',
  SUBMIT: 'SUBMIT',
  UPDATE: 'UPDATE',
  VIEW: 'VIEW',
} as const;

export const BUTTON_CHANNEL = 'BUTTON';
export const BUTTON_TOPICS = Object.values(
  BUTTON_TYPES
);
