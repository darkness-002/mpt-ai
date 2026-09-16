import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import TracksScreen from './routes/TracksScreen.jsx'
import PathScreen from './routes/PathScreen.jsx'
import LessonRoute from './routes/LessonRoute.jsx'
import MockExamScreen from './routes/MockExamScreen.jsx'
import MistakesScreen from './routes/MistakesScreen.jsx'
import BookmarksScreen from './routes/BookmarksScreen.jsx'
import CustomQuizScreen from './routes/CustomQuizScreen.jsx'
import AnalyticsScreen from './routes/AnalyticsScreen.jsx'

// Lazy load heavy admin suite containing PDF parsing engine
const AdminScreen = lazy(() => import('./routes/AdminScreen.jsx'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <TracksScreen /> },
      { path: 'track/:trackId', element: <PathScreen /> },
      { path: 'lesson/:lessonId', element: <LessonRoute /> },
      { path: 'mock/:trackId', element: <MockExamScreen /> },
      { path: 'drill', element: <CustomQuizScreen /> },
      { path: 'analytics', element: <AnalyticsScreen /> },
      { path: 'mistakes', element: <MistakesScreen /> },
      { path: 'bookmarks', element: <BookmarksScreen /> },
      { path: 'admin', element: <AdminScreen /> },
      { path: '*', element: <TracksScreen /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
