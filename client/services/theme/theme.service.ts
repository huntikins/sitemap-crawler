interface ThemeData {
  colors?: Record<string, string>;
  fonts?: {
    family?: string;
    sizes?: Record<string, string>;
  };
  spacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
}

export class ThemeService {
  private theme: ThemeData | null = null;

  async loadTheme(): Promise<void> {
    try {
      const response = await fetch('/theme.json');
      this.theme = await response.json() as ThemeData;
      this.applyTheme();
    } catch (error) {
      console.error('Error loading theme:', error);
      // Use default theme if loading fails
      this.applyDefaultTheme();
    }
  }

  private applyTheme(): void {
    if (!this.theme) return;

    const root = document.documentElement;

    // Apply colors
    if (this.theme.colors) {
      Object.entries(this.theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, String(value));
      });
    }

    // Apply fonts
    if (this.theme.fonts) {
      if (this.theme.fonts.family) {
        root.style.setProperty('--font-family', this.theme.fonts.family);
      }
      if (this.theme.fonts.sizes) {
        Object.entries(this.theme.fonts.sizes).forEach(([key, value]) => {
          root.style.setProperty(`--font-size-${key}`, String(value));
        });
      }
    }

    // Apply spacing
    if (this.theme.spacing) {
      Object.entries(this.theme.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, String(value));
      });
    }

    // Apply border radius
    if (this.theme.borderRadius) {
      Object.entries(this.theme.borderRadius).forEach(([key, value]) => {
        root.style.setProperty(`--border-radius-${key}`, String(value));
      });
    }
  }

  private applyDefaultTheme(): void {
    // Default theme values if theme.json fails to load
    const root = document.documentElement;
    root.style.setProperty('--color-primary', '#3b82f6');
    root.style.setProperty('--color-secondary', '#10b981');
  }

  getTheme(): ThemeData | null {
    return this.theme;
  }
}
