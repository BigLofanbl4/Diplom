const THEME_STORAGE_KEY = 'theme';
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEMES.DARK
    : THEMES.LIGHT;
}

function getStoredTheme() {
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  if (value === THEMES.DARK || value === THEMES.LIGHT) {
    return value;
  }
  return null;
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function setTheme() {
  const theme = getStoredTheme() ?? getSystemTheme();
  applyTheme(theme);
}

export function themeToggle() {
  const isDark = document.documentElement.dataset.theme === THEMES.DARK;
  const nextTheme = isDark ? THEMES.LIGHT : THEMES.DARK;

  applyTheme(nextTheme);
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}
