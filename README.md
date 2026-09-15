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
- **Timed Full-Length Mock Exams**: Real exam conditions, countdown timer, question palette, flagging, and diagnostic performance reports.
- **Mistakes Bank & Leitner SRS**: Missed questions are automatically captured and reviewed using Spaced Repetition until mastered.
- **Question Bookmarking**: Star tricky questions during practice to revise later in the Starred deck.
- **Negative Marking Support**: Configurable per-exam deduction rules (0 for MPT, 0.25 for PMS, 0.33 for UPSC).
- **Daily Goals & Streaks**: Habit-forming retention tracking (20 questions/day) persisted in local storage.
- **Urdu & RTL Support**: Native Nastaliq typography and right-to-left layout for Urdu modules.
- **Content Dashboard (`/admin`)**: In-app authoring suite with search filter, pagination, and JSON import/export.
- **Local-First & Offline**: Powered by IndexedDB v3 and Workbox Service Worker caching.
