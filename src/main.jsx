import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext.jsx'
import { ContentProvider } from './content/ContentProvider.jsx'
import { ProgressProvider } from './storage/ProgressProvider.jsx'
import { AppRouter } from './routes.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ContentProvider>
        <ProgressProvider>
          <AppRouter />
        </ProgressProvider>
      </ContentProvider>
    </AuthProvider>
  </StrictMode>,
)
