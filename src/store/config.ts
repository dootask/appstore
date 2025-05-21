import i18n from '@/i18n';
import { getUrlParam } from '@/lib';

// 语言配置
export const supportedLanguagesMap: Record<string, string> = {
  'de': 'Deutsch',
  'en': 'English',
  'fr': 'Français',
  'id': 'Indonesia',
  'ja': '日本語',
  'ko': '한국어',
  'ru': 'Русский',
  'zh-CHT': '繁體中文',
  'zh': '简体中文'
};

export const languageOptionsForDropdown = Object.entries(supportedLanguagesMap).map(([value, label]) => ({label, value}));

const SUPPORTED_LANGUAGES = Object.keys(supportedLanguagesMap);

export const initializeLanguage = (initialConfig?: { languageName?: string }) => {
  let language: string = 'en'; // 默认语言为英语

  // 首先检查 URL 参数
  const urlLanguage = getUrlParam('language');
  if (urlLanguage && SUPPORTED_LANGUAGES.includes(urlLanguage)) {
    language = urlLanguage;
    localStorage.setItem('language', language);
  } else {
    const storedLanguage = localStorage.getItem('language');
    if (storedLanguage && SUPPORTED_LANGUAGES.includes(storedLanguage)) {
      language = storedLanguage;
    } else if (initialConfig?.languageName && SUPPORTED_LANGUAGES.includes(initialConfig.languageName)) {
      language = initialConfig.languageName;
      localStorage.setItem('language', language);
    } else if (typeof navigator !== 'undefined') {
      const browserLang = (navigator.languages && navigator.languages[0]) || navigator.language;
      const baseBrowserLang = browserLang.split('-')[0];

      if (['zh-TW', 'zh-HK'].includes(browserLang)) {
        language = 'zh-CHT'; // 针对繁体中文区域的特殊处理
      } else if (SUPPORTED_LANGUAGES.includes(browserLang)) {
        language = browserLang;
      } else if (SUPPORTED_LANGUAGES.includes(baseBrowserLang)) {
        language = baseBrowserLang;
      }
    }
  }
  i18n.changeLanguage(language);
  return language;
};

export const setLanguage = (langCode: string) => {
  if (supportedLanguagesMap[langCode]) {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
  }
};

// 主题配置
export const initializeTheme = (initialConfig?: { themeName?: 'light' | 'dark' }) => {
  let theme: 'light' | 'dark' = 'light'; // 默认主题为浅色

  // 首先检查 URL 参数
  const urlTheme = getUrlParam('theme');
  if (urlTheme === 'dark' || urlTheme === 'light') {
    theme = urlTheme;
    localStorage.setItem('theme', theme);
  } else {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      theme = storedTheme;
    } else if (initialConfig?.themeName) {
      theme = initialConfig.themeName;
      localStorage.setItem('theme', theme);
    } else if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      theme = 'dark'; // 根据系统偏好设置，但不保存到 localStorage
    } else {
      theme = 'light'; // 回退到默认主题，但不保存到 localStorage
    }
  }

  if (theme === 'dark') {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
  } else {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
  }
  return theme;
};

export const setTheme = (newTheme: 'light' | 'dark') => {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  
  if (newTheme === 'dark') {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
  } else {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
  }

  if (newTheme === systemTheme) {
    localStorage.removeItem('theme');
  } else {
    localStorage.setItem('theme', newTheme);
  }
};
