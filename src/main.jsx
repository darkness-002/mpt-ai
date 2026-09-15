import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ContentProvider } from './content/ContentProvider.jsx'
import { ProgressProvider } from './storage/ProgressProvider.jsx'
import { AppRouter } from './routes.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ContentProvider>
      <ProgressProvider>
        <AppRouter />
      </ProgressProvider>
    </ContentProvider>
  </StrictMode>,
)
