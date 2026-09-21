import { shuffle } from './shuffle.js'

/**
 * Standard civil services exam blueprint distributions
 */
export const BLUEPRINT_PRESETS = [
  {
    id: 'css-mpt-200',
    title: 'FPSC CSS MPT Official Blueprint (200 MCQs)',
    exam: 'CSS',
    totalMcqs: 200,
    durationMinutes: 200,
    negativeMarking: 0,
    passingPercent: 33,
    distribution: [
      { subject: 'English', count: 50, keywords: ['english', 'vocabulary', 'grammar', 'comprehension'] },
      { subject: 'General Abilities / Math', count: 60, keywords: ['ability', 'math', 'arithmetic', 'logical', 'reasoning', 'analytical'] },
      { subject: 'Everyday / General Science', count: 30, keywords: ['science', 'general science', 'everyday science', 'physics', 'biology', 'chemistry'] },
      { subject: 'Pakistan Affairs', count: 20, keywords: ['pakistan', 'pak affairs', 'pakistan affairs', 'pakistan studies', 'subcontinent'] },
      { subject: 'Current Affairs', count: 20, keywords: ['current', 'current affairs', 'international', 'general knowledge'] },
      { subject: 'Islamic Studies / Civics', count: 20, keywords: ['islam', 'islamic', 'islamic studies', 'civics', 'ethics'] },
    ],
  },
  {
    id: 'pms-prelims-100',
    title: 'PPSC PMS Prelims Blueprint (100 MCQs)',
    exam: 'PMS',
    totalMcqs: 100,
    durationMinutes: 120,
    negativeMarking: 0.25,
    passingPercent: 40,
    distribution: [
      { subject: 'Pakistan Studies', count: 20, keywords: ['pakistan', 'pakistan studies', 'pak affairs'] },
      { subject: 'Islamic Studies / Ethics', count: 20, keywords: ['islam', 'islamic', 'islamic studies', 'ethics'] },
      { subject: 'General Knowledge & Science', count: 20, keywords: ['knowledge', 'science', 'general knowledge', 'gk'] },
      { subject: 'English Language', count: 20, keywords: ['english', 'grammar', 'vocabulary'] },
      { subject: 'Urdu Literature & Language', count: 20, keywords: ['urdu'] },
    ],
  },
  {
    id: 'upsc-gs1-100',
    title: 'UPSC CSE Prelims GS-I Blueprint (100 MCQs)',
    exam: 'UPSC',
    totalMcqs: 100,
    durationMinutes: 120,
    negativeMarking: 0.33,
    passingPercent: 33,
    distribution: [
      { subject: 'Indian Polity & Governance', count: 25, keywords: ['polity', 'constitution', 'governance'] },
      { subject: 'History & Culture', count: 25, keywords: ['history', 'culture', 'modern india', 'ancient'] },
      { subject: 'Geography & Environment', count: 25, keywords: ['geography', 'environment', 'ecology'] },
      { subject: 'Economy & General Science', count: 25, keywords: ['economy', 'economic', 'science', 'technology'] },
    ],
  },
]

/**
 * Categorize a question based on its prompt, directive, track, and unit title.
 */
export function classifyQuestionSubject(question, trackTitle = '', unitTitle = '') {
  const context = `${question.prompt || ''} ${question.directive || ''} ${trackTitle} ${unitTitle}`.toLowerCase()

  if (context.includes('urdu') || /[\u0600-\u06FF]/.test(question.prompt || '')) return 'Urdu'
  if (context.includes('islam') || context.includes('quran') || context.includes('hadith') || context.includes('prophet')) return 'Islamic Studies'
  if (context.includes('pakistan') || context.includes('quaid') || context.includes('allama') || context.includes('lahore')) return 'Pakistan Affairs'
  if (context.includes('math') || context.includes('algebra') || context.includes('geometry') || context.includes('average') || context.includes('ratio') || context.includes('percent')) return 'General Abilities'
  if (context.includes('synonym') || context.includes('antonym') || context.includes('grammar') || context.includes('preposition') || context.includes('vocabulary') || context.includes('sentence')) return 'English'
  if (context.includes('science') || context.includes('vitamin') || context.includes('planet') || context.includes('energy') || context.includes('cell') || context.includes('element')) return 'General Science'
  if (context.includes('treaty') || context.includes('un ') || context.includes('summit') || context.includes('president') || context.includes('war ') || context.includes('minister')) return 'Current Affairs'

  return 'General Knowledge'
}

/**
 * Generate a randomized balanced mock exam paper following a blueprint.
 */
export function generateBalancedPaper(tracks, blueprint, customSubjectCounts = null) {
  // Extract all questions with their track context
  const pool = []
  for (const track of tracks) {
    for (const unit of track.units || []) {
      for (const lesson of unit.lessons || []) {
        for (const q of lesson.questions || []) {
          // Only include answerable questions with at least 2 choices
          if (q && q.prompt && Array.isArray(q.choices) && q.choices.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0) {
            const subject = classifyQuestionSubject(q, track.title, unit.title)
            pool.push({
              ...q,
              _sourceTrack: track.title,
              _sourceUnit: unit.title,
              _subject: subject,
            })
          }
        }
      }
    }
  }

  const generatedQuestions = []
  const usedIds = new Set()
  const allocations = customSubjectCounts || blueprint.distribution

  // Allocate questions per blueprint target
  for (const alloc of allocations) {
    const targetCount = alloc.count
    const subjectPool = pool.filter((item) => {
      if (usedIds.has(item.id)) return false
      if (item._subject === alloc.subject) return true
      if (alloc.keywords) {
        const text = `${item.prompt} ${item._sourceTrack} ${item._sourceUnit}`.toLowerCase()
        return alloc.keywords.some((k) => text.includes(k))
      }
      return false
    })

    const shuffled = shuffle(subjectPool)
    const selected = shuffled.slice(0, targetCount)
    for (const item of selected) {
      usedIds.add(item.id)
      generatedQuestions.push(item)
    }
  }

  // If pool didn't have enough specific subjects to fill the quota, fill remainder from general pool
  const targetTotal = blueprint.totalMcqs || 100
  if (generatedQuestions.length < targetTotal) {
    const remainingNeeded = targetTotal - generatedQuestions.length
    const unusedPool = pool.filter((q) => !usedIds.has(q.id))
    const extra = shuffle(unusedPool).slice(0, remainingNeeded)
    for (const item of extra) {
      usedIds.add(item.id)
      generatedQuestions.push(item)
    }
  }

  return {
    id: `mock-paper-${Date.now()}`,
    title: `${blueprint.title || 'Civil Service Mock Paper'} — Generated ${new Date().toLocaleDateString()}`,
    exam: blueprint.exam || 'Custom',
    blueprintId: blueprint.id,
    durationMinutes: blueprint.durationMinutes || 120,
    negativeMarking: blueprint.negativeMarking ?? 0,
    passingPercent: blueprint.passingPercent || 33,
    totalQuestions: generatedQuestions.length,
    questions: generatedQuestions,
    generatedAt: new Date().toISOString(),
  }
}
