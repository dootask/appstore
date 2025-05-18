import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/styles/index.css'
import App from '@/App.tsx'
import { props } from '@dootask/tools'
import { BrowserRouter } from 'react-router-dom'
import '@/i18n.ts'
import i18n from '@/i18n.ts'

// --- 新的主题初始化逻辑 ---
const initializeTheme = () => {
  let theme: 'light' | 'dark' = 'light'; // Default theme

  // 1. 尝试从 localStorage 获取主题
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark' || storedTheme === 'light') {
    theme = storedTheme;
  } 
  // 2. 如果 localStorage 中没有，尝试从 props.themeName 获取
  else if (props.themeName === 'dark' || props.themeName === 'light') {
    theme = props.themeName;
    localStorage.setItem('theme', theme); 
  }
  // 3. 如果 props.themeName 也没有，尝试根据系统偏好设置
  else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'dark';
    localStorage.setItem('theme', theme);
  }
  // 4. 如果以上都没有，则使用默认的 'light' 主题，并存入 localStorage
  else {
    localStorage.setItem('theme', 'light');
  }

  // 应用主题到 document.body
  if (theme === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
};

initializeTheme();
// --- 结束新的主题初始化逻辑 ---

// --- 新的语言初始化逻辑 ---
const supportedLanguages = ['de', 'en', 'fr', 'id', 'ja', 'ko', 'ru', 'zh-CHT', 'zh'];

const initializeLanguage = () => {
  let language: string = 'en'; // Default language

  // 1. 尝试从 localStorage 获取语言
  const storedLanguage = localStorage.getItem('language');
  if (storedLanguage && supportedLanguages.includes(storedLanguage)) {
    language = storedLanguage;
  }
  // 2. 如果 localStorage 中没有，尝试从 props.languageName 获取
  else if (props.languageName && supportedLanguages.includes(props.languageName)) {
    language = props.languageName;
    localStorage.setItem('language', language);
  }
  // 3. 如果 props.languageName 也没有，尝试根据客户端环境语言设置
  else if (typeof navigator !== 'undefined') {
    const browserLang = (navigator.languages && navigator.languages[0]) || navigator.language;
    const baseBrowserLang = browserLang.split('-')[0]; // e.g., 'en' from 'en-US'
    if (supportedLanguages.includes(browserLang)) {
      language = browserLang;
    } else if (supportedLanguages.includes(baseBrowserLang)) {
      language = baseBrowserLang;
    }
    // For zh-CHT specifically, if browser is zh-TW or zh-HK
    if (['zh-TW', 'zh-HK'].includes(browserLang) && supportedLanguages.includes('zh-CHT')) {
        language = 'zh-CHT';
    }
    localStorage.setItem('language', language); // Save detected or default language
  }
  // 4. 如果以上都没有，则使用默认的 'en'，并存入 localStorage
  else {
    localStorage.setItem('language', 'en');
  }

  i18n.changeLanguage(language);
};

initializeLanguage();
// --- 结束新的语言初始化逻辑 ---

// 渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
