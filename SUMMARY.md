# MPT-AI — Engineering & Feature Implementation Summary

**Date:** September 16, 2026  
**Project:** MPT-AI (CSS / PMS / UPSC Civil Service Screening Trainer)  
**Stack:** React 19, Vite 8, VitePWA (Workbox), IndexedDB v3 (Local-First), Vitest, Oxlint

---

## 1. Executive Summary

This document details the architectural refactoring, feature development, quality enhancements, test coverage, and UI/UX modernization implemented for **MPT-AI**. The application has been upgraded into a high-performance, code-split Progressive Web App (PWA) with Duolingo/Brilliant-grade pedagogy, spaced repetition (Leitner SRS), full-length timed mock exams with session recovery, custom quiz generators, performance analytics, in-browser PDF parsing, theme/font scaling, 3D tactile MCQ choices, and structured incorrect answer feedback drawers.

---

## 2. Detailed Breakdown of Recent Changes (September 2026)

### Priority 1: UI / UX Modernization & Tactile Pedagogy
- **Redesigned 3D Tactile MCQ Option Cards**:
  - **Tactile 3D Press Feel:** Option cards feature a 4px bottom border press depth (`border-bottom: 4px solid var(--border-strong)`) with active sink states and smooth hover lift animations.
  - **Standard Exam Letter Badges:** Cleanly formatted letter badges (`A`, `B`, `C`, `D`) replacing plain numeric keys across all screens.
  - **Interactive State Animations:**
    - Selected: Vibrant blue border, blue badge, soft background tint.
    - Correct: High-contrast green border, green badge, checkmark icon indicator.
    - Incorrect: Soft red tint, red border, X icon indicator, and subtle shake animation.
    - Eliminated: Strikethrough line, 40% opacity, desaturated background.
- **Overhauled Incorrect Answer Feedback Drawer**:
  - Replaced plain text summary with a high-clarity pedagogical drawer at the bottom of the screen.
  - **Status Header:** Prominent visual badge (`✕ Incorrect Answer` or `✓ Correct! Excellent.`).
  - **Structured Answer Comparison Grid:**
    - Red Box (`You Picked`): Clearly shows the user's chosen distractor.
    - Green Box (`Correct Answer`): Bold callout of the official correct key.
  - **Context & Explanation Card:** Dedicated card with a lightbulb icon (`💡 Explanation & Context`) explaining the rationale and citing the exam paper source.
  - **High-Contrast Action Button:** Large thumb-friendly button with instant keyboard support (`Enter` / `A-D`).
- **Mobile Bottom Navigation & Desktop Floating Pill Dock**:
  - Built `src/components/BottomNav.jsx` & `src/components/BottomNav.css`.
  - Fixed sticky bar on mobile devices and a centered frosted glass floating dock (`backdrop-filter: blur(12px)`) on desktop.
  - One-tap navigation across Curriculum (`/`), Custom Drill (`/drill`), Mistakes SRS (`/mistakes`), Starred (`/bookmarks`), Analytics (`/analytics`), and Settings.
  - Automatically minimizes during full-length mock exams and lesson focus modes.
- **Theme Customizer & Font Size Scaler Engine**:
  - Built `src/storage/settingsStore.js`, `src/components/SettingsModal.jsx`, and global overlay styles in `src/index.css`.
  - Supports 5 color themes: **System**, **Light**, **Dark**, **OLED True Black**, and **Sepia Warm Tone**.
  - Real-time text scaling (`A-` Compact, `A` Default, `A+` Large, `A++` Extra Large) to ensure Urdu Nastaliq (`.urdu`) and complex English stems remain readable across all device DPIs.

---

### Priority 2: Pedagogical & Examination Enhancements
- **Option Elimination / Strike-Through Mode**:
  - Added dedicated scissor/slash action next to each choice across `LessonScreen.jsx`, `MockExamScreen.jsx`, `CustomQuizScreen.jsx`, and `MistakesScreen.jsx`.
  - Allows candidates to eliminate distractors before committing to their final answer.
- **Custom Practice Drill & Quiz Builder (`/drill`)**:
  - Built `src/routes/CustomQuizScreen.jsx` & `src/routes/CustomQuizScreen.css`.
  - Multi-select exam tracks and individual subject units.
  - Filter question pools: *All Track Questions*, *Missed Questions Only*, *Starred Questions Only*.
  - Configurable quiz lengths (10, 20, 30, 50 MCQs) with optional 1-minute/question timer mode.
- **Performance Insights & Exam Countdown Planner (`/analytics`)**:
  - Built `src/routes/AnalyticsScreen.jsx` & `src/routes/AnalyticsScreen.css`.
  - Subject-by-subject accuracy breakdown matrix across all tracks.
  - Overall accuracy percentage, lessons mastered, and active streak metrics.
  - **Target Exam Countdown Planner:** Calculates daily question quotas required to clear curriculum before the candidate's exam date.
- **Timed Mock Exam Session Recovery & Filterable Palette**:
  - Upgraded `src/routes/MockExamScreen.jsx` & `src/routes/MockExamScreen.css`.
  - **Crash / Refresh Recovery:** In-progress exam state (timer, answers, flags, shuffled questions) persists in `sessionStorage` (`mpt_mock_session_<trackId>`).
  - **Question Palette Filters:** Filter matrix by `All`, `Unanswered`, or `Flagged`.
  - **Lockdown Mode:** Fullscreen examination mode toggle (`requestFullscreen`).
- **In-Browser PDF & Bulk Text MCQ Importer (`/admin`)**:
  - Built `src/lib/browserPdfParser.js` utilizing `pdfjs-dist` in the browser.
  - Extracts questions, options, and bolded keys directly from uploaded PDF past papers without requiring CLI tools.
  - Added formatted plain text / markdown bulk MCQ parser in `AdminScreen.jsx`.
- **Audio Chimes, Haptic Vibrations & Confetti Celebrations**:
  - Built `src/lib/sound.js` (synthesized Web Audio API chimes) and `src/lib/confetti.js` (lightweight canvas particle burst).
  - Triggers audio/vibration on checking answers and celebratory confetti upon lesson mastery or passing mock exams.

---

### Priority 3: Architecture, Quality & Testing
- **Dynamic Imports & Code Splitting**:
  - All 16 past paper and coached question sets dynamically loaded on demand via dynamic import loaders (`() => import('./questions/...')`) in `src/data/curriculum.js`.
  - Route lazy-loading with `React.lazy()` for all 8 screens in `src/routes.jsx`.
- **Vitest Automated Unit Test Suite**:
  - 22 automated unit tests across 4 test suites (`npm test`):
    1. `test/buildCustom.test.js`: Validates `isAnswerable()` input guards and custom track chunking.
    2. `test/contentStore.test.js`: Validates serialization and parsing in standard curriculum JSON.
    3. `test/progress.test.js`: Validates unit progression unlock logic, negative marking calculations, and conflict resolution.
    4. `test/settingsAndParser.test.js`: Validates `settingsStore` persistence and plain text MCQ parsing.
- **Zero-Lint Warnings**:
  - Verified with Oxlint (`npm run lint`): `0 errors, 0 warnings`.
- **PWA Service Worker Precache**:
  - `vite-plugin-pwa` (Workbox) generates 54 precache entries (~1.19 MB) for 100% offline capability.

---

## 3. Application Route Map

| Route Path | Screen Component | Purpose |
| :--- | :--- | :--- |
| `/` | `TracksScreen.jsx` | Exam track selector, desktop top navigation, daily streak widget, backup/restore |
| `/track/:trackId` | `PathScreen.jsx` | Duolingo-style lesson unlock path, track progress bar, "Take Timed Mock Exam" button |
| `/lesson/:lessonId` | `LessonScreen.jsx` | 10-MCQ practice lesson, 3D tactile choices, strike-through elimination, pedagogical feedback drawer |
| `/mock/:trackId` | `MockExamScreen.jsx` | Timed full-length mock simulation, session crash recovery, question palette filters, fullscreen lockdown |
| `/drill` | `CustomQuizScreen.jsx` | Custom quiz generator filtering by subject, past paper pool, count, and timer |
| `/analytics` | `AnalyticsScreen.jsx` | Subject accuracy matrix, study insights, and target exam countdown pacing planner |
| `/mistakes` | `MistakesScreen.jsx` | Spaced Repetition (SRS) practice deck with comparison feedback for missed questions |
| `/bookmarks` | `BookmarksScreen.jsx` | Revision deck for questions starred during study sessions |
| `/admin` | `AdminScreen.jsx` | Authoring dashboard with in-browser PDF importer, bulk text parser, search, and pagination |

---

## 4. IndexedDB & Local Storage Architecture

- **`progress` (IndexedDB v3)**: Keyed by `lesson:<lessonId>`. Stores attempt count, `bestScore`, `lastScore`, `total`, `completedAt`, `updatedAt`, `dirty`.
- **`content` (IndexedDB v3)**: Keyed by `category:<uuid>` or `question:<uuid>`. Stores user-authored categories and questions.
- **`mistakes` (IndexedDB v3)**: Keyed by question ID. Stores question payload, `wrongCount`, `correctCount`, `streak`, `intervalDays`, `lastReviewedAt`, `nextReviewAt`, `mastered`.
- **`bookmarks` (IndexedDB v3)**: Keyed by question ID. Stores question payload, track/unit association, `savedAt`.
- **`mpt_ai_streak` (`localStorage`)**: Daily solved questions and consecutive active-day streak count.
- **`mpt_ai_settings` (`localStorage`)**: Color theme, typography scale, sound/haptic toggles, and target exam goal.
- **`mpt_mock_session_<trackId>` (`sessionStorage`)**: Ongoing mock exam session state for crash recovery.

---

## 5. Verification & Test Metrics

- **Oxlint**: `0 errors, 0 warnings` (`npm run lint`)
- **Vitest**: `22 passed / 22 tests` across 4 test files (`npm test`)
- **Vite Build**: Production bundle built in ~720ms, 54 precached assets for offline PWA operation (`npm run build`)
