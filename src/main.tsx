import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { props } from '@dootask/tools'

// 设置主题
if (props.themeName === 'dark') {
  document.body.classList.add('dark')
}

// 渲染应用
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
