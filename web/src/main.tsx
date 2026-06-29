import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { Toast, ToastContent, ToastTitle, ToastDescription, ToastCloseButton } from '@heroui/react'
import App from './App.tsx'

// Migrate old theme preference to HeroUI's storage key
const oldTheme = localStorage.getItem('theme');
if (oldTheme && !localStorage.getItem('heroui-theme')) {
  localStorage.setItem('heroui-theme', oldTheme);
  localStorage.removeItem('theme');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
    <Toast.Provider placement="bottom end" maxVisibleToasts={5}>
      {({ toast }) => (
        <Toast toast={toast} variant={toast.content.variant ?? 'default'}>
          <ToastContent>
            <ToastTitle />
            <ToastDescription />
          </ToastContent>
          <ToastCloseButton />
        </Toast>
      )}
    </Toast.Provider>
  </StrictMode>,
)
