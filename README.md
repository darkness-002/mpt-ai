# MPT-AI

An offline-first, mobile-friendly Progressive Web App (PWA) and collaborative curriculum platform designed for competitive civil service screening exams in Pakistan:
- **CSS MPT** (MCQ-Based Preliminary Test — FPSC)
- **CSS Compulsory Subjects** (Part-I MCQs, 2013–2025)
- **PMS Prelims & Compulsory** (Provincial Management Service — PPSC)

MPT-AI combines a **Duolingo-style bite-sized curriculum**, an **interactive OMR bubble sheet simulator**, a **spaced-repetition mistakes engine**, and an **editorial Draft-to-Live review pipeline** backed by optional cloud sync (Supabase) and Role-Based Access Control (RBAC).

---

## Documentation Links

- **[AGENT.md](./AGENT.md)**: Comprehensive architectural guide, invariants, schemas, and instructions written specifically for AI agents and coding assistants.
- **[SUMMARY.md](./SUMMARY.md)**: Engineering changelog, design system evolution, and implementation notes.
- **[supabase/schema.sql](./supabase/schema.sql)**: Supabase PostgreSQL database schema, RLS policies, RBAC roles, and indexes.
- **[supabase/migration_draft_to_live.sql](./supabase/migration_draft_to_live.sql)**: SQL migration for the multi-stage Draft-to-Live question approval pipeline.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server (Vite 8 + React 19)
npm run dev

# 3. Run automated test suite (Vitest)
npm test

# 4. Run fast code linter (Oxlint)
npm run lint

# 5. Build for production with offline PWA precaching
npm run build

# 6. Preview production build locally
npm run preview
```

### Optional Supabase Cloud Sync & Admin Scripts

```bash
# Provision an initial staff / admin account in Supabase
npm run create-admin

# Migrate bundled curriculum question banks to Supabase database
npm run migrate

# Parse and import past paper text / markdown files
npm run import-paper

# Regenerate PWA app icons and favicons
npm run icons
```

---

## Key Architectural Highlights

### 1. Hybrid Offline-First & Cloud-Connected Engine
- **100% Offline Capable**: Fully functional without an internet connection using IndexedDB v4 and Workbox Service Worker asset precaching.
- **Seamless Cloud Sync**: When connected to Supabase, user profiles, study progress, streaks, bookmarks, and mistakes synchronize automatically across devices.
- **Graceful Fallback**: If offline or if Supabase is unconfigured, the app falls back instantly to local IndexedDB and bundled JSON curriculum banks.
- **Full Data Portability**: 1-click JSON snapshot export/restore bundling candidate progress, bookmarks, SRS mistake bank, notes, and preferences.

### 2. "The Reading Lamp" Design System & WCAG AA Themes
- **Design Metaphor**: A quiet desk at night—ink on paper with the warm glow of a reading lamp.
- **Signature Visual Motif**: Tactical OMR Bubble Sheet styling integrated into cards, choices, and navigation badges.
- **3 Calibrated WCAG AA Compliant Themes** (1-tap cyclic toggle in header or settings):
  1. **Light**: Clean paper ground (`#F8FAF9`) with deep scholar teal (`#0F766E`) and amber accents (`#F59E0B`).
  2. **Dark**: Deep night pine ground (`#0A1412`) with vibrant teal (`#2DD4BF`) and amber accents.
  3. **Espresso**: Warm dark roast desk (`#120F0D`) with cozy amber glow (`#D97706`).
- **Design Tokens (`src/styles/tokens.css`)**: Strict semantic variables for surface elevation, ruled paper lines, and hairline borders (6–8% text alpha).
- **Zero Third-Party UI Bloat**: Built with vanilla CSS and lightweight Tailwind CSS v4 utility classes.

### 3. Draft-to-Live Content Approval Pipeline
- **Multi-Stage Question Lifecycle**:
  - `pending`: Newly authored questions or community submissions staged for quality verification.
  - `approved`: Vetted questions published live into student learning paths, mock exams, and custom drills.
  - `rejected`: Flawed or duplicate questions flagged for revision or removal.
- **Quality Guard**: Non-staff students are strictly prevented from encountering unverified drafts or questions lacking verified answer keys (`isAnswerable()` guard).
- **Review Queue**: Dedicated reviewer interface in Admin Studio with 1-click **Approve**, **Reject**, or inline editing before publication.

### 4. Role-Based Access Control (RBAC)
Configured via Supabase Row-Level Security (RLS) policies and evaluated client-side in `src/context/rbac.js`:
- **Admin**: Full telemetry overview, user management, staff provisioning, database quality audit, and unrestricted CRUD.
- **Editor**: Modify question prompts, statements, answer keys, explanations, and metadata.
- **Reviewer**: Access review queue, inspect incoming drafts, approve/reject submissions, and delete invalid entries.
- **Contributor**: Submit candidate MCQs into assigned subject categories (saved as `pending` drafts).
- **Student / User**: Practice curriculum, track study streaks, solve daily sprints, and sync personal progress.
- **Console Lock Mode**: Examiner PIN lock to secure the admin terminal during authoring sessions.

---

## 15+ Core Study & Simulation Features

1. **Interactive OMR Bubble Sheet Simulation Mode**
   - Authentic optical mark recognition (OMR) bubble sheet sidebar for Custom Drills and full Mock Exams.
   - Tactile bubble-fill animations (`A`, `B`, `C`, `D`), question palette jump grid, and answered/flagged indicators.
2. **Interactive Flashcards Revision Mode (`/flashcards`)**
   - 3D card flip animation with active recall rating (**Hard**, **Good**, **Easy**).
   - Deck filtering by Starred items, Mistakes Bank, or individual exam track.
   - Dedicated keyboard shortcuts (`Space` to flip, `1`/`2`/`3` to rate, arrow keys to navigate).
3. **Universal Global Search & Command Palette (`Ctrl+K` / `Cmd+K`)**
   - Instant spotlight search indexing exam tracks, curriculum units, drill modes, and shortcuts.
   - Full keyboard navigation (`↑`/`↓` to select, `Enter` to open, `Esc` to dismiss).
4. **Candidate Notes & Annotation System**
   - Attach personal mnemonics, study tips, and explanations to any MCQ across Lessons, Drills, Mock reviews, and Flashcards.
   - Stored in IndexedDB (`notes` store) and included in complete JSON backups.
5. **Pomodoro Study Focus Timer with Ambient Audio Dial**
   - Circular SVG focus dial with 25m standard / 50m deep study intervals and 5m/15m break timers.
   - Web Audio API synthesized ambient noise (**Brown Noise**, **White Noise**) and completion chimes operating 100% offline.
6. **Daily 10-MCQ Sprint Challenge (`/daily`)**
   - Deterministic daily sprint generated via calendar date-seeded PRNG (`YYYY-MM-DD`).
   - Streak tracking, milestone completion badges, celebratory confetti, and instant review.
7. **Civil Services Exam Readiness Diagnostic Engine (`/readiness`)**
   - Composite **Readiness Index (0–100%)** calculated from Syllabus Coverage (35%), Historical Accuracy (35%), Leitner SRS Mastery (15%), and Streak Consistency (15%).
   - Identifies the candidate's **Top 3 Critical Weak Spots** with 1-click targeted drill generation.
8. **60-Second Speed Run / Sudden Death Challenge (`/speed-run`)**
   - Rapid-fire 60-second timer with streak combos, score multipliers (up to 3x), and time adjustments (`+3s` on correct, `-5s` on mistakes).
   - Optional Sudden Death mode (game over on first error) with local high score tracking.
9. **Past Papers Vault & Explorer (`/papers`)**
   - Curated directory of official civil service papers: FPSC CSS MPT (2023–2026), PPSC PMS (2023–2025), and CSS Compulsory Subjects (2013–2025).
   - Metadata breakdown: question counts, time limits, negative marking deduction rules, and direct simulation links.
10. **Printable Offline Exam Worksheets & OMR PDF Generator (`/worksheet`)**
    - Clean 2-column printable paper layout with candidate roll number blocks, instructions, and answer keys.
    - Official 100/200-question blank bubble sheets formatted for clean browser print-to-PDF (`@media print`).
11. **Study Target Pacing Planner (`/planner`)**
    - Target exam countdown timer calculating exact daily question quotas needed to cover the curriculum.
    - Pacing health indicator (**Ahead of Pace**, **On Track**, **Behind Pace**) with dynamic quota recalculation.
12. **Detailed Mock Exam Analytics & Review Mode**
    - Post-exam diagnostic breakdown with status filters: *All Questions*, *Missed / Incorrect*, *Skipped / Unanswered*, and *Flagged*.
    - One-click bulk action to transfer all missed questions directly into the Leitner Spaced Repetition (SRS) Mistakes Bank.
13. **Leitner Spaced Repetition System (SRS) Mistakes Bank (`/mistakes`)**
    - Missed questions automatically schedule for spaced review with expanding intervals until permanent mastery.
    - Retention hook banner on the main Study Desk highlights due questions.
14. **Speech Synthesis / Voice Read-Aloud (TTS)**
    - 100% offline text-to-speech for questions and choices using the native browser `window.speechSynthesis` API.
15. **Distractor Elimination (Strike-Through Action)**
    - Eliminate incorrect options with a scissor/slash action before committing to an answer.
16. **Candidate Bookmarks Deck (`/bookmarks`)**
    - Star challenging questions across any session for quick revision and targeted practice.

---

## Responsive Navigation Architecture

MPT-AI adopts an ergonomic dual-mode responsive layout:

- **Desktop Experience (`>= 860px`)**:
  - **Top Header Bar (`AppHeader.jsx`)**: Primary navigation links to **Curriculum** (`/`), **Practice Drill** (`/drill`), **Daily Sprint** (`/daily`), and **Mistakes Bank** (`/mistakes`).
  - **Tool Controls**: Global Search bar (`Ctrl+K`), Pomodoro Focus Dial modal, live Streak Pill, 1-tap Theme cycler, Account / Auth trigger, and Settings.
  - **Distraction-Free**: Mobile bottom dock is completely hidden (`display: none`), providing clean reading space.
  - **Immersive Mode**: Header automatically hides during active lessons, mock exams, and speed runs to maximize focus.
- **Mobile Experience (`< 860px`)**:
  - **Compact Header**: OMR brand logo, quick search icon, streak pill, theme switcher, and account avatar.
  - **Bottom Thumb Dock (`BottomNav.jsx`)**: Sticky 4-destination thumb dock: **Home**, **Drill**, **Daily Sprint**, and **Settings**.
  - **Intelligent Visibility**: Bottom dock hides during full-screen drills, mock exams, and lessons.

---

## Administration & Editorial Studio (`/admin`)

A complete civil service curriculum management workstation:

1. **Dashboard (Overview & Health)**:
   - Live metrics: Total questions in database, staging drafts count, approved live questions, and rejected items.
   - Database Quality Health Score (0–100%) scanning for missing keys, duplicate options, or missing explanations.
   - Syllabus subject breakdown and exam commission distribution (FPSC CSS, PPSC PMS).
2. **New Question Workflow (Add Question)**:
   - Multi-statement stem builder (Statements I, II, III), options A–D, answer key selector, and detailed pedagogical explanation.
   - Dynamic subject/category assignment with 1-click inline category creation.
   - Target exam tagging (`CSS`, `PMS`).
   - Staged automatically as `pending` draft for reviewer approval.
3. **Review Queue**:
   - Filter incoming drafts by exam, subject, and status (*Pending*, *Approved*, *Rejected*).
   - Inspect question stems, verify answer keys, and click **Approve** to publish live to students.
   - Bulk approval and rejection actions with instant database sync.
4. **User Management & Staff Roles**:
   - Provision staff team accounts and assign RBAC roles (`admin`, `editor`, `reviewer`, `contributor`, `student`).
   - Category-level contribution permission assignments.
5. **Intelligent Mock Exam Blueprint Generator**:
   - Algorithmic balanced paper generation using official blueprints:
     - **FPSC CSS MPT 200-MCQ Blueprint** (English 50, Abilities 60, Science 30, Pak Affairs 20, Current Affairs 20, Islamic Studies 20).
     - **PPSC PMS 100-MCQ Blueprint** (Pak Studies 20, Islamiat 20, GK 20, English 20, Urdu 20).
   - Export generated paper to printable OMR exam sheet or publish directly as an in-app playable track.
6. **Bulk Importer & Exporter**:
   - In-browser PDF Past Paper extractor.
   - Plain-text and Markdown MCQ bulk parser.
   - CSV / Excel bulk question importer and exporter.
   - Standard curriculum JSON backup and restore.

---

## Application Route Map

| Route Path | Component | Description |
| :--- | :--- | :--- |
| `/` | `TracksScreen.jsx` | Main Study Desk: active lesson hero card, streak counter, SRS review hook, and exam track grid |
| `/track/:trackId` | `PathScreen.jsx` | Duolingo-style unit learning path, milestone progress, and mock exam launcher |
| `/lesson/:lessonId` | `LessonRoute.jsx` | 10-MCQ bite-sized lesson with option strike-through, instant explanations, notes, and TTS |
| `/mock/:trackId` | `MockExamScreen.jsx` | Timed full mock exam with OMR bubble sidebar, question palette, session recovery, and review |
| `/drill` | `CustomQuizScreen.jsx` | Custom quiz builder by subject/paper, with timer options and OMR mode toggle |
| `/daily` | `DailySprintScreen.jsx` | Daily 10-MCQ sprint challenge seeded fresh every 24 hours with streak tracking |
| `/flashcards` | `FlashcardsScreen.jsx` | 3D active recall flashcards with Leitner rating and keyboard hotkeys |
| `/readiness` | `ReadinessScreen.jsx` | Civil Services Exam Readiness Diagnostic (0–100%) and critical weak spot analysis |
| `/speed-run` | `SpeedRunScreen.jsx` | 60-second rapid-fire speed run / sudden death challenge with combo multipliers |
| `/papers` | `PastPapersScreen.jsx` | Official civil service past papers directory (CSS MPT, PPSC PMS, CSS Compulsory) |
| `/worksheet` | `WorksheetScreen.jsx` | Printable offline 2-column test papers and blank 100/200-question OMR bubble sheets |
| `/planner` | `StudyPlannerScreen.jsx` | Exam countdown target planner with daily question quota calculator |
| `/analytics` | `AnalyticsScreen.jsx` | Detailed subject mastery radar, accuracy breakdowns, and historical performance |
| `/mistakes` | `MistakesScreen.jsx` | Leitner Spaced Repetition (SRS) mistake bank with mastery progression |
| `/bookmarks` | `BookmarksScreen.jsx` | Personal question revision deck of candidate-starred questions |
| `/admin` | `AdminScreen.jsx` | Examiner workstation: staging review queue, question authoring, RBAC users, generator, and audit |

---

## Storage & Data Sync Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           MPT-AI Client                         │
├───────────────────────────────┬─────────────────────────────────┤
│       Local Persistence       │        Cloud Connectivity       │
│                               │                                 │
│ • IndexedDB v4                │ • Supabase Auth (JWT / Session) │
│   - progress (lessons)        │ • Supabase Database (Postgres)  │
│   - content (custom tracks)   │   - profiles (RBAC roles)       │
│   - mistakes (Leitner SRS)    │   - tracks & categories         │
│   - bookmarks (saved MCQs)    │   - questions (status: pending  │
│   - notes (annotations)       │     / approved / rejected)      │
│   - mock_history              │   - audit_logs                  │
│ • LocalStorage                │ • Row Level Security (RLS)      │
│   - streak & daily sprints    │                                 │
│   - focus minutes             │                                 │
│   - user settings & theme     │                                 │
└───────────────────────────────┴─────────────────────────────────┘
```

---

## Exam Blueprints & Commission Rules

| Exam Track | Commission | Questions | Time Limit | Pass Mark | Negative Marking |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CSS MPT** | FPSC (Federal) | 200 MCQs | 200 mins | 66 (33%) | **0.00** (No penalty) |
| **CSS Compulsory** | FPSC (Federal) | 20 MCQs | 30 mins | 10 (50%) | **0.00** (No penalty) |
| **PMS Prelims** | PPSC (Punjab) | 100 MCQs | 120 mins | 40 (40%) | **-0.25** marks per wrong answer |
| **PMS Compulsory** | PPSC (Punjab) | 20 MCQs | 30 mins | 10 (50%) | **-0.25** marks per wrong answer |

---

## Technology Stack

- **Framework**: React 19 (`react`, `react-dom`)
- **Routing**: React Router v7 (`react-router-dom`)
- **Build Tool**: Vite 8 (`vite`)
- **PWA & Offline**: `vite-plugin-pwa` (Workbox Service Worker precaching)
- **Styling**: Vanilla CSS Design Tokens (`src/styles/tokens.css`) + Tailwind CSS v4 (`@tailwindcss/vite`)
- **Backend & Auth**: Supabase JS Client v2 (`@supabase/supabase-js`, `@supabase/ssr`)
- **Linter**: Oxlint (`oxlint`)
- **Test Runner**: Vitest (`vitest`)
- **PDF Extraction**: PDF.js (`pdfjs-dist`)
- **Audio Synthesizer**: Web Audio API (offline white/brown noise generator)
