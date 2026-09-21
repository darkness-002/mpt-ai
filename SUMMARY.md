# MPT-AI — Engineering & Feature Implementation Summary

**Date:** September 22, 2026  
**Project:** MPT-AI (CSS / PMS / UPSC Civil Service Screening Trainer)  
**Stack:** React 19, Vite 8, VitePWA (Workbox), IndexedDB v4 (Local-First), Vitest, Oxlint

---

## 1. Executive Summary

This document details the major architectural overhaul and feature implementation completed for **MPT-AI**. The application has been upgraded into a feature-rich, high-performance competitive civil service exam suite designed for FPSC CSS MPT, PPSC PMS, CSS Compulsory, and UPSC Prelims candidates.

A complete UI/UX layout transformation has been performed—introducing a persistent multi-tool App Header, a permanently accessible bottom navigation dock with a sliding "More Tools" drawer, and a dedicated Study Mode Hub on the main dashboard. Fifteen substantial, cohesive features were engineered and integrated with zero external UI dependencies (pure vanilla CSS + React 19), full offline capability, code-splitting via `React.lazy()`, and an expanded test suite of 50 unit tests across 14 test files.

---

## 2. The 15 New Features

### Feature 1: Interactive Flashcards Revision Mode (`/flashcards`)
- Built `src/routes/FlashcardsScreen.jsx` & `src/routes/FlashcardsScreen.css`.
- Realistic 3D card flip animation with active recall rating: **Hard** (Review Soon), **Good** (Standard SRS), **Easy** (Mastered).
- Deck filtering options: All Track Questions, Starred Questions only, or Missed/Mistakes Bank questions.
- Full keyboard hotkey support: `Space` to flip, `1`/`2`/`3` to rate, arrow keys (`←`/`→`) to navigate.
- Inline text-to-speech audio button and personal candidate notes integration.

### Feature 2: Universal Global Search & Command Palette (`Ctrl+K` / `Cmd+K`)
- Built `src/components/GlobalSearchModal.jsx` & `src/components/GlobalSearchModal.css`.
- Persistent trigger in the App Header or via standard keyboard shortcut (`Ctrl+K` / `Cmd+K`).
- Live indexes tracks, curriculum subject units, practice drill modes, and utility tools with arrow-key keyboard navigation and quick navigation.

### Feature 3: Candidate Notes & Annotation System
- Built `src/storage/notesStore.js`, `src/components/NoteModal.jsx`, and `src/components/NoteModal.css`.
- Allows candidates to attach custom mnemonics, study tips, and explanations to any question across Lessons, Drills, Mock Reviews, and Flashcards.
- Stored in IndexedDB under the `notes` store and bundled in full JSON backups.

### Feature 4: Pomodoro Study Focus Timer with Ambient Audio
- Built `src/storage/focusStore.js`, `src/components/FocusTimerModal.jsx`, and `src/components/FocusTimerModal.css`.
- 25-minute standard focus and 50-minute deep study intervals with 5-minute and 15-minute break timers.
- Web Audio API synthesized ambient noise generators (**Brown Noise**, **White Noise**) and subtle audio completion chimes operating 100% offline.

### Feature 5: Daily 10-MCQ Sprint Challenge (`/daily`)
- Built `src/storage/dailyStore.js`, `src/routes/DailySprintScreen.jsx`, and `src/routes/DailySprintScreen.css`.
- Deterministic pseudo-random number generator (PRNG) seeded by calendar date (`YYYY-MM-DD`).
- Streak tracking, daily milestone progress bar, instant feedback, and celebratory confetti upon completion.

### Feature 6: Civil Services Exam Readiness Diagnostic Engine (`/readiness`)
- Built `src/routes/ReadinessScreen.jsx` & `src/routes/ReadinessScreen.css`.
- Calculates composite **Readiness Index (0–100%)** weighted across:
  - **Syllabus Coverage (35%)**: completed lessons / total lessons.
  - **Historical Accuracy (35%)**: average score across all attempts.
  - **Leitner SRS Mastery (15%)**: mastered mistakes / total mistake bank items.
  - **Daily Streak Consistency (15%)**: active practice habit score.
- Identifies **Top 3 Critical Weak Spots** and provides a 1-click drill launcher targeting those areas.

### Feature 7: 60-Second Speed Run / Sudden Death Challenge (`/speed-run`)
- Built `src/routes/SpeedRunScreen.jsx` & `src/routes/SpeedRunScreen.css`.
- Rapid-fire 60-second challenge with combo counters, score multipliers (up to 3x), and time adjustments (`+3s` for correct, `-5s` for errors).
- Optional **Sudden Death** mode (game ends on first incorrect answer) with persistent local high scores.

### Feature 8: Past Papers Vault & Explorer (`/papers`)
- Built `src/routes/PastPapersScreen.jsx` & `src/routes/PastPapersScreen.css`.
- Curated archive of official civil service exam papers:
  - FPSC CSS MPT (2023, 2024, 2025, 2026)
  - PPSC PMS Prelims (2023, 2024, 2025)
  - CSS Compulsory General Science & Ability, Current Affairs, Pakistan Affairs, Islamiat (2013–2025)
  - UPSC CSE Prelims General Studies (2025)
- Displays key metadata: total questions, time allowance, negative marking rules, and direct links to mock simulation and printable worksheets.

### Feature 9: Printable Offline Exam Worksheets & OMR PDF Generator (`/worksheet`)
- Built `src/routes/WorksheetScreen.jsx` & `src/routes/WorksheetScreen.css`.
- Formatted two-column printable exam layout with candidate roll number block, test instructions, and official answer keys.
- Includes printable 100/200-question blank bubble sheets formatted with print stylesheets (`@media print`) for clean browser print-to-PDF export.

### Feature 10: Interactive OMR Bubble Sheet Simulation Mode
- Built `src/components/OMRSheet.jsx` & `src/components/OMRSheet.css`.
- Integrated directly into Custom Drills (`/drill`) and full Mock Exams (`/mock/:trackId`).
- Authentic pencil-fill bubble animations (`A`, `B`, `C`, `D`), question navigation palette, and answered/flagged indicators.

### Feature 11: Study Target Pacing Planner (`/planner`)
- Built `src/routes/StudyPlannerScreen.jsx` & `src/routes/StudyPlannerScreen.css`.
- Exam countdown calculator determining required daily MCQ completion quotas.
- Evaluates pacing health (**Ahead**, **On Track**, **Behind**) and dynamically adjusts target plans.

### Feature 12: Detailed Mock Exam Analytics & Review Mode
- Enhanced `src/routes/MockExamScreen.jsx` and `src/routes/MockExamScreen.css`.
- Filter post-exam review by status: *All Questions*, *Missed / Incorrect*, *Skipped / Unanswered*, and *Flagged*.
- **Save All Missed to Mistakes Bank**: Single-click bulk action to transfer all incorrect mock answers into Leitner Spaced Repetition.

### Feature 13: Instant Theme & Eye-Care Quick Switcher
- Built into `src/components/AppHeader.jsx` and `src/storage/settingsStore.js`.
- 1-tap cyclic theme toggle in the header: **System** → **Light** → **Dark** → **OLED True Black** → **Sepia Warm Paper**.

### Feature 14: Speech Synthesis / Voice Read-Aloud (TTS)
- Built `src/components/QuestionTTS.jsx`.
- 100% offline text-to-speech for questions and answer choices using the native browser `window.speechSynthesis` API across Lessons, Custom Drills, Flashcards, and Mock Reviews.

### Feature 15: Multi-Store Backup, Cloud-Ready Export/Import & Granular Reset
- Built `src/storage/backupManager.js` and integrated into `src/components/SettingsModal.jsx`.
- Full backup export and restore bundling Progress, Bookmarks, Mistakes SRS, Candidate Notes, Daily Streak, Daily Sprint completions, and Settings into a versioned JSON schema.

---

## 3. UI/UX Layout Transformation

- **Persistent Header (`AppHeader.jsx`)**:
  - Global Search trigger (`Ctrl+K`), live streak counter, instant theme cycler, Pomodoro focus timer modal, and settings access.
- **Permanent Navigation Dock + More Drawer (`BottomNav.jsx`)**:
  - Sticky mobile navigation dock and floating desktop dock.
  - Primary links: Curriculum (`/`), Custom Drill (`/drill`), Daily Sprint (`/daily`), Mistakes Bank (`/mistakes`), Starred (`/bookmarks`), and a **More Tools** sliding action sheet (Flashcards, Readiness, Speed Run, Past Papers, Worksheets, Planner, Analytics, Settings).
- **Interactive Tracks Dashboard (`TracksScreen.jsx`)**:
  - Quick Study Modes grid providing 1-tap launching for Daily Sprint, Flashcards, Exam Readiness, and Past Papers.
- **Zero External UI Libraries**: Pure vanilla CSS and CSS variables.

---

## 4. Application Route Map

| Route Path | Screen Component | Purpose |
| :--- | :--- | :--- |
| `/` | `TracksScreen.jsx` | Exam track selector, quick study modes grid, streak widget, backup/restore |
| `/track/:trackId` | `PathScreen.jsx` | Duolingo-style lesson unlock path, track progress bar, "Take Timed Mock Exam" button |
| `/lesson/:lessonId` | `LessonScreen.jsx` | 10-MCQ practice lesson, 3D tactile choices, strike-through elimination, notes, TTS, feedback drawer |
| `/mock/:trackId` | `MockExamScreen.jsx` | Timed full mock simulation, session crash recovery, OMR bubble sheet, filterable review mode |
| `/drill` | `CustomQuizScreen.jsx` | Custom quiz generator with OMR mode, subject/paper filters, notes, and timers |
| `/flashcards` | `FlashcardsScreen.jsx` | 3D interactive flashcards with active recall rating and keyboard shortcuts |
| `/daily` | `DailySprintScreen.jsx` | Deterministic 10-MCQ daily sprint challenge with streak milestone tracking |
| `/readiness` | `ReadinessScreen.jsx` | Civil Services Exam Readiness Diagnostic index (0-100%) and weak spot drill launcher |
| `/speed-run` | `SpeedRunScreen.jsx` | 60-second rapid-fire speed run / sudden death challenge with combo multipliers |
| `/papers` | `PastPapersScreen.jsx` | Curated past papers directory (CSS MPT, PPSC PMS, CSS Compulsory, UPSC) |
| `/worksheet` | `WorksheetScreen.jsx` | Printable 2-column offline exam worksheets and printable OMR bubble sheets |
| `/planner` | `StudyPlannerScreen.jsx` | Exam countdown pacing planner with daily target question quotas |
| `/analytics` | `AnalyticsScreen.jsx` | Subject accuracy breakdown matrix, mastery tracking, and historical metrics |
| `/mistakes` | `MistakesScreen.jsx` | Leitner Spaced Repetition (SRS) practice deck with comparison feedback |
| `/bookmarks` | `BookmarksScreen.jsx` | Revision deck for questions starred during study sessions |
| `/admin` | `AdminScreen.jsx` | Comprehensive Administration & Curriculum Studio (Overview KPIs, Question Bank Manager, Blueprint Generator, Quality Auditor, Import/Export) |

---

## 5. Dual-Mode Responsive Navigation & Layout Architecture

- **Desktop (`>= 860px`)**:
  - `AppHeader.jsx` hosts the complete top-level navigation bar with direct links: **Curriculum** (`/`), **Drill** (`/drill`), **Daily** (`/daily`), **Flashcards** (`/flashcards`), **Readiness** (`/readiness`), **Past Papers** (`/papers`), and **Admin** (`/admin`).
  - Right-side action controls: Search (`Ctrl+K`), Streak counter, Theme cycler, Pomodoro focus timer, Settings modal.
  - `BottomNav.jsx` is **hidden on desktop** (`display: none !important`), eliminating navigation clutter and redundant floating docks.
  - In-page duplicate header and settings button in `TracksScreen.jsx` were removed.
- **Mobile (`< 860px`)**:
  - `AppHeader.jsx` displays a compact branding and tools header.
  - `BottomNav.jsx` provides a sticky 5-destination bottom thumb bar (`Curriculum`, `Drill`, `Daily`, `Mistakes`, and `More`).
  - The "More Tools" sliding sheet includes Flashcards, Readiness, Speed Run, Past Papers, Worksheets, Planner, and the Admin Dashboard.

---

## 6. Comprehensive Admin Dashboard Suite (`/admin`)

- **Tab 1: Overview & Telemetry Metrics (`overview`)**:
  - Aggregates live question counts, custom vs verified ratio, tracks count, answer key integrity percentage, and explanation coverage.
  - Syllabus subject distribution charts and commission breakdown.
- **Tab 2: Question Bank Explorer & Live MCQ Editor (`questions`)**:
  - Search questions by prompt, choices, or explanation.
  - Filter by Exam, Track, and Status (*Needs Answer Key*, *Missing Explanation*).
  - Question Editor modal supporting prompt, directive, statements (I, II, III), choices A-D, correct answer key, and explanation with live candidate preview.
- **Tab 3: Tracks & Blueprint Configurator (`tracks`)**:
  - Track hierarchy viewer (units, lessons, and total questions).
  - Blueprint rules: configurable negative marking penalty, exam duration, and passing threshold.
  - Custom track category creator.
- **Tab 4: Intelligent Mock Exam Paper Generator (`generator`)**:
  - Official syllabus blueprint presets (FPSC CSS MPT 200 MCQs, PPSC PMS 100 MCQs, UPSC 100 MCQs, and Custom Academy Blueprint).
  - Algorithmic non-duplicative sampling across matching syllabus domains (`src/lib/paperGenerator.js`).
  - Printable OMR Test Sheet generator and 1-click "Save as Playable Track".
- **Tab 5: Database Quality & Integrity Diagnostic Auditor (`audit`)**:
  - Automated defect scanner identifying missing keys, fewer than 2 choices, duplicate option values, and missing explanations.
  - Database Health Score (0–100%) and 1-click jump-to-editor action.
- **Tab 6: Bulk Import & Export Studio (`import-export`)**:
  - In-browser PDF Past Paper extractor.
  - Bulk plain-text and markdown MCQ parser.
  - CSV question import and export (`src/lib/csvHelper.js`).
  - Standard curriculum JSON exporter (`toDataFile`).
  - Full system database backup and restore (`backupManager`).

---

## 7. Storage Architecture (IndexedDB v4)

- **`progress` (IndexedDB v4)**: Keyed by `lesson:<lessonId>`. Stores attempt count, `bestScore`, `lastScore`, `total`, `completedAt`, `updatedAt`, `dirty`.
- **`content` (IndexedDB v4)**: Keyed by `category:<uuid>` or `question:<uuid>`. User-authored categories and questions.
- **`mistakes` (IndexedDB v4)**: Keyed by question ID. Stores question payload, `wrongCount`, `correctCount`, `streak`, `intervalDays`, `lastReviewedAt`, `nextReviewAt`, `mastered`.
- **`bookmarks` (IndexedDB v4)**: Keyed by question ID. Stores question payload, track/unit association, `savedAt`.
- **`notes` (IndexedDB v4)**: Keyed by question ID. Stores candidate study notes, mnemonics, and markdown annotations.
- **`mock_history` (IndexedDB v4)**: Stores past mock exam scores, date, track, negative marking deductions, and question breakdown.
- **`mpt_ai_streak` (`localStorage`)**: Daily solved questions and consecutive active-day streak count.
- **`mpt_ai_daily_sprints` (`localStorage`)**: Calendar-dated record of completed daily sprints and scores.
- **`mpt_ai_focus` (`localStorage`)**: Pomodoro session history and daily study minutes.
- **`mpt_ai_settings` (`localStorage`)**: Color theme, typography scale, sound/haptic toggles, and target exam goal.

---

## 8. Verification & Test Metrics

- **Oxlint**: `0 errors` across 75 files (`npm run lint`).
- **Vitest**: `55 passed / 55 tests` across 16 test files (`npm test`):
  1. `test/questionModel.test.js` (12 tests)
  2. `test/paperGenerator.test.js` (3 tests)
  3. `test/csvHelper.test.js` (2 tests)
  4. `test/contentStore.test.js` (4 tests)
  5. `test/buildCustom.test.js` (6 tests)
  6. `test/progress.test.js` (8 tests)
  7. `test/notesStore.test.js` (1 test)
  8. `test/mistakesStore.test.js` (3 tests)
  9. `test/focusStore.test.js` (1 test)
  10. `test/bookmarksStore.test.js` (1 test)
  11. `test/feedbackService.test.js` (2 tests)
  12. `test/backupManager.test.js` (2 tests)
  13. `test/customDrill.test.js` (3 tests)
  14. `test/analytics.test.js` (2 tests)
  15. `test/dailyStore.test.js` (1 test)
  16. `test/settingsAndParser.test.js` (4 tests)
- **Vite Build**: Production bundle built cleanly in ~796ms, 49 precached assets for offline PWA operation (`npm run build`).
