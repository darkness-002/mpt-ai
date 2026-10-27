/**
 * MPT-AI: Supabase Data Migration Script
 * Migrates local curriculum definitions and JSON question banks to Supabase.
 *
 * Usage:
 *   node scripts/migrate-to-supabase.mjs
 *   node scripts/migrate-to-supabase.mjs --service-key <KEY>
 *
 * Requirements:
 *   - .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 *   - Optional: SUPABASE_SERVICE_ROLE_KEY in .env (bypasses RLS for full write access)
 *   - Optional: ADMIN_EMAIL & ADMIN_PASSWORD in .env (authenticates via RLS admin policy)
 */

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const QUESTIONS_DIR = path.join(ROOT_DIR, 'src', 'data', 'questions')

// CLI argument parser
const args = process.argv.slice(2)
function getArg(flag) {
  const idx = args.indexOf(flag)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null
}

const cliServiceKey = getArg('--service-key') || getArg('--key')
const cliEmail = getArg('--email')
const cliPassword = getArg('--password')

// Environment resolution
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = cliServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = cliEmail || process.env.ADMIN_EMAIL
const adminPassword = cliPassword || process.env.ADMIN_PASSWORD

console.log('='.repeat(70))
console.log('  MPT-AI - Supabase Data Migration Pipeline')
console.log('='.repeat(70))

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ ERROR: Supabase credentials not found in environment.')
  console.error('Please verify that your .env file defines:')
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co')
  console.error('  VITE_SUPABASE_ANON_KEY=your-anon-key\n')
  process.exit(1)
}

const activeKey = supabaseServiceKey || supabaseAnonKey
const isServiceRole = Boolean(supabaseServiceKey)

console.log(`\n📡 Supabase Endpoint : ${supabaseUrl}`)
console.log(`🔑 Key Type         : ${isServiceRole ? 'Service Role Key (Full RLS Bypass)' : 'Publishable / Anon Key'}`)

const supabase = createClient(supabaseUrl, activeKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Optional authentication if admin credentials are provided
if (!isServiceRole && adminEmail && adminPassword) {
  console.log(`🔐 Authenticating as Admin (${adminEmail})...`)
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  })
  if (authError) {
    console.warn(`⚠️ Admin login failed: ${authError.message}. Continuing with anon role...`)
  } else {
    console.log('✅ Authenticated successfully with Admin privileges.')
  }
}

// ---------------------------------------------------------------------------
// TRACKS DEFINITION
// ---------------------------------------------------------------------------
const TRACKS = [
  {
    id: 'css-mpt',
    exam: 'CSS',
    title: 'MPT — Preliminary Test',
    tagline: 'The FPSC screening paper you must clear to sit the written exam',
    blueprint: { totalMcqs: 200, minutes: 200, passingMarks: 66, negativeMarking: 0 },
    note: 'Real questions from MPT 2023 (Special) and MPT 2026, after coached sets that explain the answer.',
    display_order: 1,
  },
  {
    id: 'css-compulsory',
    exam: 'CSS',
    title: 'Compulsory subjects',
    tagline: 'Part-I MCQs from the CSS written papers',
    blueprint: { totalMcqs: 20, minutes: 30, passingMarks: 10, negativeMarking: 0 },
    note: 'No official key was published for these papers, so the answers were worked out by MPT-AI and are flagged as such.',
    display_order: 2,
  },
  {
    id: 'pms-prelims',
    exam: 'PMS',
    title: 'Prelims — General Ability',
    tagline: 'The PPSC screening paper for the Provincial Management Service',
    blueprint: { totalMcqs: 100, minutes: 120, passingMarks: 40, negativeMarking: 0.25 },
    note: 'PPSC syllabus: general knowledge, Pakistan studies, Islamic studies, current affairs, geography, maths, English, Urdu, everyday science and computer skills — 0.25 negative marking per wrong answer.',
    display_order: 3,
  },
  {
    id: 'pms-compulsory',
    exam: 'PMS',
    title: 'Compulsory subjects',
    tagline: 'Part-I MCQs from the PMS written papers',
    blueprint: { totalMcqs: 20, minutes: 30, passingMarks: 10, negativeMarking: 0.25 },
    note: null,
    display_order: 4,
  },
]

// ---------------------------------------------------------------------------
// CATEGORIES DEFINITION WITH JSON FILE MAPPING
// ---------------------------------------------------------------------------
const CATEGORIES = [
  // CSS MPT Tracks
  {
    id: 'general-abilities',
    track_id: 'css-mpt',
    title: 'General Abilities',
    tagline: 'Maths, logic and analytical reasoning',
    marks: 60,
    hue: 172,
    rtl: false,
    display_order: 1,
    files: [
      'coached/general-abilities.json',
      'past-papers/general-abilities.json',
    ],
  },
  {
    id: 'english',
    track_id: 'css-mpt',
    title: 'English',
    tagline: 'Grammar, vocabulary, sentence correction',
    marks: 50,
    hue: 244,
    rtl: false,
    display_order: 2,
    files: [
      'coached/english.json',
      'past-papers/english.json',
    ],
  },
  {
    id: 'general-knowledge',
    track_id: 'css-mpt',
    title: 'General Knowledge',
    tagline: 'Everyday science, current affairs, Pakistan affairs',
    marks: 50,
    hue: 199,
    rtl: false,
    display_order: 3,
    files: [
      'coached/general-knowledge.json',
      'past-papers/general-knowledge.json',
    ],
  },
  {
    id: 'islamic-studies',
    track_id: 'css-mpt',
    title: 'Islamic Studies',
    tagline: 'Quran, Seerah, Hadith and history',
    marks: 20,
    hue: 40,
    rtl: false,
    display_order: 4,
    files: [
      'coached/islamic-studies.json',
      'past-papers/islamic-studies.json',
    ],
  },
  {
    id: 'urdu',
    track_id: 'css-mpt',
    title: 'اردو',
    tagline: 'قواعد، محاورات، ضرب الامثال',
    marks: 20,
    hue: 291,
    rtl: true,
    display_order: 5,
    files: [
      'coached/urdu.json',
    ],
  },
  // CSS Compulsory
  {
    id: 'css-compulsory-gsa',
    track_id: 'css-compulsory',
    title: 'General Science & Ability',
    tagline: 'Part-I MCQs, 2013–2025',
    marks: 20,
    hue: 152,
    rtl: false,
    display_order: 6,
    files: [
      'css-compulsory/general-science-ability.json',
    ],
  },
  // PMS Prelims
  {
    id: 'pms-2025',
    track_id: 'pms-prelims',
    title: 'PPSC PMS 2025',
    tagline: 'General ability paper',
    marks: 100,
    hue: 268,
    rtl: false,
    display_order: 7,
    files: [
      'pms-prelims/2025.json',
    ],
  },
  {
    id: 'pms-2024',
    track_id: 'pms-prelims',
    title: 'PPSC PMS 2024',
    tagline: 'General ability paper',
    marks: 100,
    hue: 220,
    rtl: false,
    display_order: 8,
    files: [
      'pms-prelims/2024.json',
    ],
  },
  {
    id: 'pms-2023',
    track_id: 'pms-prelims',
    title: 'PPSC PMS 2023',
    tagline: 'General ability paper',
    marks: 100,
    hue: 190,
    rtl: false,
    display_order: 9,
    files: [
      'pms-prelims/2023.json',
    ],
  },
  // PMS Compulsory
  {
    id: 'pms-compulsory-pakistan-studies',
    track_id: 'pms-compulsory',
    title: 'Pakistan Studies',
    tagline: 'PMS compulsory paper',
    marks: 20,
    hue: 142,
    rtl: false,
    display_order: 10,
    files: [
      'pms-compulsory/pakistan-studies.json',
    ],
  },
  {
    id: 'pms-compulsory-islamic-studies',
    track_id: 'pms-compulsory',
    title: 'Islamic Studies',
    tagline: 'PMS compulsory paper',
    marks: 20,
    hue: 40,
    rtl: false,
    display_order: 11,
    files: [
      'pms-compulsory/islamic-studies.json',
    ],
  },
]

// ---------------------------------------------------------------------------
// HELPER: RLS Error Handler & Diagnostic Guide
// ---------------------------------------------------------------------------
function handleRlsError(table, error) {
  console.error(`\n❌ Error migrating table "${table}":`, error.message)
  if (error.code === '42501' || error.message?.includes('row-level security')) {
    console.error('\n' + '='.repeat(70))
    console.error('  ⚠️  ROW LEVEL SECURITY (RLS) POLICY NOTICE')
    console.error('='.repeat(70))
    console.error('The Supabase database has Row-Level Security active, which prohibits')
    console.error('unauthenticated writes from the public anon key.')
    console.error('\nTo complete the migration, choose one of these simple solutions:')
    console.error('\n  Option 1 (Recommended): Add your Service Role Key to .env')
    console.error('    1. Open Supabase Dashboard -> Project Settings -> API')
    console.error('    2. Copy "service_role secret" (under Project API keys)')
    console.error('    3. Add to your .env file:')
    console.error('       SUPABASE_SERVICE_ROLE_KEY=ey...')
    console.error('    4. Re-run: node scripts/migrate-to-supabase.mjs')
    console.error('\n  Option 2: Pass Service Role Key directly on the command line')
    console.error('    node scripts/migrate-to-supabase.mjs --service-key <YOUR_SERVICE_ROLE_KEY>')
    console.error('\n  Option 3: Provide Admin login credentials in .env')
    console.error('    ADMIN_EMAIL=admin@yourproject.com')
    console.error('    ADMIN_PASSWORD=your-secure-password')
    console.error('='.repeat(70) + '\n')
  }
}

// ---------------------------------------------------------------------------
// MIGRATION RUNNER
// ---------------------------------------------------------------------------
async function runMigration() {
  const startTime = Date.now()

  // 1. Migrate Tracks
  console.log('\n[1/3] 🗺️  Upserting Tracks into Supabase...')
  const tracksPayload = TRACKS.map((t) => ({
    id: t.id,
    exam: t.exam,
    title: t.title,
    tagline: t.tagline,
    blueprint: t.blueprint,
    note: t.note,
    display_order: t.display_order,
    updated_at: new Date().toISOString(),
  }))

  const { error: tracksError } = await supabase
    .from('tracks')
    .upsert(tracksPayload, { onConflict: 'id' })

  if (tracksError) {
    handleRlsError('tracks', tracksError)
    process.exit(1)
  }
  console.log(`  ✓ Successfully upserted ${tracksPayload.length} tracks.`)

  // 2. Migrate Categories
  console.log('\n[2/3] 📂 Upserting Categories into Supabase...')
  const categoriesPayload = CATEGORIES.map((c) => ({
    id: c.id,
    track_id: c.track_id,
    title: c.title,
    tagline: c.tagline,
    marks: c.marks,
    hue: c.hue,
    rtl: c.rtl,
    display_order: c.display_order,
    updated_at: new Date().toISOString(),
  }))

  const { error: categoriesError } = await supabase
    .from('categories')
    .upsert(categoriesPayload, { onConflict: 'id' })

  if (categoriesError) {
    handleRlsError('categories', categoriesError)
    process.exit(1)
  }
  console.log(`  ✓ Successfully upserted ${categoriesPayload.length} categories.`)

  // 3. Parse and Migrate Questions
  console.log('\n[3/3] 📚 Reading local JSON question banks and uploading questions...')

  let totalQuestionsCount = 0
  let totalLessonsCount = 0
  const allQuestionRows = []

  let globalDisplayOrder = 1

  for (const category of CATEGORIES) {
    for (const relPath of category.files) {
      const fullPath = path.join(QUESTIONS_DIR, relPath)
      if (!fs.existsSync(fullPath)) {
        console.warn(`  ⚠️ File not found: ${relPath} - skipping`)
        continue
      }

      const rawJson = fs.readFileSync(fullPath, 'utf8')
      const fileData = JSON.parse(rawJson)
      const lessons = fileData.lessons || []

      for (const lesson of lessons) {
        totalLessonsCount++
        const questions = lesson.questions || []

        for (const q of questions) {
          totalQuestionsCount++
          allQuestionRows.push({
            id: q.id,
            category_id: category.id,
            prompt: q.prompt,
            choices: Array.isArray(q.choices) ? q.choices : [],
            answer: typeof q.answer === 'number' ? q.answer : 0,
            directive: q.directive || null,
            statements: Array.isArray(q.statements) && q.statements.length > 0 ? q.statements : null,
            closing: q.closing || null,
            explanation: q.explanation || null,
            source: q.source || null,
            lesson_id: lesson.id || `${category.id}-lesson-1`,
            lesson_title: lesson.title || 'Core Practice',
            lesson_subtitle: lesson.subtitle || null,
            display_order: globalDisplayOrder++,
            rtl: Boolean(fileData.rtl || category.rtl || category.id === 'urdu'),
            is_reviewed: true,
            updated_at: new Date().toISOString(),
          })
        }
      }
    }
  }

  console.log(`  📊 Parsed ${allQuestionRows.length} questions across ${totalLessonsCount} lessons from 15 JSON files.`)

  // Upload in chunks of 50 to avoid request size limits
  const BATCH_SIZE = 50
  const totalBatches = Math.ceil(allQuestionRows.length / BATCH_SIZE)
  let uploadedCount = 0

  console.log(`  🚀 Uploading questions in ${totalBatches} batches (batch size: ${BATCH_SIZE})...\n`)

  for (let i = 0; i < totalBatches; i++) {
    const chunk = allQuestionRows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    const { error: batchError } = await supabase
      .from('questions')
      .upsert(chunk, { onConflict: 'id' })

    if (batchError) {
      handleRlsError('questions', batchError)
      process.exit(1)
    }

    uploadedCount += chunk.length
    const progressPercent = Math.round((uploadedCount / allQuestionRows.length) * 100)
    process.stdout.write(`  [Batch ${i + 1}/${totalBatches}] Uploaded ${uploadedCount}/${allQuestionRows.length} questions (${progressPercent}%)\r`)
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)

  console.log(`\n\n${'='.repeat(70)}`)
  console.log('🎉 SUPABASE MIGRATION COMPLETED SUCCESSFULLY!')
  console.log('='.repeat(70))
  console.log(`  ⏱️  Duration      : ${durationSec}s`)
  console.log(`  🗺️  Tracks        : ${tracksPayload.length} upserted`)
  console.log(`  📂 Categories    : ${categoriesPayload.length} upserted`)
  console.log(`  📚 Total Lessons : ${totalLessonsCount}`)
  console.log(`  📝 Total MCQs    : ${allQuestionRows.length} live in Supabase`)
  console.log('='.repeat(70) + '\n')
}

runMigration().catch((err) => {
  console.error('\n❌ Uncaught Migration Error:', err)
  process.exit(1)
})
