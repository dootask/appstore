import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { props } from '@dootask/tools'
import { BrowserRouter } from 'react-router-dom'
import './i18n.ts'

// 设置主题
if (props.themeName === 'dark') {
  document.body.classList.add('dark')
}

// 渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
