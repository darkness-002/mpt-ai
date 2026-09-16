/**
 * Curriculum definitions and loaders for MPT-AI.
 * Dynamic imports code-split question JSON files into separate chunks.
 *
 * @typedef {Object} QuestionSource
 * @property {string} paper
 * @property {number} [number]
 * @property {string} [keyedBy]
 * @property {string} [keySource]
 *
 * @typedef {Object} Question
 * @property {string} id
 * @property {string} prompt
 * @property {string} [directive]
 * @property {string[]} [statements]
 * @property {string} [closing]
 * @property {string[]} choices
 * @property {number} answer
 * @property {string} [explanation]
 * @property {QuestionSource} [source]
 *
 * @typedef {Object} Lesson
 * @property {string} id
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} [paper]
 * @property {string} kind
 * @property {string} unitId
 * @property {string} unitTitle
 * @property {string} trackId
 * @property {string} trackTitle
 * @property {number} hue
 * @property {boolean} rtl
 * @property {number} indexInUnit
 * @property {Question[]} questions
 *
 * @typedef {Object} Unit
 * @property {string} id
 * @property {string} title
 * @property {string} tagline
 * @property {number} [marks]
 * @property {number} hue
 * @property {boolean} rtl
 * @property {string|null} note
 * @property {number} questionCount
 * @property {Lesson[]} lessons
 *
 * @typedef {Object} Blueprint
 * @property {number} totalMcqs
 * @property {number} minutes
 * @property {number} passingMarks
 * @property {number} negativeMarking  0 if no negative marking, or fractional penalty e.g. 0.25
 *
 * @typedef {Object} Track
 * @property {string} id
 * @property {string} exam
 * @property {string} title
 * @property {string} tagline
 * @property {Blueprint} [blueprint]
 * @property {string} [note]
 * @property {Unit[]} units
 * @property {number} lessonCount
 * @property {number} questionCount
 * @property {boolean} [custom]
 */

const SOURCES = {
  coachedEnglish: () => import('./questions/coached/english.json').then((m) => m.default),
  coachedAbilities: () => import('./questions/coached/general-abilities.json').then((m) => m.default),
  coachedKnowledge: () => import('./questions/coached/general-knowledge.json').then((m) => m.default),
  coachedIslamic: () => import('./questions/coached/islamic-studies.json').then((m) => m.default),
  coachedUrdu: () => import('./questions/coached/urdu.json').then((m) => m.default),
  paperEnglish: () => import('./questions/past-papers/english.json').then((m) => m.default),
  paperAbilities: () => import('./questions/past-papers/general-abilities.json').then((m) => m.default),
  paperKnowledge: () => import('./questions/past-papers/general-knowledge.json').then((m) => m.default),
  paperIslamic: () => import('./questions/past-papers/islamic-studies.json').then((m) => m.default),
  cssGsa: () => import('./questions/css-compulsory/general-science-ability.json').then((m) => m.default),
  pms2023: () => import('./questions/pms-prelims/2023.json').then((m) => m.default),
  pms2024: () => import('./questions/pms-prelims/2024.json').then((m) => m.default),
  pms2025: () => import('./questions/pms-prelims/2025.json').then((m) => m.default),
  pmsPakStudies: () => import('./questions/pms-compulsory/pakistan-studies.json').then((m) => m.default),
  pmsIslamic: () => import('./questions/pms-compulsory/islamic-studies.json').then((m) => m.default),
  upsc2025: () => import('./questions/upsc-prelims/2025-gs1.json').then((m) => m.default),
}

export const TRACK_CONFIGS = [
  {
    id: 'css-mpt',
    exam: 'CSS',
    title: 'MPT — Preliminary Test',
    tagline: 'The FPSC screening paper you must clear to sit the written exam',
    blueprint: { totalMcqs: 200, minutes: 200, passingMarks: 66, negativeMarking: 0 },
    note: 'Real questions from MPT 2023 (Special) and MPT 2026, after coached sets that explain the answer.',
    units: [
      {
        id: 'general-abilities',
        title: 'General Abilities',
        tagline: 'Maths, logic and analytical reasoning',
        marks: 60,
        hue: 172,
        sourceLoaders: [SOURCES.coachedAbilities, SOURCES.paperAbilities],
      },
      {
        id: 'english',
        title: 'English',
        tagline: 'Grammar, vocabulary, sentence correction',
        marks: 50,
        hue: 244,
        sourceLoaders: [SOURCES.coachedEnglish, SOURCES.paperEnglish],
      },
      {
        id: 'general-knowledge',
        title: 'General Knowledge',
        tagline: 'Everyday science, current affairs, Pakistan affairs',
        marks: 50,
        hue: 199,
        sourceLoaders: [SOURCES.coachedKnowledge, SOURCES.paperKnowledge],
      },
      {
        id: 'islamic-studies',
        title: 'Islamic Studies',
        tagline: 'Quran, Seerah, Hadith and history',
        marks: 20,
        hue: 40,
        sourceLoaders: [SOURCES.coachedIslamic, SOURCES.paperIslamic],
      },
      {
        id: 'urdu',
        title: 'اردو',
        tagline: 'قواعد، محاورات، ضرب الامثال',
        marks: 20,
        hue: 291,
        sourceLoaders: [SOURCES.coachedUrdu],
      },
    ],
  },
  {
    id: 'css-compulsory',
    exam: 'CSS',
    title: 'Compulsory subjects',
    tagline: 'Part-I MCQs from the CSS written papers',
    blueprint: { totalMcqs: 20, minutes: 30, passingMarks: 10, negativeMarking: 0 },
    note: 'No official key was published for these papers, so the answers were worked out by MPT-AI and are flagged as such.',
    units: [
      {
        id: 'css-compulsory-gsa',
        title: 'General Science & Ability',
        tagline: 'Part-I MCQs, 2013–2025',
        marks: 20,
        hue: 152,
        sourceLoaders: [SOURCES.cssGsa],
      },
    ],
  },
  {
    id: 'pms-prelims',
    exam: 'PMS',
    title: 'Prelims — General Ability',
    tagline: 'The PPSC screening paper for the Provincial Management Service',
    blueprint: { totalMcqs: 100, minutes: 120, passingMarks: 40, negativeMarking: 0.25 },
    note: 'PPSC syllabus: general knowledge, Pakistan studies, Islamic studies, current affairs, geography, maths, English, Urdu, everyday science and computer skills — 0.25 negative marking per wrong answer.',
    units: [
      {
        id: 'pms-2025',
        title: 'PPSC PMS 2025',
        tagline: 'General ability paper',
        hue: 268,
        sourceLoaders: [SOURCES.pms2025],
      },
      {
        id: 'pms-2024',
        title: 'PPSC PMS 2024',
        tagline: 'General ability paper',
        hue: 220,
        sourceLoaders: [SOURCES.pms2024],
      },
      {
        id: 'pms-2023',
        title: 'PPSC PMS 2023',
        tagline: 'General ability paper',
        hue: 190,
        sourceLoaders: [SOURCES.pms2023],
      },
    ],
  },
  {
    id: 'pms-compulsory',
    exam: 'PMS',
    title: 'Compulsory subjects',
    tagline: 'Part-I MCQs from the PMS written papers',
    blueprint: { totalMcqs: 20, minutes: 30, passingMarks: 10, negativeMarking: 0.25 },
    units: [
      {
        id: 'pms-compulsory-pakistan-studies',
        title: 'Pakistan Studies',
        tagline: 'PMS compulsory paper',
        hue: 142,
        sourceLoaders: [SOURCES.pmsPakStudies],
      },
      {
        id: 'pms-compulsory-islamic-studies',
        title: 'Islamic Studies',
        tagline: 'PMS compulsory paper',
        hue: 40,
        sourceLoaders: [SOURCES.pmsIslamic],
      },
    ],
  },
  {
    id: 'upsc-prelims',
    exam: 'UPSC',
    title: 'CSE Prelims — General Studies',
    tagline: 'Civil Services (Preliminary) Examination Paper I',
    blueprint: { totalMcqs: 100, minutes: 120, passingMarks: 66, negativeMarking: 0.33 },
    note: 'Real questions from UPSC CSE Prelims 2025 GS Paper I with verified keys. Negative marking: 1/3 (0.33) marks deducted per incorrect answer.',
    units: [
      {
        id: 'upsc-2025-gs1',
        title: 'UPSC CSE 2025',
        tagline: 'General Studies Paper I',
        hue: 35,
        sourceLoaders: [SOURCES.upsc2025],
      },
    ],
  },
]

export const EXAM_META = {
  CSS: { title: 'CSS', blurb: 'Central Superior Services — FPSC' },
  PMS: { title: 'PMS', blurb: 'Provincial Management Service — PPSC' },
  UPSC: { title: 'UPSC', blurb: 'Civil Services Examination — UPSC Prelims' },
}

import {
  calculateScore,
  explainQuestion,
  isAnswerable,
  keyNoteQuestion,
} from './questionModel.js'

export { calculateScore, explainQuestion, isAnswerable, keyNoteQuestion }

function buildUnit(unit, track, sources) {
  const rtl = sources.some((source) => source.rtl)
  const lessons = sources
    .flatMap((source) =>
      source.lessons.map((lesson) => ({
        ...lesson,
        questions: lesson.questions.filter(isAnswerable),
        kind: source.kind ?? 'coached',
        unitId: unit.id,
        unitTitle: unit.title,
        trackId: track.id,
        trackTitle: `${track.exam} · ${track.title}`,
        hue: unit.hue,
        rtl,
      })),
    )
    .filter((lesson) => lesson.questions.length > 0)
    .map((lesson, indexInUnit) => ({ ...lesson, indexInUnit }))

  const { sourceLoaders: _loaders, ...rest } = unit
  return {
    ...rest,
    rtl,
    note: sources.find((source) => source.note)?.note ?? null,
    questionCount: lessons.reduce((n, lesson) => n + lesson.questions.length, 0),
    lessons,
  }
}

let cachedCurriculum = null

/**
 * Dynamically loads and parses bundled question files on demand.
 * Caches results in memory for instant subsequent lookups.
 */
export async function loadBundledCurriculum() {
  if (cachedCurriculum) return cachedCurriculum

  const tracks = await Promise.all(
    TRACK_CONFIGS.map(async (track) => {
      const units = await Promise.all(
        track.units.map(async (unit) => {
          const sources = await Promise.all(unit.sourceLoaders.map((loader) => loader()))
          return buildUnit(unit, track, sources)
        }),
      )

      return {
        ...track,
        units,
        lessonCount: units.reduce((n, unit) => n + unit.lessons.length, 0),
        questionCount: units.reduce((n, unit) => n + unit.questionCount, 0),
      }
    }),
  )

  const exams = [...new Set(tracks.map((track) => track.exam))].map((id) => ({
    id,
    title: EXAM_META[id]?.title ?? id,
    blurb: EXAM_META[id]?.blurb ?? '',
  }))

  const lessons = tracks.flatMap((track) => track.units.flatMap((unit) => unit.lessons))
  const lessonsById = new Map(lessons.map((lesson, index) => [lesson.id, { ...lesson, index }]))

  cachedCurriculum = {
    tracks,
    exams,
    lessons,
    totalQuestions: lessons.reduce((n, lesson) => n + lesson.questions.length, 0),
    getTrack: (trackId) => tracks.find((track) => track.id === trackId) ?? null,
    getLesson: (lessonId) => lessonsById.get(lessonId) ?? null,
    getNextLesson: (lessonId) => {
      const current = lessonsById.get(lessonId)
      if (!current) return null
      const next = lessons[current.index + 1]
      return next && next.unitId === current.unitId ? next : null
    },
    getPrerequisite: (lessonId) => {
      const current = lessonsById.get(lessonId)
      if (!current || current.indexInUnit === 0) return null
      return (
        lessons.find(
          (l) => l.unitId === current.unitId && l.indexInUnit === current.indexInUnit - 1,
        ) ?? null
      )
    },
  }

  return cachedCurriculum
}
