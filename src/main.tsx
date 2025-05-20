import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/styles/index.css'
import App from '@/App.tsx'
import { props } from '@dootask/tools'
import { BrowserRouter } from 'react-router-dom'
import '@/i18n.ts'
import { initializeTheme, initializeLanguage } from '@/store/config';
import PromptPortal from '@/components/custom/prompt'

// 初始化主题和语言
initializeTheme({ themeName: props.themeName });
initializeLanguage({ languageName: props.languageName });

// 渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <PromptPortal />
    </BrowserRouter>
  </React.StrictMode>,
)
