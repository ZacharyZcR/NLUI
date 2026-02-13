import { inject, type Ref } from 'vue';

type Theme = 'light' | 'dark';

export function useTheme() {
  const theme = inject<Ref<Theme>>('theme');
  const setTheme = inject<(theme: Theme) => void>('setTheme');

  if (!theme || !setTheme) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return {
    theme,
    setTheme,
  };
}
