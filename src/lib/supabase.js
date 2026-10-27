import { createClient } from '@supabase/supabase-js'

const envUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : ''
const envKey = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : ''

const supabaseUrl = envUrl || 'https://placeholder.supabase.co'
const supabaseAnonKey = envKey || 'placeholder-anon-key'

/**
 * Checks if real Supabase credentials have been configured in environment variables.
 */
export function isSupabaseConfigured() {
  return Boolean(
    envUrl &&
      envKey &&
      !envUrl.includes('placeholder') &&
      !envUrl.includes('your-project') &&
      envUrl.startsWith('https://'),
  )
}

/**
 * Centralized Supabase client instance with session persistence.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/**
 * Fetches user profile with RBAC role from Supabase.
 * @param {string} userId
 * @returns {Promise<{ role: 'admin'|'editor'|'reviewer'|'contributor', assigned_categories: string[] }|null>}
 */
export async function fetchUserProfile(userId) {
  if (!isSupabaseConfigured() || !userId) return null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, assigned_categories')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.warn('Error fetching user profile from Supabase:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.warn('Network error fetching profile:', err)
    return null
  }
}

/**
 * Loads tracks, categories, and questions directly from Supabase,
 * assembling them into the hierarchical curriculum structure.
 */
export async function fetchFullCurriculumFromSupabase() {
  if (!isSupabaseConfigured()) return null

  try {
    // 1. Fetch tracks, categories, and questions in parallel
    let [tracksRes, catsRes, qRes] = await Promise.all([
      supabase.from('tracks').select('*').order('display_order', { ascending: true }),
      supabase.from('categories').select('*').order('display_order', { ascending: true }),
      supabase.from('questions').select('*').eq('status', 'approved').order('display_order', { ascending: true }),
    ])

    // Graceful fallback if remote database has not yet applied the draft-to-live status migration
    if (qRes.error && (qRes.error.message?.includes('status') || qRes.error.code === '42703')) {
      qRes = await supabase.from('questions').select('*').order('display_order', { ascending: true })
    }

    if (tracksRes.error || catsRes.error || qRes.error) {
      console.warn('Supabase query error loading curriculum:', {
        tracks: tracksRes.error?.message,
        categories: catsRes.error?.message,
        questions: qRes.error?.message,
      })
      return null
    }

    const tracksData = tracksRes.data ?? []
    const categoriesData = catsRes.data ?? []
    const questionsData = qRes.data ?? []

    if (tracksData.length === 0) return null

    // Group questions by category_id and lesson_id
    const questionsByCategory = new Map()
    for (const q of questionsData) {
      const catId = q.category_id
      if (!questionsByCategory.has(catId)) {
        questionsByCategory.set(catId, [])
      }
      questionsByCategory.get(catId).push({
        id: q.id,
        prompt: q.prompt,
        choices: Array.isArray(q.choices) ? q.choices : [],
        answer: q.answer,
        directive: q.directive || undefined,
        statements: Array.isArray(q.statements) && q.statements.length > 0 ? q.statements : undefined,
        closing: q.closing || undefined,
        explanation: q.explanation || undefined,
        source: q.source || undefined,
        status: q.status || 'approved',
        examTarget: q.exam_target || ['CSS', 'PMS'],
        lessonId: q.lesson_id || `${catId}-lesson-1`,
        lessonTitle: q.lesson_title || 'Core Practice',
        lessonSubtitle: q.lesson_subtitle || undefined,
        displayOrder: q.display_order,
      })
    }

    // Group categories by track_id
    const categoriesByTrack = new Map()
    for (const cat of categoriesData) {
      const trkId = cat.track_id
      if (!categoriesByTrack.has(trkId)) {
        categoriesByTrack.set(trkId, [])
      }

      const rawQuestions = questionsByCategory.get(cat.id) ?? []
      // Group into lessons
      const lessonsMap = new Map()
      for (const q of rawQuestions) {
        const lessonId = q.lessonId
        if (!lessonsMap.has(lessonId)) {
          lessonsMap.set(lessonId, {
            id: lessonId,
            title: q.lessonTitle,
            subtitle: q.lessonSubtitle,
            unitId: cat.id,
            unitTitle: cat.title,
            trackId: trkId,
            hue: cat.hue ?? 180,
            rtl: Boolean(cat.rtl),
            questions: [],
          })
        }
        lessonsMap.get(lessonId).questions.push(q)
      }

      // If category has no questions or lessons, create an empty lesson holder
      const lessons = lessonsMap.size > 0
        ? Array.from(lessonsMap.values()).map((lesson, idx) => ({
            ...lesson,
            indexInUnit: idx,
          }))
        : []

      categoriesByTrack.get(trkId).push({
        id: cat.id,
        title: cat.title,
        tagline: cat.tagline,
        marks: cat.marks,
        hue: cat.hue ?? 180,
        rtl: Boolean(cat.rtl),
        note: cat.note ?? null,
        questionCount: rawQuestions.length,
        lessons,
      })
    }

    // Assemble final tracks
    const tracks = tracksData.map((trk) => {
      const units = categoriesByTrack.get(trk.id) ?? []
      return {
        id: trk.id,
        exam: trk.exam,
        title: trk.title,
        tagline: trk.tagline,
        blueprint: trk.blueprint || { totalMcqs: 100, minutes: 120, passingMarks: 40, negativeMarking: 0 },
        note: trk.note || null,
        units,
        lessonCount: units.reduce((acc, u) => acc + u.lessons.length, 0),
        questionCount: units.reduce((acc, u) => acc + u.questionCount, 0),
      }
    })

    const exams = [...new Set(tracks.map((t) => t.exam))].map((id) => ({
      id,
      title: id,
      blurb: id === 'CSS' ? 'Central Superior Services — FPSC' : 'Provincial Management Service — PPSC',
    }))

    const lessons = tracks.flatMap((track) => track.units.flatMap((unit) => unit.lessons))
    const lessonsById = new Map(lessons.map((lesson, index) => [lesson.id, { ...lesson, index }]))

    return {
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
  } catch (err) {
    console.warn('Failed to fetch curriculum from Supabase:', err)
    return null
  }
}

/**
 * Fetches server-side paginated questions from Supabase with debounced search & filtering.
 * Uses .range(from, to) with max 50 items per page to prevent client-side sluggishness.
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=50]
 * @param {string} [options.search='']
 * @param {string} [options.categoryId='all']
 * @param {string} [options.exam='all']
 * @param {string} [options.quality='all']
 * @returns {Promise<{ questions: Array, totalCount: number }|null>}
 */
export async function fetchPaginatedQuestionsFromSupabase({
  page = 1,
  pageSize = 50,
  search = '',
  categoryId = 'all',
  exam = 'all',
  quality = 'all',
  status = 'all',
} = {}) {
  if (!isSupabaseConfigured()) return null

  try {
    const limit = Math.min(Math.max(1, pageSize), 50)
    const from = (Math.max(1, page) - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('questions')
      .select('*, categories(id, title, track_id, tracks(id, title, exam))', { count: 'exact' })

    const term = search ? search.trim() : ''
    if (term) {
      query = query.ilike('prompt', `%${term}%`)
    }

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (quality === 'needs-key') {
      query = query.is('answer', null)
    } else if (quality === 'missing-exp') {
      query = query.or('explanation.is.null,explanation.eq.""')
    }

    query = query
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.warn('Supabase join query error, retrying flat query:', error.message)
      let fallbackQuery = supabase
        .from('questions')
        .select('*', { count: 'exact' })

      if (term) {
        fallbackQuery = fallbackQuery.ilike('prompt', `%${term}%`)
      }
      if (categoryId && categoryId !== 'all') {
        fallbackQuery = fallbackQuery.eq('category_id', categoryId)
      }
      if (status && status !== 'all') {
        fallbackQuery = fallbackQuery.eq('status', status)
      }
      if (quality === 'needs-key') {
        fallbackQuery = fallbackQuery.is('answer', null)
      } else if (quality === 'missing-exp') {
        fallbackQuery = fallbackQuery.or('explanation.is.null,explanation.eq.""')
      }

      fallbackQuery = fallbackQuery
        .order('created_at', { ascending: false })
        .range(from, to)

      const fallbackRes = await fallbackQuery
      if (fallbackRes.error) {
        console.warn('Fallback flat query failed:', fallbackRes.error.message)
        return null
      }

      return {
        questions: (fallbackRes.data || []).map((q) => ({
          ...q,
          categoryId: q.category_id,
          isReviewed: q.is_reviewed ?? true,
          status: q.status || 'approved',
          exam_target: q.exam_target || ['CSS', 'PMS'],
          _trackTitle: 'Track',
          _exam: 'CSS',
          _unitTitle: 'Category',
          _isCustom: false,
          _subject: 'General Knowledge',
        })),
        totalCount: fallbackRes.count ?? 0,
      }
    }

    const questions = (data || []).map((q) => ({
      ...q,
      categoryId: q.category_id,
      isReviewed: q.is_reviewed ?? true,
      status: q.status || 'approved',
      exam_target: q.exam_target || ['CSS', 'PMS'],
      _trackTitle: q.categories?.tracks?.title || q.categories?.title || 'Track',
      _exam: q.categories?.tracks?.exam || 'CSS',
      _unitTitle: q.categories?.title || 'Category',
      _isCustom: false,
      _subject: q.categories?.title || 'General Knowledge',
    }))

    return {
      questions,
      totalCount: count ?? 0,
    }
  } catch (err) {
    console.warn('Network error in fetchPaginatedQuestionsFromSupabase:', err)
    return null
  }
}

/**
 * Fetches all staff user profiles for the Admin User Management panel.
 * @returns {Promise<Array<{ id: string, email: string, full_name: string, role: string, assigned_categories: string[], created_at: string }>>}
 */
export async function fetchProfilesList() {
  if (!isSupabaseConfigured()) return []
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, assigned_categories, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Error fetching profiles list from Supabase:', error.message)
      return []
    }
    return data ?? []
  } catch (err) {
    console.warn('Network error fetching profiles:', err)
    return []
  }
}

/**
 * Creates a new team member account with a specified RBAC role.
 * Uses an isolated auth client instance to avoid disrupting the active admin session.
 */
export async function createStaffAccount({
  email,
  password,
  fullName = '',
  role = 'contributor',
  assignedCategories = [],
}) {
  if (!isSupabaseConfigured()) {
    // Offline / Mock response
    return {
      data: {
        id: `mock-user-${Date.now()}`,
        email,
        full_name: fullName,
        role,
        assigned_categories: assignedCategories,
        created_at: new Date().toISOString(),
      },
      error: null,
    }
  }

  try {
    // Isolated client so admin session isn't replaced
    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          requested_role: role,
        },
      },
    })

    if (authError) {
      return { data: null, error: authError }
    }

    const newUserId = authData.user?.id
    if (newUserId) {
      // Upsert profile with designated staff role and assigned categories
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: newUserId,
          email,
          full_name: fullName,
          role,
          assigned_categories: assignedCategories,
          updated_at: new Date().toISOString(),
        })

      if (profileError) {
        console.warn('Could not set custom role on profile:', profileError.message)
      }
    }

    return { data: authData.user, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Updates a user's role and assigned categories in Supabase.
 */
export async function updateProfileRole(userId, newRole, assignedCategories = null) {
  if (!isSupabaseConfigured()) return { error: null }
  try {
    const payload = {
      role: newRole,
      updated_at: new Date().toISOString(),
    }
    if (assignedCategories !== null) {
      payload.assigned_categories = assignedCategories
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)

    return { error }
  } catch (err) {
    return { error: err }
  }
}

/**
 * Deletes or revokes a staff profile.
 */
export async function deleteStaffProfile(userId) {
  if (!isSupabaseConfigured()) return { error: null }
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
    return { error }
  } catch (err) {
    return { error: err }
  }
}

/**
 * Updates a question's draft-to-live status ('pending', 'approved', 'rejected').
 * @param {string} questionId
 * @param {'pending'|'approved'|'rejected'} status
 */
export async function updateQuestionStatus(questionId, status) {
  if (!isSupabaseConfigured()) return { error: null }
  try {
    const { error } = await supabase
      .from('questions')
      .update({
        status,
        is_reviewed: status === 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', questionId)

    return { error }
  } catch (err) {
    return { error: err }
  }
}

/**
 * Inserts or upserts a new subject / category into the categories table.
 * @param {Object} category
 * @param {string} category.title
 * @param {string} [category.id]
 * @param {'CSS'|'PMS'|'Both'} [category.examTrack]
 * @param {string} [category.tagline]
 * @param {number} [category.hue]
 * @returns {Promise<{ data: Object|null, error: Error|null }>}
 */
export async function createCategory({
  title,
  id = null,
  examTrack = 'Both',
  tagline = '',
  hue = 220,
}) {
  const slug = id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!isSupabaseConfigured()) {
    return {
      data: {
        id: slug,
        title: title.trim(),
        track_id: examTrack === 'PMS' ? 'pms-prelims' : 'css-mpt',
        tagline: tagline.trim() || `${title.trim()} (${examTrack})`,
        hue,
      },
      error: null,
    }
  }

  try {
    const trackId = examTrack === 'PMS' ? 'pms-prelims' : 'css-mpt'

    const { data, error } = await supabase
      .from('categories')
      .upsert({
        id: slug,
        track_id: trackId,
        title: title.trim(),
        tagline: tagline.trim() || `${title.trim()} (${examTrack})`,
        hue,
        display_order: Date.now(),
      })
      .select()
      .maybeSingle()

    if (error) {
      return {
        data: {
          id: slug,
          title: title.trim(),
          track_id: trackId,
          tagline: tagline.trim() || `${title.trim()} (${examTrack})`,
          hue,
        },
        error,
      }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}
