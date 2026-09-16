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

# Run automated test suite (Vitest)
npm test

# Run code linter (Oxlint)
npm run lint

# Build for production with PWA precaching
npm run build
```

---

## Core Features

- **Duolingo-style Learning Path**: 10-MCQ bite-sized lessons that unlock unit-by-unit with question shuffling on every attempt.
- **Mobile Bottom Navigation**: Thumb-friendly sticky bar on mobile and floating dock on desktop for seamless switching between Curriculum, Custom Drills, Mistakes, Starred, Analytics, and Settings.
- **Option Elimination (Strike-Through Mode)**: Rule out distractors with a dedicated scissor/slash action before committing to an answer.
- **Theme & Typography Customizer**: Support for System, Light, Dark, OLED True Black, and Sepia themes with real-time text scaling (`A-` to `A++`).
- **Timed Full-Length Mock Exams with Session Recovery**: Real exam conditions, countdown timer, question palette with status filters (All / Unanswered / Flagged), fullscreen lockdown mode, automatic session crash recovery, and diagnostic performance reports.
- **Custom Practice Drill Builder (`/drill`)**: Create tailored practice sets by subject, past paper year, or difficulty with custom question counts and optional timers.
- **Performance & Study Insights (`/analytics`)**: Subject-by-subject accuracy matrix, mastery tracking, and target exam countdown pacing planner.
- **Mistakes Bank & Leitner SRS (`/mistakes`)**: Missed questions are automatically captured and reviewed using Spaced Repetition intervals until mastered.
- **Question Bookmarking (`/bookmarks`)**: Star tricky questions during practice to revise later in the Starred deck.
- **Negative Marking Support**: Configurable per-exam deduction rules (0 for MPT, 0.25 for PMS, 0.33 for UPSC).
- **Audio & Haptic Feedback with Confetti**: Synthesized Web Audio chimes, mobile vibration feedback, and canvas confetti bursts upon mastery.
- **In-Browser PDF & Text Past Paper Importer (`/admin`)**: Extract and import questions directly from past-paper PDFs and formatted text in the browser.
- **Local-First & Offline**: Powered by IndexedDB v3 and Workbox Service Worker caching.
