import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'

const TracksScreen = lazy(() => import('./routes/TracksScreen.jsx'))
const PathScreen = lazy(() => import('./routes/PathScreen.jsx'))
const LessonRoute = lazy(() => import('./routes/LessonRoute.jsx'))
const AdminScreen = lazy(() => import('./routes/AdminScreen.jsx'))
const MockExamScreen = lazy(() => import('./routes/MockExamScreen.jsx'))
const MistakesScreen = lazy(() => import('./routes/MistakesScreen.jsx'))
const BookmarksScreen = lazy(() => import('./routes/BookmarksScreen.jsx'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <TracksScreen /> },
      { path: 'track/:trackId', element: <PathScreen /> },
      { path: 'lesson/:lessonId', element: <LessonRoute /> },
      { path: 'mock/:trackId', element: <MockExamScreen /> },
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
