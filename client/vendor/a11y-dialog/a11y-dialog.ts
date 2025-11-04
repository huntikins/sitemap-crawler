import A11yDialog from 'a11y-dialog';

// Make A11yDialog available globally
(window as any).A11yDialog = A11yDialog;

// Store dialog instances globally for access from Alpine components
(window as any).__a11yDialogInstances = (window as any).__a11yDialogInstances || new Map();

// Initialize dialogs when DOM is ready
// Note: Dialogs inside Alpine components will be initialized by the components themselves
if (typeof document !== 'undefined') {
  const initializeDialogs = () => {
    // Auto-instantiate dialogs with [data-a11y-dialog] attribute
    const dialogElements = document.querySelectorAll('[data-a11y-dialog]:not([data-a11y-dialog-initialized])');
    dialogElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const dialogId = htmlElement.id || htmlElement.getAttribute('data-a11y-dialog') || `dialog-${Math.random().toString(36).substr(2, 9)}`;
      
      // Skip if already initialized
      const instancesMap = (window as any).__a11yDialogInstances;
      if (instancesMap && instancesMap.has(dialogId)) {
        return;
      }

      // Skip if element has initialization marker (for Alpine components)
      if (htmlElement.hasAttribute('data-a11y-dialog-initialized')) {
        return;
      }

      try {
        const dialog = new A11yDialog(htmlElement);
        // Store instance for later access
        if (!instancesMap) {
          (window as any).__a11yDialogInstances = new Map();
        }
        (window as any).__a11yDialogInstances.set(dialogId, dialog);
        // Also store on element for direct access
        (htmlElement as any)._a11yDialog = dialog;
        // Mark as initialized
        htmlElement.setAttribute('data-a11y-dialog-initialized', 'true');
      } catch (error) {
        console.error('Error initializing dialog:', error);
      }
    });
  };

  // Run after Alpine initializes (Alpine emits 'alpine:init' event)
  if (typeof window !== 'undefined') {
    // Wait for Alpine to initialize components
    const runAfterAlpine = () => {
      // Wait a bit more for Alpine components to render
      setTimeout(initializeDialogs, 200);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runAfterAlpine);
    } else {
      runAfterAlpine();
    }
  }
}

export default A11yDialog;

