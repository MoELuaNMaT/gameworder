import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 检测飞书环境
const isFeishuEnv = () => {
  return window.navigator.userAgent.includes('Feishu') ||
         window.location.search.includes('feishu=true')
}

// 添加飞书 WebView 标记
if (isFeishuEnv()) {
  document.body.classList.add('feishu-webview')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
