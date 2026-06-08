import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { sqmsTheme } from './theme'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider theme={sqmsTheme}>
      <AntApp>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
)
