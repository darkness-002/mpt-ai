import { lazy, Suspense } from 'react'
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

// Lazy load heavy admin and advanced study modules
const AdminScreen = lazy(() => import('./routes/AdminScreen.jsx'))
const FlashcardsScreen = lazy(() => import('./routes/FlashcardsScreen.jsx'))
const DailySprintScreen = lazy(() => import('./routes/DailySprintScreen.jsx'))
const ReadinessScreen = lazy(() => import('./routes/ReadinessScreen.jsx'))
const SpeedRunScreen = lazy(() => import('./routes/SpeedRunScreen.jsx'))
const PastPapersScreen = lazy(() => import('./routes/PastPapersScreen.jsx'))
const WorksheetScreen = lazy(() => import('./routes/WorksheetScreen.jsx'))
const StudyPlannerScreen = lazy(() => import('./routes/StudyPlannerScreen.jsx'))

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
      { path: 'flashcards', element: <FlashcardsScreen /> },
      { path: 'daily', element: <DailySprintScreen /> },
      { path: 'readiness', element: <ReadinessScreen /> },
      { path: 'speed-run', element: <SpeedRunScreen /> },
      { path: 'papers', element: <PastPapersScreen /> },
      { path: 'worksheet', element: <WorksheetScreen /> },
      { path: 'planner', element: <StudyPlannerScreen /> },
      { path: '*', element: <TracksScreen /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <Suspense fallback={<div className="lesson lesson--loading" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Loading Admin Console…</div>}>
        <AdminScreen />
      </Suspense>
    ),
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
