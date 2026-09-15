# MPT-AI — Engineering & Feature Implementation Summary

**Date:** September 8, 2026  
**Project:** MPT-AI (CSS / PMS / UPSC Civil Service Screening Trainer)  
**Stack:** React 19, Vite, VitePWA (Workbox), IndexedDB (Local-First), Vitest, Oxlint

---

## 1. Executive Summary

This document details the architectural refactoring, feature development, quality enhancements, and test coverage implemented for **MPT-AI**. The application was upgraded from a static, monolithic bundle into a high-performance, code-split Progressive Web App (PWA) with advanced pedagogical mechanisms, including Spaced Repetition (SRS), timed full-length mock exams, negative marking, daily streak tracking, question bookmarking, progress backup/restore, and automated test coverage.

---

## 2. Detailed Breakdown of Changes

### Priority 1: Architecture & Performance
- **Dynamic Imports & Code Splitting**:
  - **Problem:** All 16 past paper and coached question JSON files were statically imported into `curriculum.js`, creating a ~580 kB monolithic initial JavaScript bundle and triggering Vite chunk size warnings.
  - **Solution:** Converted question data sources to dynamic import loaders (`() => import('./questions/...')`) in `src/data/curriculum.js`. Each question dataset (`pms-2024.js`, `general-abilities.js`, `2025-gs1.js`, etc.) is now emitted as an independent chunk and loaded on demand.
  - **Route Lazy-Loading:** Extracted router definitions to `src/routes.jsx` using `React.lazy()` for all screens (`TracksScreen`, `PathScreen`, `LessonRoute`, `AdminScreen`, `MockExamScreen`, `MistakesScreen`, `BookmarksScreen`). Wrapped `<Outlet />` with `<Suspense>` in `src/App.jsx`.
  - **Result:** Main index bundle size dropped drastically to ~302 kB (96 kB gzipped). All split chunks are automatically precached by `vite-plugin-pwa` (Workbox) upon install, preserving 100% offline capability.
- **Progress Backup & Cloud Sync Seam**:
  - Added `exportProgressPayload()` and `parseAndMergeProgress()` in `src/storage/adapter.js` to serialize progress to a downloadable JSON file and merge imported progress without losing records (retaining highest scores and latest timestamps).
  - Built `createSyncQueue()` in `src/storage/adapter.js` consuming `pendingSync()` to provide an architectural seam for future Firebase/Supabase REST synchronizations.
  - Added "Export Progress JSON" and "Import Progress JSON" controls in `src/routes/TracksScreen.jsx`.

---

### Priority 2: Pedagogical & Exam-Prep Features
- **Mistakes Bank & Spaced Repetition (SRS)**:
  - **Problem:** Missed questions were previously only visible on the end-of-lesson summary screen and lost upon leaving.
  - **Solution:** Upgraded IndexedDB to Version 3 (`src/storage/idb.js`), adding dedicated `mistakes` and `bookmarks` object stores.
  - **Leitner SRS Algorithm (`src/storage/mistakesStore.js`):** Automatically logs missed questions from lessons or mock exams. Consecutive correct reviews increase review intervals (1 day → 3 days → 7 days); achieving a streak of 2 marks the question as "Mastered".
  - **UI (`src/routes/MistakesScreen.jsx` & `.css`):** Dedicated screen at `/mistakes` providing total recorded mistakes, due items for review, mastery counts, and an interactive SRS review session.
- **Timed Full-Length Mock Exam Mode**:
  - Built `src/routes/MockExamScreen.jsx` and `src/routes/MockExamScreen.css` (route `/mock/:trackId`).
  - Aggregates questions across all units of the chosen track up to the blueprint's total capacity (`blueprint.totalMcqs`).
  - **Drift-Free Timer:** Implemented countdown timer calculated from target epoch timestamps rather than leaky `setInterval` ticks.
  - **Exam UI:** Features a question navigation matrix/palette, status badges (Answered, Unanswered, Flagged for review), instant question jumping, and an early-submission confirmation modal.
  - **Diagnostic Report:** Does not reveal answers during the exam. Upon submission, provides a pass/fail determination, net marks (accounting for negative marking penalties), subject-by-subject score breakdown, and complete answer keys with explanations. Missed questions are automatically piped to the Mistakes Bank.
- **Negative Marking Support**:
  - Added `negativeMarking` configuration to `TRACK_CONFIGS` in `src/data/curriculum.js` (0 for CSS MPT, 0.25 per wrong MCQ for PMS, 0.33 for UPSC).
  - Implemented `calculateScore()` in `src/data/curriculum.js` to calculate gross correct, gross wrong, marks deducted, and net score (preventing scores below 0).
  - Integrated into `LessonScreen.jsx`, `PathScreen.jsx`, and `MockExamScreen.jsx`.
- **Daily Goals, Streaks & Bookmarks**:
  - **Streak Store (`src/storage/streakStore.js`):** Tracks daily question count against a daily target (default 20 questions) and increments consecutive active-day streaks in `localStorage`. Displayed on the `TracksScreen` header with a flame icon.
  - **Bookmarks Store (`src/storage/bookmarksStore.js`):** Integrated a star bookmark button into the `LessonScreen` top bar, allowing candidates to bookmark challenging questions.
  - **Bookmarks Screen (`src/routes/BookmarksScreen.jsx` & `.css`):** Dedicated revision view at `/bookmarks` to view and drill starred questions.

---

### Priority 3: Code Quality, Testing & Maintenance
- **Vitest Automated Test Suite**:
  - Configured Vitest in `package.json` (`npm test`).
  - Implemented 18 automated unit tests across 3 suites:
    1. `test/buildCustom.test.js`: Validates `isAnswerable()` input guards (rejecting `null` staging answers, out-of-bound indices, empty prompts, single choices) and verifies custom track chunking.
    2. `test/contentStore.test.js`: Validates `toDataFile()` serialization into standard curriculum JSON and `fromDataFile()` parsing and unkeyed fallback behavior.
    3. `test/progress.test.js`: Validates unit progression unlock logic (`ProgressProvider`), independent unit gating, negative marking deductions, and progress merge conflict resolution.
- **Strict JSDoc Typing**:
  - Added comprehensive `@typedef` annotations across `curriculum.js`, `adapter.js`, and `mistakesStore.js` for `Question`, `Lesson`, `Unit`, `Track`, `Blueprint`, `LessonRecord`, and `MistakeRecord`.
- **Repository Cleanup**:
  - Deleted the accidental stray empty file named `=` in the repository root.
  - Resolved all Oxlint compiler warnings and React 19 fast-refresh constraints.

---

### Priority 4: Dashboard & Content Enhancements
- **Admin Dashboard Search & Pagination**:
  - Upgraded `src/routes/AdminScreen.jsx` and `src/routes/AdminScreen.css` with real-time text search across prompts, choices, and explanations.
  - Added 10-item-per-page pagination with Previous/Next controls and page indicators to cleanly manage large question banks.
- **Keyed UPSC Track Integration**:
  - Created `src/data/questions/upsc-prelims/2025-gs1.json` containing verified answer keys, detailed explanations, and `keyedBy: 'mpt-ai'` provenance flags for UPSC Prelims 2025 GS Paper I questions.
  - Wired into `src/data/curriculum.js` under the `UPSC` exam group with 1/3 (0.33) negative marking.

---

## 3. Application Route Map

| Route Path | Screen Component | Purpose |
| :--- | :--- | :--- |
| `/` | `TracksScreen.jsx` | Exam track selector, daily streak widget, Mistakes & Starred shortcuts, JSON backup/restore |
| `/track/:trackId` | `PathScreen.jsx` | Duolingo-style lesson unlock path, track progress bar, "Take Timed Mock Exam" button |
| `/lesson/:lessonId` | `LessonScreen.jsx` | 10-question practice lesson, keyboard navigation, question bookmarking, auto-mistake recording |
| `/mock/:trackId` | `MockExamScreen.jsx` | Timed full-length mock simulation, drift-free countdown timer, question palette, diagnostic score report |
| `/mistakes` | `MistakesScreen.jsx` | Spaced Repetition (SRS) practice deck for questions answered incorrectly |
| `/bookmarks` | `BookmarksScreen.jsx` | Revision deck for questions starred during study sessions |
| `/admin` | `AdminScreen.jsx` | Question & category authoring suite with search filter, pagination, and JSON import/export |

---

## 4. IndexedDB Schema (Version 3)

The local-first storage layer uses IndexedDB database `mpt-ai` (Version 3):

- **`progress`**: Keyed by `id` (`lesson:<lessonId>`). Stores attempt count, `bestScore`, `lastScore`, `total`, `completedAt`, `updatedAt`, and `dirty` sync status.
- **`content`**: Keyed by `id` (`category:<uuid>` or `question:<uuid>`). Stores custom user-authored categories and questions.
- **`mistakes`**: Keyed by `id` (question ID). Stores question payload, `wrongCount`, `correctCount`, `streak`, `intervalDays`, `lastReviewedAt`, `nextReviewAt`, and `mastered` status.
- **`bookmarks`**: Keyed by `id` (question ID). Stores question payload, track/unit association, and `savedAt` timestamp.

---

## 5. Verification & Test Metrics

- **Oxlint**: `0 errors, 0 warnings` (`npm run lint`)
- **Vitest**: `18 passed / 18 tests` across 3 test files (`npm test`)
- **Vite Build**: Built in ~640ms, 51 precache entries for Service Worker offline operation (`npm run build`)
