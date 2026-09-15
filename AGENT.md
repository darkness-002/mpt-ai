# AGENT.md — AI Agent Guide & Context for MPT-AI

This document is designed for AI coding assistants (Antigravity, Claude, Copilot, Cursor, etc.) working on the **MPT-AI** codebase. It outlines the architectural foundations, design patterns, invariant rules, data schemas, and workflows needed to maintain and extend the project without introducing regressions or performance bottlenecks.

---

## 1. Project Philosophy & Architecture

- **Project:** MPT-AI — An offline-first, mobile-friendly PWA for competitive civil service screening exams (FPSC CSS MPT, PPSC PMS Prelims, and UPSC CSE Prelims).
- **Core Technology Stack:**
  - **Framework:** React 19 (Hooks, Context API, zero third-party UI/CSS frameworks)
  - **Bundler & Tooling:** Vite 8, VitePWA (`vite-plugin-pwa` with Workbox), Oxlint, Vitest
  - **Routing:** React Router v7 (`createBrowserRouter`)
  - **Storage:** Local-first IndexedDB (v3) with in-memory fallbacks and `localStorage` for streaks
- **Key Design Ethos:**
  - **Zero Bloat:** Do **not** install component libraries (MUI, Chakra, AntD), CSS utilities (Tailwind, Bootstrap), or global state libraries (Redux, Zustand). The existing vanilla CSS with CSS variables (`--hue`, `--radius`, `--surface`) is intentionally minimal, ultra-fast, and mobile-native.
  - **Local-First & Offline-First:** The app must function 100% offline. All routes and split chunks must remain precached by Workbox in `vite.config.js`.

---

## 2. Critical Invariants & Rules (DO NOT BREAK)

1. **NEVER Statically Import Question JSONs into `curriculum.js`**:
   - **Rule:** Question JSON files in `src/data/questions/` must **always** be loaded via dynamic import functions (e.g. `() => import('./questions/coached/english.json').then((m) => m.default)`).
   - **Reason:** Static imports bundle hundreds of kilobytes of questions into `index.js`, triggering chunk-size warnings and slowing initial render. Dynamic imports allow Vite to split each paper into its own cacheable asset.
2. **NEVER Bypass the `isAnswerable()` Quality Guard**:
   - Staging questions (like `upsc-prelims/2025-gs1.staging.json`) carry `answer: null`.
   - In JavaScript, `null >= 0` evaluates to `true`. Without `Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length`, unkeyed questions would silently mark Option 1 as correct.
   - Always run question collections through `isAnswerable` before displaying them.
3. **Preserve Answer Provenance**:
   - When official exam keys are published, use them.
   - When no official key exists (e.g. CSS Written Compulsory MCQs), questions must explicitly set `source: { keyedBy: 'mpt-ai' }` so candidates know the answer was worked out by the app rather than published by the examiner.
4. **Preserve Urdu & RTL Support**:
   - Any Urdu or RTL subject unit must have `rtl: true`.
   - When rendering questions in UI components, always conditionally set `dir={question.rtl ? 'rtl' : 'ltr'}` and apply the `.urdu` class for Nastaliq/Urdu typography.
5. **Route-Level Code Splitting**:
   - All page-level route components in `src/routes.jsx` must be declared using `React.lazy()`.
   - `<Outlet />` in `src/App.jsx` must remain wrapped in `<Suspense>`.

---

## 3. Data Hierarchy & Schemas

The curriculum follows a 5-tier hierarchy:
```
Exam (e.g. CSS, PMS, UPSC)
 └── Track (e.g. CSS MPT, PMS Prelims)
      └── Unit (e.g. General Abilities, English, Urdu)
           └── Lesson (Bite-sized chunks of ~10 questions)
                └── Question (MCQ stem, options, key, explanation)
```

### The Question Schema
```typescript
interface Question {
  id: string;                      // e.g. "english-2026-1" or "upsc2025gs1-7"
  prompt: string;                  // The question stem
  choices: string[];               // Minimum 2 choices (typically 4 choices)
  answer: number;                  // 0-indexed integer (0 = Choice 1, 1 = Choice 2)
  directive?: string;              // Optional instruction above prompt ("Choose the ANTONYM...")
  statements?: string[];           // Optional statement list ("I. Statement A", "II. Statement B")
  closing?: string;                // Optional closing ask ("Which of the above are correct?")
  explanation?: string;            // Pedagogical explanation shown after answering
  source?: {
    paper: string;                 // e.g. "MPT 2026", "UPSC CSE Prelims 2025"
    number?: number;               // Question number on the physical exam paper
    keyedBy?: 'mpt-ai' | 'author'; // Omit if official examiner key
    keySource?: string;            // Citation if sourced from an external publisher
  };
}
```

### The Track Blueprint Schema
```typescript
interface Blueprint {
  totalMcqs: number;       // Exam capacity (e.g. 200 for MPT, 100 for PMS)
  minutes: number;         // Time allowed (e.g. 200 mins for MPT, 120 for PMS)
  passingMarks: number;    // Qualifying mark (e.g. 66 for MPT, 40 for PMS)
  negativeMarking: number; // 0 for CSS MPT, 0.25 for PMS, 0.33 for UPSC
}
```

---

## 4. Storage Architecture (IndexedDB v3 + LocalStorage)

### IndexedDB Database: `mpt-ai` (Version 3)
Access via `src/storage/idb.js`. Object stores:
1. **`progress`**: Stores `LessonRecord` objects keyed by `id` (`lesson:<lessonId>`).
   - Fields: `lessonId`, `attempts`, `bestScore`, `lastScore`, `total`, `completedAt`, `updatedAt`, `dirty`.
2. **`content`**: Stores author-created categories (`category:<uuid>`) and custom questions (`question:<uuid>`).
3. **`mistakes`**: Stores `MistakeRecord` objects for Leitner Spaced Repetition (SRS).
   - Keyed by `question.id`.
   - Fields: `question`, `wrongCount`, `correctCount`, `streak`, `intervalDays`, `nextReviewAt`, `mastered`.
4. **`bookmarks`**: Stores bookmarked questions keyed by `question.id`.
   - Fields: `question`, `trackId`, `unitId`, `savedAt`.

### Fallbacks & Other Stores
- **In-Memory Fallback:** When IndexedDB is blocked or private browsing restricts storage, `adapter.js`, `contentStore.js`, `mistakesStore.js`, and `bookmarksStore.js` transparently fall back to in-memory `Map` instances without crashing the UI.
- **`streakStore` (`src/storage/streakStore.js`):** Uses `localStorage` (`mpt_ai_streak`) to track daily practice counts against the user goal (default 20/day) and consecutive active-day streaks.
- **`adapter.js`:** Contains `exportProgressPayload()` and `parseAndMergeProgress()` for JSON backups, and `createSyncQueue()` as a seam for remote sync.

---

## 5. Scoring & Negative Marking Formula

Always use `calculateScore()` from `src/data/curriculum.js`:
```javascript
const { correct, wrong, marksDeducted, netScore } = calculateScore(answers, negativeMarking);
```
- `marksDeducted = Math.round(wrong * negativeMarking * 100) / 100`
- `netScore = Math.max(0, Math.round((correct - marksDeducted) * 100) / 100)`
- Net score is never allowed to be negative.

---

## 6. Directory Map

```
mpt-ai/
├── src/
│   ├── components/            # Reusable icons and UI atoms (LessonNode, icons.jsx)
│   ├── content/               # ContentProvider, Context, buildCustom (author questions chunker)
│   ├── data/                  # curriculum.js (track manifests and dynamic loaders)
│   │   └── questions/         # JSON question banks (coached, past-papers, pms, upsc)
│   ├── lib/                   # Utilities (shuffle.js, useInstallPrompt.js)
│   ├── routes/                # Page screens (Tracks, Path, Lesson, MockExam, Mistakes, Bookmarks, Admin)
│   ├── storage/               # Storage layer (idb.js, adapter.js, contentStore, mistakesStore, bookmarksStore, streakStore)
│   ├── App.jsx                # App shell, PWA update toast, Suspense wrapper for Outlet
│   ├── routes.jsx             # Route definitions with React.lazy
│   └── main.jsx               # createRoot entry point
├── test/                      # Vitest unit test suites (buildCustom, contentStore, progress)
├── scripts/                   # CLI utilities (import-past-paper.mjs, generate-icons.mjs)
├── AGENT.md                   # This AI Agent guide
└── SUMMARY.md                 # Engineering change log
```

---

## 7. Common Workflows & Verification

### Running Checks
```bash
# Run automated tests
npm test

# Run Oxlint linter
npm run lint

# Run production build and verify bundle splitting + service worker precache
npm run build
```

### Adding a New Question Bank (Past Paper or Coached Set)
1. Add the JSON file to `src/data/questions/<folder>/<filename>.json`.
2. Ensure every question adheres to the `Question` schema with an integer `answer` (0-indexed).
3. In `src/data/curriculum.js`:
   - Add a loader to `SOURCES`:
     ```javascript
     myNewPaper: () => import('./questions/<folder>/<filename>.json').then((m) => m.default)
     ```
   - Add the loader to the appropriate unit's `sourceLoaders` array in `TRACK_CONFIGS`.
4. Run `npm test && npm run build` to verify tests pass and bundle code-splitting is clean.

### Automated PDF Ingestion
```bash
node scripts/import-past-paper.mjs --pdf ./path/to/paper.pdf --label "MPT 2027" [--skip 21-40] [--dry]
```
*(Script uses `pdfjs-dist` to automatically detect bolded fonts representing answer keys).*
