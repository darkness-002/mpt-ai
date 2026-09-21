# MPT-AI

An offline-first, mobile-friendly Progressive Web App (PWA) designed for competitive civil service screening exams in Pakistan:
- **CSS MPT** (MCQ-Based Preliminary Test — FPSC)
- **CSS Compulsory Subjects** (Part-I MCQs, 2013–2025)
- **PMS Prelims & Compulsory** (Provincial Management Service — PPSC)
- **UPSC CSE Prelims** (Civil Services Preliminary Exam — GS Paper I)

---

## Documentation Links

- **[AGENT.md](./AGENT.md)**: Comprehensive architectural guide, invariants, schemas, and instructions written specifically for AI agents and coding assistants.
- **[SUMMARY.md](./SUMMARY.md)**: Engineering change log and summary of implemented features (code splitting, Leitner SRS, mock exams, negative marking, tests, etc.).

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run automated test suite (50 tests in Vitest)
npm test

# Run code linter (Oxlint)
npm run lint

# Build for production with PWA precaching
npm run build
```

---

## 15 New Competitive Exam Features

1. **Interactive Flashcards Revision Mode (`/flashcards`)**
   - 3D flip card animation with active recall rating (Hard, Good, Easy).
   - Deck filtering by Starred questions, Mistakes Bank, or individual exam track.
   - Dedicated keyboard shortcuts (`Space` to flip, `1`/`2`/`3` to rate, arrow keys to navigate).
2. **Universal Global Search & Command Palette (`Ctrl+K` / `Cmd+K`)**
   - Instant spotlight search indexing exam tracks, subject units, drill modes, and quick tool shortcuts.
   - Full keyboard navigation (`↑`/`↓` to select, `Enter` to navigate, `Esc` to dismiss).
3. **Candidate Notes & Annotation System**
   - Attach personal mnemonics, tips, and explanations to any MCQ across Lessons, Drills, Mock reviews, and Flashcards.
   - Stored in IndexedDB (`notes` store) and included in complete data backups.
4. **Pomodoro Study Focus Timer with Ambient Audio**
   - Dedicated focus interval selector (25 min standard / 50 min deep study) with 5m and 15m break timers.
   - Synthesized offline ambient soundscapes (Brown noise, White noise, and subtle completion chimes) via the Web Audio API.
5. **Daily 10-MCQ Sprint Challenge (`/daily`)**
   - Deterministic daily sprint generated via date-seeded PRNG (`YYYY-MM-DD`).
   - Streak tracking, daily milestone completion badges, and instant answer feedback.
6. **Civil Services Exam Readiness Diagnostic Engine (`/readiness`)**
   - Composite **Readiness Index (0–100%)** calculated from Syllabus Coverage (35%), Historical Accuracy (35%), Leitner SRS Mastery (15%), and Streak Consistency (15%).
   - Identifies the candidate's **Top 3 Critical Weak Spots** with 1-click targeted drill generation.
7. **60-Second Speed Run / Sudden Death Challenge (`/speed-run`)**
   - Rapid-fire 60-second timer with streak combos, score multipliers (up to 3x), and time additions (`+3s` on correct, `-5s` on mistakes).
   - Optional Sudden Death mode (game over on the first mistake) with local high score leaderboards.
8. **Past Papers Vault & Explorer (`/papers`)**
   - Curated directory of official civil service papers: FPSC CSS MPT (2023–2026), PPSC PMS (2023–2025), CSS Compulsory Subjects (2013–2025), and UPSC CSE Prelims 2025.
   - Metadata breakdown including total questions, duration, negative marking deductions, and direct links to simulate or print worksheets.
9. **Printable Offline Exam Worksheets & OMR PDF Generator (`/worksheet`)**
   - Clean 2-column printable paper layout with candidate roll number blocks, test instructions, and answer keys.
   - Includes official 100/200-question blank bubble sheets formatted specifically for browser print-to-PDF (`@media print`).
10. **Interactive OMR Bubble Sheet Simulation Mode**
    - Realistic bubble sheet sidebar simulation integrated into Custom Drills and full Mock Exams.
    - Tactile pencil-fill bubble animations (`A`, `B`, `C`, `D`), question navigation palette, and answered/flagged indicators.
11. **Study Target Pacing Planner (`/planner`)**
    - Target exam countdown timer calculating exact daily question quotas needed to cover the curriculum.
    - Pacing health indicator (Ahead of Pace, On Track, Behind Pace) with an interactive quota calculator.
12. **Detailed Mock Exam Analytics & Review Mode**
    - Post-exam diagnostic breakdown with status filters: *All Questions*, *Missed / Incorrect*, *Skipped / Unanswered*, and *Flagged*.
    - One-click bulk action to save all missed questions directly into the Leitner Spaced Repetition (SRS) Mistakes Bank.
13. **Instant Theme & Eye-Care Quick Switcher**
    - One-tap cycling between 5 calibrated visual themes directly in the app header: System, Light, Dark, OLED True Black, and Sepia Warm Paper.
14. **Speech Synthesis / Voice Read-Aloud (TTS)**
    - 100% offline text-to-speech for questions and answer choices using the native browser `window.speechSynthesis` API.
15. **Multi-Store Backup, Cloud-Ready Export/Import & Granular Reset**
    - Complete snapshot export and restore: progress, bookmarks, mistakes, candidate notes, daily streak, and custom settings bundled into a validated JSON schema.

---

## Responsive Navigation Architecture

MPT-AI adopts an ergonomic dual-mode responsive layout:

- **Desktop Experience (`>= 860px`)**:
  - **Unified Top Header Bar (`AppHeader.jsx`)**: The primary navigation bar containing direct links to **Curriculum** (`/`), **Drill** (`/drill`), **Daily** (`/daily`), **Flashcards** (`/flashcards`), **Readiness** (`/readiness`), **Past Papers** (`/papers`), and **Admin** (`/admin`).
  - Right-side tools cluster: Global Spotlight Search (`Ctrl+K`), Streak counter, Pomodoro study timer, instant theme cycler, and settings.
  - **No duplicate bottom navigation**: The mobile dock is automatically hidden on desktop (`display: none`), providing a clean, distraction-free desktop reading environment.
  - **Zero in-page clutter**: Duplicate in-page headers, settings icons, and redundant modals have been completely removed from `TracksScreen`.
- **Mobile Experience (`< 860px`)**:
  - **Compact Header**: Brand logo, quick search, daily streak badge, theme switcher, and settings.
  - **Ergonomic Bottom Thumb Dock (`BottomNav.jsx`)**: Sticky 5-tab bar featuring Curriculum (`/`), Drill (`/drill`), Daily Sprint (`/daily`), Mistakes Bank (`/mistakes`), and a **"More Tools" (⋮)** drawer leading to Flashcards, Readiness, Speed Run, Past Papers, Worksheets, Study Planner, and the Admin Dashboard.

---

## Comprehensive Admin Dashboard (`/admin`)

A full-fledged civil service curriculum and examination management studio built directly into the PWA:

1. **System Overview & Telemetry Metrics (`overview`)**:
   - Live metrics: Total questions in database, custom authored count, active exam tracks, keyed question ratio (%), and explanation coverage.
   - Syllabus subject distribution charts (English, General Abilities, Science, Pakistan Affairs, Islamiat, Urdu).
   - Exam commission breakdown (FPSC CSS, PPSC PMS, UPSC Prelims).
2. **Question Bank Explorer & Live MCQ Editor (`questions`)**:
   - Universal search across prompts, choices, and explanations.
   - Filter by Exam, Track/Category, and Status (*Needs Answer Key*, *Missing Explanation*).
   - **Interactive MCQ Editor Modal**: Edit prompt stem, directive, statements (I, II, III), options A–D, correct answer key, and detailed explanation with live candidate preview.
   - Manual MCQ creation, deletion, and duplicate question detection.
3. **Curriculum & Exam Tracks Manager (`tracks`)**:
   - View all syllabus tracks, units, and lesson hierarchies.
   - **Exam Blueprint Configurator**: Adjust total questions per mock, time allowances, negative marking deductions (0.00, 0.25, 0.33, 0.50), and passing percentages.
   - Create new custom exam track categories with customizable colors.
4. **Intelligent Mock Exam Paper Generator (`generator`)**:
   - Official blueprint presets:
     - **FPSC CSS MPT 200-MCQ Blueprint** (English 50, Math/Ability 60, Science 30, Pak Affairs 20, Current Affairs 20, Islamic Studies 20).
     - **PPSC PMS 100-MCQ Blueprint** (Pak Studies 20, Islamiat 20, GK 20, English 20, Urdu 20).
     - **UPSC GS-I 100-MCQ Blueprint** (Polity 25, History 25, Geography 25, Economy/Science 25).
   - **Generate Balanced Paper**: Samples non-duplicated, answerable questions according to official weightages.
   - **Printable OMR Test Paper**: Browser print-to-PDF layout with candidate roll number block.
   - **Save as Playable Track**: Immediately publish generated mock exams as interactive in-app test tracks!
5. **Quality & Integrity Diagnostic Auditor (`audit`)**:
   - Deep diagnostic scanner checking for missing correct answers, fewer than 2 choices, duplicate option values, and missing explanations.
   - **Database Health Score Gauge (0–100%)** with 1-click "Fix in Editor" buttons.
6. **Bulk Import & Export Studio (`import-export`)**:
   - In-browser PDF Past Paper extractor.
   - Bulk plain-text and markdown MCQ parser.
   - Bulk CSV / Excel importer and exporter (`Prompt, Choice A, Choice B, Choice C, Choice D, Key, Explanation`).
   - Standard curriculum JSON exporter (`toDataFile`).
   - Full system database backup and restore (`backupManager`).

---

## Core Pedagogy & Engine Features

- **Duolingo-style Learning Path**: 10-MCQ bite-sized lessons that unlock unit-by-unit with question shuffling on every attempt.
- **Option Elimination (Strike-Through Mode)**: Rule out distractors with a dedicated scissor/slash action before committing to an answer.
- **Leitner Spaced Repetition (SRS)**: Automatic scheduling and interval expansion for missed questions until permanent mastery.
- **Negative Marking Support**: Configurable per-exam deduction rules (0 for MPT, 0.25 for PMS, 0.33 for UPSC).
- **Local-First & Offline**: Powered by IndexedDB v4 and Workbox Service Worker precaching (1.3 MB bundle).
