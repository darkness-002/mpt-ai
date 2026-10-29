import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  BarChartIcon,
  CheckCircleIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  LockIcon,
  MoonIcon,
  PlusIcon,
  ShieldCheckIcon,
  SunIcon,
  TrashIcon,
  UserPlusIcon,
  UsersIcon,
  XCircleIcon,
} from '../components/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useContent } from '../content/contentContext.js'
import { invalidateCurriculumCache } from '../data/curriculum.js'
import {
  createCategory,
  createStaffAccount,
  deleteStaffProfile,
  fetchProfilesList,
  isSupabaseConfigured,
  supabase,
  updateProfileRole,
  updateQuestionStatus,
} from '../lib/supabase.js'
import { contentStore } from '../storage/contentStore.js'
import { settingsStore, THEMES } from '../storage/settingsStore.js'
import './AdminScreen.css'

// Default Core Academic Subjects for FPSC CSS & PPSC PMS
export const CORE_SUBJECTS = [
  { id: 'general-abilities', title: 'General Abilities', desc: 'Quantitative, Analytical & Logical Reasoning' },
  { id: 'english', title: 'English', desc: 'Grammar, Vocabulary, Synonyms & Comprehension' },
  { id: 'pakistan-affairs', title: 'Pakistan Affairs', desc: 'Constitutional History, Reforms & Governance' },
  { id: 'current-affairs', title: 'Current Affairs', desc: 'National & Global Geopolitics' },
  { id: 'everyday-science', title: 'Everyday Science', desc: 'Physical, Biological & Environmental Sciences' },
  { id: 'islamic-studies', title: 'Islamic Studies / Ethics', desc: 'Islamic Principles & Ethics' },
  { id: 'urdu', title: 'Urdu', desc: 'Grammar, Idioms & Literature', rtl: true },
  { id: 'general-knowledge', title: 'General Knowledge', desc: 'World Geography, Treaties & Organizations' },
]

const DEFAULT_DEV_USERS = [
  {
    id: 'user-admin-1',
    email: 'admin@mpt-ai.internal',
    full_name: 'Dr. Tariq Mahmood (Super Admin)',
    role: 'admin',
    assigned_categories: [],
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'user-editor-1',
    email: 'editor@mpt-ai.internal',
    full_name: 'Ayesha Raza (Content Editor)',
    role: 'editor',
    assigned_categories: [],
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: 'user-rev-1',
    email: 'reviewer@mpt-ai.internal',
    full_name: 'Bilal Ahmed (Quality Reviewer)',
    role: 'reviewer',
    assigned_categories: [],
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'user-contrib-1',
    email: 'contributor@mpt-ai.internal',
    full_name: 'Zainab Qureshi (Contributor)',
    role: 'contributor',
    assigned_categories: ['general-abilities', 'english'],
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
]

const INITIAL_SAMPLE_QUESTIONS = [
  {
    id: 'sample-pending-1',
    prompt: 'Under the 1973 Constitution of Pakistan, which Article guarantees the Fundamental Right to Freedom of Speech and Expression?',
    choices: ['Article 18', 'Article 19', 'Article 20', 'Article 25'],
    answer: 1,
    explanation: 'Article 19 provides freedom of speech, expression, and freedom of the press subject to reasonable restrictions.',
    category_id: 'pakistan-affairs',
    status: 'pending',
    exam_target: ['CSS', 'PMS'],
    created_at: new Date().toISOString(),
    created_by_name: 'Zainab Qureshi',
  },
  {
    id: 'sample-pending-2',
    prompt: 'If a train traveling at 72 km/h crosses a 180-meter long platform in 15 seconds, what is the length of the train?',
    choices: ['100 meters', '120 meters', '140 meters', '150 meters'],
    answer: 1,
    explanation: 'Speed = 72 * (5/18) = 20 m/s. Total distance in 15s = 20 * 15 = 300m. Train length = 300 - 180 = 120m.',
    category_id: 'general-abilities',
    status: 'pending',
    exam_target: ['CSS', 'PMS'],
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    created_by_name: 'Ayesha Raza',
  },
  {
    id: 'sample-pending-3',
    prompt: 'Choose the correct synonym for the word "EPHEMERAL":',
    choices: ['Permanent', 'Transitory', 'Luminous', 'Enigmatic'],
    answer: 1,
    explanation: 'Ephemeral denotes lasting for a very short time; transitory, fleeting.',
    category_id: 'english',
    status: 'pending',
    exam_target: ['CSS'],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    created_by_name: 'Zainab Qureshi',
  },
  {
    id: 'sample-approved-1',
    prompt: 'The Indus Waters Treaty was signed between Pakistan and India in 1960 under the mediation of which organization?',
    choices: ['United Nations', 'World Bank', 'International Court of Justice', 'Commonwealth'],
    answer: 1,
    explanation: 'The Indus Waters Treaty was signed on September 19, 1960 with the World Bank as mediator and signatory.',
    category_id: 'pakistan-affairs',
    status: 'approved',
    exam_target: ['CSS', 'PMS'],
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    created_by_name: 'Dr. Tariq Mahmood',
  },
]

function formatGroupDate(dateStr) {
  if (!dateStr) return 'Earlier'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Earlier'

  const today = new Date()
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  if (isToday) return 'Today'

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  if (isYesterday) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

export default function AdminScreen() {
  const { refresh } = useContent()
  const { role, setDevRole, profile, user, isStaff, signIn, signOut } = useAuth()

  // Security Gate State for isolated staff access
  const [gateEmail, setGateEmail] = useState('')
  const [gatePassword, setGatePassword] = useState('')
  const [gateError, setGateError] = useState(null)
  const [gateLoading, setGateLoading] = useState(false)

  const handleStaffLogin = async (e) => {
    e.preventDefault()
    setGateError(null)
    const cleanEmail = gateEmail.trim()
    if (!cleanEmail || !gatePassword) {
      setGateError('Email and password are required.')
      return
    }
    setGateLoading(true)
    try {
      const res = await signIn(cleanEmail, gatePassword)
      if (res.error) {
        setGateError(res.error.message || 'Invalid staff credentials.')
        setGateLoading(false)
        return
      }
      setGateLoading(false)
    } catch (err) {
      setGateError(err.message || 'Failed to authenticate.')
      setGateLoading(false)
    }
  }

  // Navigation: exactly 4 tabs
  // 'dashboard' | 'add-question' | 'review-queue' | 'users'
  const [activeTab, setActiveTab] = useState('dashboard')

  // Theme switcher: cycles all 4 themes (Light, Dark, Zen, Midnight)
  const [currentTheme, setCurrentTheme] = useState(() => settingsStore.load().theme)

  const handleCycleTheme = () => {
    const current = settingsStore.load()
    let next = THEMES.DARK
    if (current.theme === THEMES.LIGHT) next = THEMES.DARK
    else if (current.theme === THEMES.DARK) next = THEMES.ZEN
    else if (current.theme === THEMES.ZEN) next = THEMES.MIDNIGHT
    else if (current.theme === THEMES.MIDNIGHT) next = THEMES.LIGHT
    else next = THEMES.LIGHT

    const updated = { ...current, theme: next }
    settingsStore.save(updated)
    setCurrentTheme(next)
  }

  // Active Questions State (combines Supabase & local ContentStore)
  const [questions, setQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)

  // Dynamic Subjects / Categories List
  const [subjects, setSubjects] = useState(CORE_SUBJECTS)
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectTrack, setNewSubjectTrack] = useState('Both') // 'CSS' | 'PMS' | 'Both'
  const [newSubjectTagline, setNewSubjectTagline] = useState('')
  const [creatingSubject, setCreatingSubject] = useState(false)

  // Users Management State
  const [usersList, setUsersList] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Review Queue Filter: 'pending' | 'rejected' | 'all'
  const [reviewFilter, setReviewFilter] = useState('pending')

  // Notice banners
  const [notice, setNotice] = useState(null)

  // Editing Modal State & Slide-out Drawers
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false)
  const [reviewViewMode, setReviewViewMode] = useState('cards') // 'cards' | 'table'

  // ==========================================
  // Form State: The 3-Step Question Flow
  // Step 1: Subject
  // Step 2: Exam Target (CSS, PMS, Both)
  // Step 3: Question Details
  // ==========================================
  const [formSubject, setFormSubject] = useState(CORE_SUBJECTS[0].id)
  const [formExamTarget, setFormExamTarget] = useState('Both') // 'CSS' | 'PMS' | 'Both'
  const [formPrompt, setFormPrompt] = useState('')
  const [formChoices, setFormChoices] = useState(['', '', '', ''])
  const [formAnswer, setFormAnswer] = useState(0)
  const [formExplanation, setFormExplanation] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Load dynamic subjects from Supabase categories table & local content store
  const loadDynamicSubjects = useCallback(async () => {
    try {
      let dbCats = []
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('categories')
          .select('id, title, tagline, track_id')
          .order('title', { ascending: true })
        if (!error && data) dbCats = data
      }

      const local = await contentStore.load()
      const localCats = local.categories || []

      const map = new Map()
      // Seed core subjects first
      for (const cs of CORE_SUBJECTS) {
        map.set(cs.id, cs)
      }
      // Merge db and local categories
      for (const cat of [...localCats, ...dbCats]) {
        if (!map.has(cat.id)) {
          map.set(cat.id, {
            id: cat.id,
            title: cat.title,
            desc: cat.tagline || `${cat.title}`,
            exam: cat.exam || (cat.track_id === 'pms-prelims' ? 'PMS' : 'CSS'),
          })
        }
      }
      setSubjects(Array.from(map.values()))
    } catch (err) {
      console.warn('Could not load dynamic subjects:', err)
    }
  }, [])

  // Load questions from Supabase or ContentStore
  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true)
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && Array.isArray(data) && data.length > 0) {
          setQuestions(
            data.map((q) => ({
              id: q.id,
              prompt: q.prompt,
              choices: Array.isArray(q.choices) ? q.choices : [],
              answer: q.answer,
              explanation: q.explanation || '',
              category_id: q.category_id,
              status: q.status || (q.is_reviewed ? 'approved' : 'pending'),
              exam_target: Array.isArray(q.exam_target) ? q.exam_target : ['CSS', 'PMS'],
              created_at: q.created_at || new Date().toISOString(),
              created_by_name: q.created_by ? 'Staff Contributor' : 'Admin',
            })),
          )
          setLoadingQuestions(false)
          return
        }
      }

      // Local / Offline fallback
      const local = await contentStore.load()
      if (local.questions && local.questions.length > 0) {
        setQuestions(
          local.questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            choices: q.choices || [],
            answer: q.answer,
            explanation: q.explanation || '',
            category_id: q.categoryId || 'general-abilities',
            status: q.status || 'pending',
            exam_target: q.exam_target || ['CSS', 'PMS'],
            created_at: q.createdAt ? new Date(q.createdAt).toISOString() : new Date().toISOString(),
            created_by_name: 'Local Author',
          })),
        )
      } else {
        setQuestions(INITIAL_SAMPLE_QUESTIONS)
      }
    } catch (err) {
      console.warn('Error loading admin questions:', err)
      setQuestions(INITIAL_SAMPLE_QUESTIONS)
    } finally {
      setLoadingQuestions(false)
    }
  }, [])

  // Load staff users list
  const loadUsers = useCallback(async () => {
    if (role !== 'admin') return
    setLoadingUsers(true)
    try {
      if (isSupabaseConfigured()) {
        const profiles = await fetchProfilesList()
        if (profiles.length > 0) {
          setUsersList(profiles)
          setLoadingUsers(false)
          return
        }
      }
      setUsersList(DEFAULT_DEV_USERS)
    } catch {
      setUsersList(DEFAULT_DEV_USERS)
    } finally {
      setLoadingUsers(false)
    }
  }, [role])

  useEffect(() => {
    loadQuestions()
    loadDynamicSubjects()
  }, [loadQuestions, loadDynamicSubjects])

  useEffect(() => {
    if (activeTab === 'users' && role === 'admin') {
      loadUsers()
    }
  }, [activeTab, role, loadUsers])

  // Computed counts for Dashboard & Badges
  const stats = useMemo(() => {
    const live = questions.filter((q) => q.status === 'approved').length
    const pending = questions.filter((q) => q.status === 'pending').length
    const rejected = questions.filter((q) => q.status === 'rejected').length
    return {
      live,
      pending,
      rejected,
      total: questions.length,
      users: usersList.length || DEFAULT_DEV_USERS.length,
    }
  }, [questions, usersList])

  // Create New Dynamic Subject (Admin)
  const handleCreateSubjectSubmit = async (e) => {
    e.preventDefault()
    if (!newSubjectName.trim()) {
      alert('Please enter a subject name.')
      return
    }

    setCreatingSubject(true)
    const title = newSubjectName.trim()
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    try {
      // 1. Insert into Supabase public.categories table
      if (isSupabaseConfigured()) {
        const { error } = await createCategory({
          title,
          id: slug,
          examTrack: newSubjectTrack,
          tagline: newSubjectTagline.trim(),
        })
        if (error) console.warn('Supabase createCategory warning:', error.message)
      }

      // 2. Save into local contentStore
      await contentStore.saveCategory({
        id: slug,
        title,
        exam: newSubjectTrack === 'Both' ? 'CSS' : newSubjectTrack,
        tagline: newSubjectTagline.trim() || `${title} (${newSubjectTrack})`,
      })

      invalidateCurriculumCache()
      await refresh()

      const newSubjectItem = {
        id: slug,
        title,
        desc: newSubjectTagline.trim() || `${title} (${newSubjectTrack})`,
        exam: newSubjectTrack,
      }

      setSubjects((prev) => {
        if (prev.some((s) => s.id === slug)) return prev
        return [...prev, newSubjectItem]
      })

      // Immediately select newly created subject
      setFormSubject(slug)
      setShowSubjectModal(false)
      setNewSubjectName('')
      setNewSubjectTagline('')
      setNewSubjectTrack('Both')

      setNotice({
        type: 'success',
        text: `Subject "${title}" created successfully and selected!`,
      })
    } catch (err) {
      console.error('Error creating subject:', err)
      alert('Failed to create subject: ' + err.message)
    } finally {
      setCreatingSubject(false)
    }
  }

  // Question Submission Handler
  const handleAddQuestionSubmit = async (e) => {
    e.preventDefault()
    if (!formPrompt.trim()) {
      alert('Please enter a question prompt.')
      return
    }
    const cleanChoices = formChoices.map((c) => c.trim())
    if (cleanChoices.some((c) => !c)) {
      alert('All four answer choices (A, B, C, D) are required.')
      return
    }

    setFormSubmitting(true)
    const qId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const examTargetArray =
      formExamTarget === 'Both' ? ['CSS', 'PMS'] : [formExamTarget]

    const newQuestion = {
      id: qId,
      prompt: formPrompt.trim(),
      choices: cleanChoices,
      answer: Number(formAnswer),
      explanation: formExplanation.trim(),
      category_id: formSubject,
      status: 'pending', // Draft-to-Live default
      exam_target: examTargetArray,
      created_at: new Date().toISOString(),
      created_by_name: profile?.full_name || user?.email?.split('@')[0] || 'You',
    }

    try {
      // 1. Supabase sync if configured
      if (isSupabaseConfigured()) {
        const { error: sbErr } = await supabase.from('questions').insert({
          id: qId,
          category_id: formSubject,
          prompt: newQuestion.prompt,
          choices: newQuestion.choices,
          answer: newQuestion.answer,
          explanation: newQuestion.explanation,
          status: 'pending',
          exam_target: examTargetArray,
          is_reviewed: false,
          created_at: newQuestion.created_at,
        })
        if (sbErr) console.warn('Supabase insert warning:', sbErr.message)
      }

      // 2. Local ContentStore sync
      await contentStore.saveQuestion({
        id: qId,
        categoryId: formSubject,
        prompt: newQuestion.prompt,
        choices: newQuestion.choices,
        answer: newQuestion.answer,
        explanation: newQuestion.explanation,
        status: 'pending',
        exam_target: examTargetArray,
      })

      setQuestions((prev) => [newQuestion, ...prev])
      setNotice({
        type: 'success',
        text: 'Question submitted as Pending Draft. It has been routed to the Review Queue.',
      })

      // Reset prompt and choices for next input, maintaining subject context
      setFormPrompt('')
      setFormChoices(['', '', '', ''])
      setFormAnswer(0)
      setFormExplanation('')
      setIsAddDrawerOpen(false)
    } catch (err) {
      console.error('Error submitting question:', err)
      alert('Could not save question: ' + err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  // Approval Pipeline Actions
  const handleApproveQuestion = async (q) => {
    try {
      if (isSupabaseConfigured()) {
        await updateQuestionStatus(q.id, 'approved')
      }
      await contentStore.updateQuestionStatus(q.id, 'approved')
      invalidateCurriculumCache()
      await refresh()

      setQuestions((prev) =>
        prev.map((item) => (item.id === q.id ? { ...item, status: 'approved' } : item)),
      )
      setNotice({
        type: 'success',
        text: `Question approved! It is now live in the student app.`,
      })
    } catch (err) {
      alert('Could not approve question: ' + err.message)
    }
  }

  const handleRejectQuestion = async (q) => {
    try {
      if (isSupabaseConfigured()) {
        await updateQuestionStatus(q.id, 'rejected')
      }
      await contentStore.updateQuestionStatus(q.id, 'rejected')

      setQuestions((prev) =>
        prev.map((item) => (item.id === q.id ? { ...item, status: 'rejected' } : item)),
      )
      setNotice({
        type: 'info',
        text: `Question marked as rejected.`,
      })
    } catch (err) {
      alert('Could not reject question: ' + err.message)
    }
  }

  const handleDeleteQuestion = async (q) => {
    if (!window.confirm('Delete this question permanently?')) return
    try {
      if (isSupabaseConfigured()) {
        await supabase.from('questions').delete().eq('id', q.id)
      }
      await contentStore.deleteQuestion(q.id)
      invalidateCurriculumCache()
      await refresh()

      setQuestions((prev) => prev.filter((item) => item.id !== q.id))
      setNotice({
        type: 'info',
        text: 'Question deleted.',
      })
    } catch (err) {
      alert('Could not delete question: ' + err.message)
    }
  }

  // Save changes from Edit Modal
  const handleSaveEditedQuestion = async (updated) => {
    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from('questions')
          .update({
            prompt: updated.prompt,
            choices: updated.choices,
            answer: updated.answer,
            explanation: updated.explanation,
            category_id: updated.category_id,
            exam_target: updated.exam_target,
            status: updated.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', updated.id)
      }
      await contentStore.saveQuestion({
        id: updated.id,
        categoryId: updated.category_id,
        prompt: updated.prompt,
        choices: updated.choices,
        answer: updated.answer,
        explanation: updated.explanation,
        status: updated.status,
        exam_target: updated.exam_target,
      })
      invalidateCurriculumCache()
      await refresh()

      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))
      setEditingQuestion(null)
      setNotice({
        type: 'success',
        text: 'Question updated successfully.',
      })
    } catch (err) {
      alert('Failed to save edits: ' + err.message)
    }
  }

  // Filter questions for Review Queue
  const reviewQuestions = useMemo(() => {
    if (reviewFilter === 'all') return questions
    return questions.filter((q) => q.status === reviewFilter)
  }, [questions, reviewFilter])

  // Group questions by Date for Review Queue
  const groupedReviewQuestions = useMemo(() => {
    const groups = new Map()
    for (const q of reviewQuestions) {
      const label = formatGroupDate(q.created_at)
      if (!groups.has(label)) {
        groups.set(label, [])
      }
      groups.get(label).push(q)
    }
    return Array.from(groups.entries())
  }, [reviewQuestions])

  // New Staff Account Creation State
  const [newStaffEmail, setNewStaffEmail] = useState('')
  const [newStaffPassword, setNewStaffPassword] = useState('')
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffRole, setNewStaffRole] = useState('contributor')
  const [creatingStaff, setCreatingStaff] = useState(false)

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    if (!newStaffEmail || !newStaffPassword) {
      alert('Email and password are required.')
      return
    }
    setCreatingStaff(true)
    try {
      const res = await createStaffAccount({
        email: newStaffEmail.trim(),
        password: newStaffPassword,
        fullName: newStaffName.trim(),
        role: newStaffRole,
        assignedCategories: [],
      })

      if (res.error) {
        alert('Could not create account: ' + res.error.message)
      } else {
        const newlyCreated = {
          id: res.data?.id || `user-${Date.now()}`,
          email: newStaffEmail.trim(),
          full_name: newStaffName.trim() || newStaffEmail.split('@')[0],
          role: newStaffRole,
          assigned_categories: [],
          created_at: new Date().toISOString(),
        }
        setUsersList((prev) => [newlyCreated, ...prev])
        setNotice({
          type: 'success',
          text: `Staff account created for ${newStaffEmail} (${newStaffRole.toUpperCase()}).`,
        })
        setNewStaffEmail('')
        setNewStaffPassword('')
        setNewStaffName('')
        setNewStaffRole('contributor')
      }
    } catch (err) {
      alert('Account creation error: ' + err.message)
    } finally {
      setCreatingStaff(false)
    }
  }

  const handleUpdateRole = async (userId, targetRole) => {
    try {
      await updateProfileRole(userId, targetRole)
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: targetRole } : u)),
      )
      setNotice({
        type: 'info',
        text: `Role updated to ${targetRole}.`,
      })
    } catch (err) {
      alert('Failed to update role: ' + err.message)
    }
  }

  const handleDeleteStaff = async (userId) => {
    if (!window.confirm('Revoke access and delete this staff account?')) return
    try {
      await deleteStaffProfile(userId)
      setUsersList((prev) => prev.filter((u) => u.id !== userId))
      setNotice({
        type: 'info',
        text: 'Staff account removed.',
      })
    } catch (err) {
      alert('Failed to remove account: ' + err.message)
    }
  }

  // =========================================================================
  // SECURITY GATE: RESTRICTED ACCESS
  // 1. Unauthenticated -> Isolated Staff Login Screen
  // 2. Authenticated but non-staff (e.g. Student) -> Access Restricted Screen
  // =========================================================================
  if (!user) {
    return (
      <div className="admin-gate-page">
        <div className="admin-gate-card">
          <div className="admin-gate-header">
            <div className="admin-gate-badge">
              <ShieldCheckIcon width="28" height="28" />
            </div>
            <h1 className="admin-gate-title">MPT·AI Staff Portal</h1>
            <p className="admin-gate-subtitle">
              Restricted administrative gateway. Authorized personnel only.
            </p>
          </div>

          <form onSubmit={handleStaffLogin} className="admin-gate-form">
            {gateError && (
              <div className="admin-gate-error" role="alert">
                <AlertCircleIcon width="16" height="16" />
                <span>{gateError}</span>
              </div>
            )}

            <div className="field-group">
              <label className="field-label" htmlFor="staff-gate-email">
                Staff Email Address
              </label>
              <input
                id="staff-gate-email"
                type="email"
                className="field-input"
                value={gateEmail}
                onChange={(e) => setGateEmail(e.target.value)}
                placeholder="staff@mpt-ai.org"
                required
                autoFocus
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="staff-gate-password">
                Password
              </label>
              <input
                id="staff-gate-password"
                type="password"
                className="field-input"
                value={gatePassword}
                onChange={(e) => setGatePassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary admin-gate-btn"
              disabled={gateLoading}
            >
              {gateLoading ? 'Authenticating…' : 'Sign In to Staff Console'}
            </button>
          </form>

          <div className="admin-gate-footer">
            <Link to="/" className="admin-gate-back-link">
              <ArrowLeftIcon width="15" height="15" />
              <span>Return to Student App</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (user && !isStaff) {
    return (
      <div className="admin-gate-page">
        <div className="admin-gate-card">
          <div className="admin-gate-header">
            <div className="admin-gate-badge admin-gate-badge--denied">
              <LockIcon width="28" height="28" />
            </div>
            <h1 className="admin-gate-title">Access Restricted</h1>
            <p className="admin-gate-subtitle">
              Signed in as <strong>{user.email}</strong>
            </p>
          </div>

          <div className="admin-gate-denied-box">
            <AlertCircleIcon width="20" height="20" />
            <div>
              <strong>Staff Privileges Required</strong>
              <p>
                This account does not have administrator, editor, or reviewer permissions.
                Please sign in with authorized staff credentials to access the admin portal.
              </p>
            </div>
          </div>

          <div className="admin-gate-actions">
            <Link to="/" className="btn btn--primary">
              Return to Student App
            </Link>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={async () => {
                await signOut()
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      {/* Top Header */}
      <header className="admin-header">
        <div className="admin-header__inner">
          <div className="admin-header__left">
            <Link to="/" className="admin-back-btn" title="Back to Student Dashboard">
              <ArrowLeftIcon width="16" height="16" />
              <span>Student App</span>
            </Link>
            <div className="admin-header__divider" />
            <div className="admin-brand">
              <span className="admin-brand__badge">Admin</span>
              <span className="admin-brand__title">MPT·AI Portal</span>
            </div>
          </div>

          <div className="admin-header__right">
            {/* Quick Dev Role Switcher */}
            <div className="admin-role-switch" title="Active preview permissions">
              <LockIcon width="13" height="13" />
              <span className="role-switch-label">Role:</span>
              <select
                className="role-switch-select"
                value={role}
                onChange={(e) => setDevRole(e.target.value)}
                aria-label="Simulate Role"
              >
                <option value="admin">Admin (Full Control)</option>
                <option value="editor">Editor (Can Add & Edit)</option>
                <option value="reviewer">Reviewer (Review Queue)</option>
                <option value="contributor">Contributor (Draft Submissions)</option>
              </select>
            </div>

            {/* Authenticated Staff User Pill */}
            {user && (
              <div className="admin-user-pill">
                <span className="admin-user-email" title={user.email}>{user.email}</span>
                <button
                  type="button"
                  className="admin-signout-btn"
                  onClick={async () => {
                    await signOut()
                  }}
                  title="Sign Out of Staff Portal"
                >
                  Sign Out
                </button>
              </div>
            )}

            {/* Quick 4-Theme Switcher */}
            <button
              type="button"
              className="admin-tool-btn"
              onClick={handleCycleTheme}
              title={`Theme: ${currentTheme.toUpperCase()}. Click to cycle (Light / Dark / Zen / Midnight).`}
            >
              {currentTheme === 'dark' || currentTheme === 'midnight' ? (
                <MoonIcon width="16" height="16" />
              ) : (
                <SunIcon width="16" height="16" />
              )}
            </button>
          </div>
        </div>

        {/* Tabbed Navigation Bar */}
        <nav className="admin-tabs" role="tablist" aria-label="Portal Navigation">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'dashboard' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChartIcon width="16" height="16" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'add-question' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('add-question')}
          >
            <PlusIcon width="16" height="16" />
            <span>Add Question</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'review-queue' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('review-queue')}
          >
            <ShieldCheckIcon width="16" height="16" />
            <span>Review Queue</span>
            {stats.pending > 0 && (
              <span className="admin-tab-badge is-pending">{stats.pending}</span>
            )}
          </button>

          {role === 'admin' && (
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'users' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <UsersIcon width="16" height="16" />
              <span>User Management</span>
            </button>
          )}
        </nav>
      </header>

      {/* Global Notice Toast */}
      {notice && (
        <div className={`admin-notice-bar admin-notice-bar--${notice.type}`}>
          <div className="admin-notice-content">
            {notice.type === 'success' ? (
              <CheckCircleIcon width="16" height="16" />
            ) : (
              <AlertCircleIcon width="16" height="16" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            className="notice-dismiss-btn"
            onClick={() => setNotice(null)}
          >
            <CloseIcon width="14" height="14" />
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      <main className="admin-container w-full max-w-7xl mx-auto p-4 md:p-8 flex-1">
        {/* ========================================================
            TAB 1: DASHBOARD
           ======================================================== */}
        {activeTab === 'dashboard' && (
          <div className="tab-pane dashboard-pane">
            <div className="pane-header">
              <div>
                <h2>Overview & Health</h2>
                <p className="pane-desc">
                  Curriculum staging pipeline metrics and student release status.
                </p>
              </div>
            </div>

            {/* Minimal Stats Grid */}
            <div className="minimal-stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="metric-card is-success">
                <div className="metric-card__header">
                  <span className="metric-label">Total Live Questions</span>
                  <CheckCircleIcon width="18" height="18" className="metric-icon" />
                </div>
                <div className="metric-value">{stats.live}</div>
                <div className="metric-subtext">Approved and practicing in student app</div>
              </div>

              <div className="metric-card is-amber">
                <div className="metric-card__header">
                  <span className="metric-label">Pending Reviews</span>
                  <AlertTriangleIcon width="18" height="18" className="metric-icon" />
                </div>
                <div className="metric-value">{stats.pending}</div>
                <div className="metric-subtext">Drafts awaiting reviewer verification</div>
              </div>

              <div className="metric-card is-blue">
                <div className="metric-card__header">
                  <span className="metric-label">Total Users</span>
                  <UsersIcon width="18" height="18" className="metric-icon" />
                </div>
                <div className="metric-value">{stats.users}</div>
                <div className="metric-subtext">Authorized staff & contributors</div>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="dashboard-shortcuts grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                className="action-card cursor-pointer"
                onClick={() => setIsAddDrawerOpen(true)}
                role="button"
                tabIndex={0}
              >
                <div className="action-card__icon is-blue">
                  <PlusIcon width="20" height="20" />
                </div>
                <div className="action-card__body">
                  <h3>Submit New Question</h3>
                  <p>Open the slide-out 3-step draft drawer.</p>
                </div>
              </div>

              <div
                className="action-card"
                onClick={() => setActiveTab('review-queue')}
                role="button"
                tabIndex={0}
              >
                <div className="action-card__icon is-amber">
                  <ShieldCheckIcon width="20" height="20" />
                </div>
                <div className="action-card__body">
                  <h3>Review Queue ({stats.pending})</h3>
                  <p>Verify, edit, and approve incoming draft questions.</p>
                </div>
              </div>

              {role === 'admin' && (
                <div
                  className="action-card"
                  onClick={() => setActiveTab('users')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="action-card__icon is-indigo">
                    <UsersIcon width="20" height="20" />
                  </div>
                  <div className="action-card__body">
                    <h3>Manage Staff Roles</h3>
                    <p>Invite examiners, assign roles, and grant subject permissions.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Staging Pipeline Visual Guide */}
            <div className="pipeline-guide-card">
              <h3>Draft-to-Live Staging Pipeline</h3>
              <div className="pipeline-stepper">
                <div className="stepper-step">
                  <div className="stepper-bubble">1</div>
                  <div className="stepper-info">
                    <strong>Contributor Draft</strong>
                    <span>Saved with status "pending". Students cannot see this item.</span>
                  </div>
                </div>
                <div className="stepper-arrow">→</div>
                <div className="stepper-step">
                  <div className="stepper-bubble">2</div>
                  <div className="stepper-info">
                    <strong>Review & Quality Check</strong>
                    <span>Reviewer or Admin inspects prompt, choices, answer key, and explanation.</span>
                  </div>
                </div>
                <div className="stepper-arrow">→</div>
                <div className="stepper-step">
                  <div className="stepper-bubble is-live">3</div>
                  <div className="stepper-info">
                    <strong>Approved Live Release</strong>
                    <span>Question marked "approved". Instantly queryable in student tests & drills.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: ADD QUESTION (Structured 3-Step Flow)
           ======================================================== */}
        {activeTab === 'add-question' && (
          <div className="tab-pane add-question-pane">
            <div className="pane-header">
              <div>
                <h2>New Question Workflow</h2>
                <p className="pane-desc">
                  Questions are staged as <strong>Pending Drafts</strong> by default for reviewer verification.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddQuestionSubmit} className="question-workflow-form">
              {/* STEP 1: SELECT SUBJECT (With Dynamic Subject Creation) */}
              <div className="form-step-card">
                <div className="step-card-header">
                  <div>
                    <div className="step-tag">Step 1</div>
                    <label className="step-label" htmlFor="subject-select">
                      Select Core Subject
                    </label>
                    <p className="step-hint">
                      Pick the syllabus area this question belongs to, or create a new subject dynamically.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn--small btn--ghost create-subject-trigger-btn"
                    onClick={() => setShowSubjectModal(true)}
                    title="Add a new academic subject to the curriculum"
                  >
                    <PlusIcon width="14" height="14" />
                    <span>Create New Subject</span>
                  </button>
                </div>

                <div className="subject-select-row">
                  <select
                    id="subject-select"
                    className="step-select"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    required
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.title} {sub.desc ? `— ${sub.desc}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* STEP 2: SELECT EXAM TARGET */}
              <div className="form-step-card">
                <div className="step-tag">Step 2</div>
                <label className="step-label">Select Exam Target</label>
                <p className="step-hint">
                  Where should this question appear? Choose PMS, CSS, or Both.
                </p>
                <div className="exam-toggle-group">
                  <button
                    type="button"
                    className={`exam-toggle-btn ${formExamTarget === 'CSS' ? 'is-active' : ''}`}
                    onClick={() => setFormExamTarget('CSS')}
                  >
                    <span className="exam-toggle-title">CSS</span>
                    <span className="exam-toggle-sub">FPSC Federal MPT</span>
                  </button>

                  <button
                    type="button"
                    className={`exam-toggle-btn ${formExamTarget === 'PMS' ? 'is-active' : ''}`}
                    onClick={() => setFormExamTarget('PMS')}
                  >
                    <span className="exam-toggle-title">PMS</span>
                    <span className="exam-toggle-sub">PPSC Provincial Screening</span>
                  </button>

                  <button
                    type="button"
                    className={`exam-toggle-btn ${formExamTarget === 'Both' ? 'is-active' : ''}`}
                    onClick={() => setFormExamTarget('Both')}
                  >
                    <span className="exam-toggle-title">Both (CSS & PMS)</span>
                    <span className="exam-toggle-sub">High-yield overlapping content</span>
                  </button>
                </div>
              </div>

              {/* STEP 3: QUESTION DETAILS */}
              <div className="form-step-card">
                <div className="step-tag">Step 3</div>
                <label className="step-label">Question Details</label>

                {/* Prompt */}
                <div className="field-group">
                  <label className="field-label" htmlFor="q-prompt">
                    Question Prompt <span className="field-req">*</span>
                  </label>
                  <textarea
                    id="q-prompt"
                    className="field-textarea"
                    rows={3}
                    placeholder="Enter the question text clearly..."
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                    required
                  />
                </div>

                {/* Choices (4 Options with radio for answer) */}
                <div className="field-group">
                  <label className="field-label">
                    Choices & Answer Key <span className="field-req">*</span>
                  </label>
                  <p className="step-hint">
                    Provide 4 choices and click the radio button beside the correct answer.
                  </p>

                  <div className="choices-stack">
                    {['A', 'B', 'C', 'D'].map((letter, idx) => (
                      <div
                        key={letter}
                        className={`choice-input-row ${formAnswer === idx ? 'is-selected' : ''}`}
                      >
                        <button
                          type="button"
                          className={`choice-key-indicator ${formAnswer === idx ? 'is-correct' : ''}`}
                          onClick={() => setFormAnswer(idx)}
                          title={`Set option ${letter} as correct answer`}
                        >
                          {formAnswer === idx ? (
                            <CheckIcon width="16" height="16" />
                          ) : (
                            <span>{letter}</span>
                          )}
                        </button>
                        <input
                          type="text"
                          className="field-input choice-text"
                          placeholder={`Option ${letter}...`}
                          value={formChoices[idx]}
                          onChange={(e) => {
                            const next = [...formChoices]
                            next[idx] = e.target.value
                            setFormChoices(next)
                          }}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div className="field-group">
                  <label className="field-label" htmlFor="q-explanation">
                    Detailed Explanation & Key Reference
                  </label>
                  <textarea
                    id="q-explanation"
                    className="field-textarea"
                    rows={3}
                    placeholder="Cite relevant constitutional article, historical context, or mathematical steps..."
                    value={formExplanation}
                    onChange={(e) => setFormExplanation(e.target.value)}
                  />
                </div>

                {/* Submit Actions */}
                <div className="form-submit-row">
                  <div className="form-submit-note">
                    Default status: <span className="badge-pending">pending</span>
                  </div>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? 'Saving Draft…' : 'Submit Question for Review'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================
            TAB 3: REVIEW QUEUE (Grouped by Date Added)
           ======================================================== */}
        {activeTab === 'review-queue' && (
          <div className="tab-pane review-queue-pane">
            <div className="pane-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2>Review Queue</h2>
                <p className="pane-desc">
                  Inspect incoming questions, check answer keys, and click <strong>Approve</strong> to release them live to students.
                </p>
              </div>

              {/* Action Controls & Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter Chips */}
                <div className="filter-chips flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <button
                    type="button"
                    className={`filter-chip min-h-[44px] px-3.5 py-2 rounded-full text-xs font-semibold ${reviewFilter === 'pending' ? 'is-active' : ''}`}
                    onClick={() => setReviewFilter('pending')}
                  >
                    Pending ({stats.pending})
                  </button>
                  <button
                    type="button"
                    className={`filter-chip min-h-[44px] px-3.5 py-2 rounded-full text-xs font-semibold ${reviewFilter === 'rejected' ? 'is-active' : ''}`}
                    onClick={() => setReviewFilter('rejected')}
                  >
                    Rejected ({stats.rejected})
                  </button>
                  <button
                    type="button"
                    className={`filter-chip min-h-[44px] px-3.5 py-2 rounded-full text-xs font-semibold ${reviewFilter === 'all' ? 'is-active' : ''}`}
                    onClick={() => setReviewFilter('all')}
                  >
                    All ({stats.total})
                  </button>
                </div>

                {/* View Switcher: Cards vs Table */}
                <div className="flex items-center gap-1 p-1 bg-[var(--surface-2)] rounded-full border border-[var(--border)]">
                  <button
                    type="button"
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      reviewViewMode === 'cards'
                        ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                    onClick={() => setReviewViewMode('cards')}
                    title="View questions as stacked cards"
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      reviewViewMode === 'table'
                        ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                    onClick={() => setReviewViewMode('table')}
                    title="View questions in a horizontally scrollable Question Grid"
                  >
                    Question Grid
                  </button>
                </div>

                {/* Quick Add Question Drawer Trigger */}
                <button
                  type="button"
                  className="btn btn--primary min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
                  onClick={() => setIsAddDrawerOpen(true)}
                  title="Open Add Question Slide-out Drawer"
                >
                  <PlusIcon width="16" height="16" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {loadingQuestions ? (
              <div className="loading-state">Loading questions from repository…</div>
            ) : groupedReviewQuestions.length === 0 ? (
              <div className="empty-state-card">
                <CheckCircleIcon width="36" height="36" className="empty-icon" />
                <h3>No questions in this view</h3>
                <p>
                  {reviewFilter === 'pending'
                    ? 'All caught up! No pending drafts await review.'
                    : 'No questions match the current filter criteria.'}
                </p>
              </div>
            ) : reviewViewMode === 'table' ? (
              /* Horizontally scrollable Question Grid Table */
              <div className="queue-table-view space-y-6">
                {groupedReviewQuestions.map(([dateGroup, items]) => (
                  <div key={dateGroup} className="date-group-section">
                    <div className="date-group-header flex items-center justify-between gap-2 mb-2">
                      <span className="date-group-title text-sm sm:text-base font-bold text-[var(--text)]">{dateGroup}</span>
                      <span className="date-group-count text-xs text-[var(--muted)]">{items.length} questions</span>
                    </div>

                    <div className="overflow-x-auto w-full border border-[var(--border)] rounded-2xl bg-[var(--surface)] shadow-xs">
                      <table className="staff-table min-w-[760px] w-full text-left border-collapse">
                        <thead>
                          <tr>
                            <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">Subject</th>
                            <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">Question Prompt</th>
                            <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">Correct Key</th>
                            <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">Target</th>
                            <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">Status</th>
                            <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">Author</th>
                            <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((q) => (
                            <tr key={q.id}>
                              <td className="px-4 py-3 border-b border-[var(--border)] text-xs font-semibold text-[var(--text)] whitespace-nowrap">
                                {subjects.find((s) => s.id === q.category_id)?.title || q.category_id}
                              </td>
                              <td className="px-4 py-3 border-b border-[var(--border)] text-sm text-[var(--text)] max-w-xs truncate" title={q.prompt}>
                                {q.prompt}
                              </td>
                              <td className="px-4 py-3 border-b border-[var(--border)] text-xs font-bold text-[var(--primary)] whitespace-nowrap">
                                Option {String.fromCharCode(65 + q.answer)}
                              </td>
                              <td className="px-4 py-3 border-b border-[var(--border)] text-xs text-[var(--muted)] whitespace-nowrap">
                                {Array.isArray(q.exam_target) ? q.exam_target.join(' & ') : 'CSS & PMS'}
                              </td>
                              <td className="px-4 py-3 border-b border-[var(--border)] whitespace-nowrap">
                                <span className={`status-pill status-pill--${q.status} text-xs font-bold px-2 py-0.5 rounded-full uppercase`}>
                                  {q.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 border-b border-[var(--border)] text-xs text-[var(--muted)] whitespace-nowrap">
                                {q.created_by_name || 'Staff'}
                              </td>
                              <td className="px-4 py-3 border-b border-[var(--border)] whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    className="action-btn is-edit min-h-[36px] px-3 py-1 text-xs"
                                    onClick={() => setEditingQuestion(q)}
                                    title="Edit question"
                                  >
                                    <EditIcon width="13" height="13" />
                                    <span>Edit</span>
                                  </button>
                                  {q.status !== 'approved' && (
                                    <button
                                      type="button"
                                      className="action-btn is-approve min-h-[36px] px-3 py-1 text-xs"
                                      onClick={() => handleApproveQuestion(q)}
                                      title="Approve question"
                                    >
                                      <CheckCircleIcon width="13" height="13" />
                                      <span>Approve</span>
                                    </button>
                                  )}
                                  {q.status !== 'rejected' && (
                                    <button
                                      type="button"
                                      className="action-btn is-reject min-h-[36px] px-3 py-1 text-xs"
                                      onClick={() => handleRejectQuestion(q)}
                                      title="Reject question"
                                    >
                                      <XCircleIcon width="13" height="13" />
                                      <span>Reject</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="action-btn is-delete min-h-[36px] px-2 py-1 text-xs"
                                    onClick={() => handleDeleteQuestion(q)}
                                    title="Delete question"
                                  >
                                    <TrashIcon width="13" height="13" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="queue-groups">
                {groupedReviewQuestions.map(([dateGroup, items]) => (
                  <div key={dateGroup} className="date-group-section">
                    <div className="date-group-header">
                      <span className="date-group-title">{dateGroup}</span>
                      <span className="date-group-count">{items.length} questions</span>
                    </div>

                    <div className="queue-cards-stack">
                      {items.map((q) => (
                        <div key={q.id} className={`queue-card is-status-${q.status}`}>
                          {/* Card Header */}
                          <div className="queue-card__header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="queue-card__badges flex flex-wrap items-center gap-1.5">
                              <span className="subject-pill">
                                {subjects.find((s) => s.id === q.category_id)?.title ||
                                  q.category_id}
                              </span>
                              <span className="exam-target-pill">
                                {Array.isArray(q.exam_target)
                                  ? q.exam_target.join(' & ')
                                  : 'CSS & PMS'}
                              </span>
                              <span className={`status-pill status-pill--${q.status}`}>
                                {q.status.toUpperCase()}
                              </span>
                            </div>

                            <span className="queue-card__author text-xs text-[var(--muted)]">
                              By {q.created_by_name || 'Staff Contributor'}
                            </span>
                          </div>

                          {/* Card Body */}
                          <div className="queue-card__body">
                            <h4 className="queue-prompt text-base sm:text-lg font-bold text-[var(--text)]">{q.prompt}</h4>

                            <div className="queue-choices-grid grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                              {q.choices.map((choice, cIdx) => (
                                <div
                                  key={cIdx}
                                  className={`queue-choice-pill min-h-[44px] ${
                                    q.answer === cIdx ? 'is-correct' : ''
                                  }`}
                                >
                                  <span className="choice-letter">
                                    {String.fromCharCode(65 + cIdx)}
                                  </span>
                                  <span className="choice-text">{choice}</span>
                                  {q.answer === cIdx && (
                                    <span className="key-tag">✓ Correct Key</span>
                                  )}
                                </div>
                              ))}
                            </div>

                            {q.explanation && (
                              <div className="queue-explanation mt-3 p-3 rounded-xl bg-[var(--surface-2)] text-xs sm:text-sm text-[var(--muted)]">
                                <strong>Explanation:</strong> {q.explanation}
                              </div>
                            )}
                          </div>

                          {/* Card Actions */}
                          <div className="queue-card__actions flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-3 border-t border-[var(--border)]">
                            <div className="actions-left flex items-center gap-2">
                              <button
                                type="button"
                                className="action-btn is-edit min-h-[44px] px-3.5 py-2"
                                onClick={() => setEditingQuestion(q)}
                                title="Edit prompt, choices, or explanation"
                              >
                                <EditIcon width="14" height="14" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                className="action-btn is-delete min-h-[44px] px-3.5 py-2"
                                onClick={() => handleDeleteQuestion(q)}
                                title="Delete question"
                              >
                                <TrashIcon width="14" height="14" />
                                <span>Delete</span>
                              </button>
                            </div>

                            <div className="actions-right flex items-center gap-2">
                              {q.status !== 'rejected' && (
                                <button
                                  type="button"
                                  className="action-btn is-reject min-h-[44px] px-4 py-2"
                                  onClick={() => handleRejectQuestion(q)}
                                >
                                  <XCircleIcon width="14" height="14" />
                                  <span>Reject</span>
                                </button>
                              )}

                              {q.status !== 'approved' && (
                                <button
                                  type="button"
                                  className="action-btn is-approve min-h-[44px] px-4 py-2"
                                  onClick={() => handleApproveQuestion(q)}
                                >
                                  <CheckCircleIcon width="14" height="14" />
                                  <span>Approve (Make Live)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: USER MANAGEMENT (Super Admin Only)
           ======================================================== */}
        {activeTab === 'users' && role === 'admin' && (
          <div className="tab-pane users-pane">
            <div className="pane-header">
              <div>
                <h2>User Management & Staff Roles</h2>
                <p className="pane-desc">
                  Provision new team members and assign RBAC roles (Admin, Editor, Reviewer, Contributor).
                </p>
              </div>
            </div>

            {/* Create Account Form */}
            <div className="create-user-card">
              <div className="create-user-card__header">
                <UserPlusIcon width="18" height="18" />
                <h3>Create New Staff Account</h3>
              </div>

              <form onSubmit={handleCreateStaff} className="create-user-form">
                <div className="create-user-grid">
                  <div className="field-group">
                    <label className="field-label" htmlFor="staff-email">
                      Username / Email <span className="field-req">*</span>
                    </label>
                    <input
                      id="staff-email"
                      type="email"
                      className="field-input"
                      placeholder="e.g. examiner@fpsc.gov.pk"
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="staff-pass">
                      Temporary Password <span className="field-req">*</span>
                    </label>
                    <input
                      id="staff-pass"
                      type="password"
                      className="field-input"
                      placeholder="Minimum 6 characters"
                      value={newStaffPassword}
                      onChange={(e) => setNewStaffPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="staff-name">
                      Full Name
                    </label>
                    <input
                      id="staff-name"
                      type="text"
                      className="field-input"
                      placeholder="e.g. Dr. Salman Khan"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="staff-role">
                      Designated Role <span className="field-req">*</span>
                    </label>
                    <select
                      id="staff-role"
                      className="field-input"
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      required
                    >
                      <option value="contributor">Contributor (Drafts questions)</option>
                      <option value="reviewer">Reviewer (Verifies & approves)</option>
                      <option value="editor">Editor (Updates & manages bank)</option>
                      <option value="admin">Admin (Full system control)</option>
                    </select>
                  </div>
                </div>

                <div className="create-user-submit">
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={creatingStaff}
                  >
                    {creatingStaff ? 'Creating Account…' : 'Create Staff Member'}
                  </button>
                </div>
              </form>
            </div>

            {/* Staff Members Table */}
            <div className="users-table-card">
              <div className="table-header">
                <h3>Authorized Staff Members ({usersList.length})</h3>
              </div>

              {loadingUsers ? (
                <div className="loading-state">Loading staff profiles…</div>
              ) : (
                <div className="table-responsive overflow-x-auto w-full border border-[var(--border)] rounded-2xl bg-[var(--surface)] shadow-xs mt-3">
                  <table className="staff-table min-w-[680px] w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">Member</th>
                        <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">Email</th>
                        <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">Current Role</th>
                        <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">Joined</th>
                        <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((st) => (
                        <tr key={st.id}>
                          <td className="px-4 py-3 border-b border-[var(--border)] whitespace-nowrap">
                            <div className="staff-member-cell flex items-center gap-2.5">
                              <div className="staff-avatar w-8 h-8 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] font-bold flex items-center justify-center text-xs shrink-0">
                                {(st.full_name || st.email || 'U')[0].toUpperCase()}
                              </div>
                              <span className="staff-name font-semibold text-sm text-[var(--text)]">
                                {st.full_name || st.email.split('@')[0]}
                              </span>
                            </div>
                          </td>
                          <td className="staff-email-cell px-4 py-3 border-b border-[var(--border)] text-xs text-[var(--muted)] whitespace-nowrap">
                            {st.email}
                          </td>
                          <td className="px-4 py-3 border-b border-[var(--border)] whitespace-nowrap">
                            <select
                              className={`role-badge-select role-${st.role} min-h-[40px] px-3 py-1 rounded-lg text-xs font-bold border border-[var(--border)] bg-[var(--surface-2)]`}
                              value={st.role}
                              onChange={(e) => handleUpdateRole(st.id, e.target.value)}
                              aria-label="Change Role"
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="reviewer">Reviewer</option>
                              <option value="contributor">Contributor</option>
                            </select>
                          </td>
                          <td className="staff-date-cell px-4 py-3 border-b border-[var(--border)] text-xs text-[var(--muted)] whitespace-nowrap">
                            {formatGroupDate(st.created_at)}
                          </td>
                          <td className="px-4 py-3 border-b border-[var(--border)] whitespace-nowrap">
                            <button
                              type="button"
                              className="staff-delete-btn min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--red)] hover:bg-[var(--surface-2)] transition-colors"
                              onClick={() => handleDeleteStaff(st.id)}
                              title="Revoke and delete account"
                            >
                              <TrashIcon width="16" height="16" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Dynamic Subject Creation Modal */}
      {showSubjectModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowSubjectModal(false)}
        >
          <div className="modal w-[95%] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Subject</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowSubjectModal(false)}
              >
                <CloseIcon width="18" height="18" />
              </button>
            </div>

            <form onSubmit={handleCreateSubjectSubmit} className="modal-form">
              <div className="field-group">
                <label className="field-label" htmlFor="new-sub-name">
                  Subject Name <span className="field-req">*</span>
                </label>
                <input
                  id="new-sub-name"
                  type="text"
                  className="field-input"
                  placeholder="e.g. Sociology, International Relations, Economics"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label className="field-label">Exam Track <span className="field-req">*</span></label>
                <div className="exam-toggle-group is-compact">
                  <button
                    type="button"
                    className={`exam-toggle-btn ${newSubjectTrack === 'CSS' ? 'is-active' : ''}`}
                    onClick={() => setNewSubjectTrack('CSS')}
                  >
                    <span className="exam-toggle-title">CSS</span>
                  </button>
                  <button
                    type="button"
                    className={`exam-toggle-btn ${newSubjectTrack === 'PMS' ? 'is-active' : ''}`}
                    onClick={() => setNewSubjectTrack('PMS')}
                  >
                    <span className="exam-toggle-title">PMS</span>
                  </button>
                  <button
                    type="button"
                    className={`exam-toggle-btn ${newSubjectTrack === 'Both' ? 'is-active' : ''}`}
                    onClick={() => setNewSubjectTrack('Both')}
                  >
                    <span className="exam-toggle-title">Both (CSS & PMS)</span>
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="new-sub-tagline">
                  Description / Tagline (Optional)
                </label>
                <input
                  id="new-sub-tagline"
                  type="text"
                  className="field-input"
                  placeholder="e.g. Social theories, culture and institutions"
                  value={newSubjectTagline}
                  onChange={(e) => setNewSubjectTagline(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setShowSubjectModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={creatingSubject}
                >
                  {creatingSubject ? 'Creating…' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-out Drawer: Edit Question */}
      {editingQuestion && (
        <div
          className="drawer-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditingQuestion(null)}
        >
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h2>Edit Question</h2>
                <p className="drawer-subtitle">Update question details, key, and syllabus target.</p>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setEditingQuestion(null)}
                aria-label="Close drawer"
              >
                <CloseIcon width="18" height="18" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveEditedQuestion(editingQuestion)
              }}
              className="drawer-form"
            >
              <div className="drawer-body">
                <div className="field-group">
                  <label className="field-label">Subject</label>
                  <select
                    className="field-input"
                    value={editingQuestion.category_id}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, category_id: e.target.value })
                    }
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label">Exam Target</label>
                  <select
                    className="field-input"
                    value={
                      editingQuestion.exam_target?.length === 2
                        ? 'Both'
                        : editingQuestion.exam_target?.[0] || 'Both'
                    }
                    onChange={(e) => {
                      const val = e.target.value
                      setEditingQuestion({
                        ...editingQuestion,
                        exam_target: val === 'Both' ? ['CSS', 'PMS'] : [val],
                      })
                    }}
                  >
                    <option value="CSS">CSS</option>
                    <option value="PMS">PMS</option>
                    <option value="Both">Both (CSS & PMS)</option>
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label">Question Prompt</label>
                  <textarea
                    className="field-textarea"
                    rows={3}
                    value={editingQuestion.prompt}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, prompt: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Choices</label>
                  {['A', 'B', 'C', 'D'].map((letter, idx) => (
                    <div key={letter} className="choice-input-row is-modal">
                      <button
                        type="button"
                        className={`choice-key-indicator ${
                          editingQuestion.answer === idx ? 'is-correct' : ''
                        }`}
                        onClick={() =>
                          setEditingQuestion({ ...editingQuestion, answer: idx })
                        }
                      >
                        {editingQuestion.answer === idx ? (
                          <CheckIcon width="16" height="16" />
                        ) : (
                          <span>{letter}</span>
                        )}
                      </button>
                      <input
                        type="text"
                        className="field-input choice-text"
                        value={editingQuestion.choices[idx] || ''}
                        onChange={(e) => {
                          const next = [...editingQuestion.choices]
                          next[idx] = e.target.value
                          setEditingQuestion({ ...editingQuestion, choices: next })
                        }}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="field-group">
                  <label className="field-label">Explanation</label>
                  <textarea
                    className="field-textarea"
                    rows={3}
                    value={editingQuestion.explanation || ''}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="drawer-footer">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setEditingQuestion(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-out Drawer: Add Question */}
      {isAddDrawerOpen && (
        <div
          className="drawer-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsAddDrawerOpen(false)}
        >
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h2>Add Question</h2>
                <p className="drawer-subtitle">Stage a new question draft into the review queue.</p>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setIsAddDrawerOpen(false)}
                aria-label="Close drawer"
              >
                <CloseIcon width="18" height="18" />
              </button>
            </div>

            <form onSubmit={handleAddQuestionSubmit} className="drawer-form">
              <div className="drawer-body">
                {/* Step 1: Subject */}
                <div className="form-step-card">
                  <div className="step-card-header">
                    <div>
                      <div className="step-tag">Step 1</div>
                      <label className="step-label" htmlFor="drawer-subject-select">Select Core Subject</label>
                    </div>
                    <button
                      type="button"
                      className="btn btn--small btn--ghost create-subject-trigger-btn"
                      onClick={() => setShowSubjectModal(true)}
                    >
                      <PlusIcon width="14" height="14" />
                      <span>New Subject</span>
                    </button>
                  </div>
                  <select
                    id="drawer-subject-select"
                    className="step-select"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    required
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.title} {sub.desc ? `— ${sub.desc}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Exam Target */}
                <div className="form-step-card">
                  <div className="step-tag">Step 2</div>
                  <label className="step-label">Select Exam Target</label>
                  <div className="exam-toggle-group">
                    <button
                      type="button"
                      className={`exam-toggle-btn ${formExamTarget === 'CSS' ? 'is-active' : ''}`}
                      onClick={() => setFormExamTarget('CSS')}
                    >
                      <span className="exam-toggle-title">CSS</span>
                    </button>
                    <button
                      type="button"
                      className={`exam-toggle-btn ${formExamTarget === 'PMS' ? 'is-active' : ''}`}
                      onClick={() => setFormExamTarget('PMS')}
                    >
                      <span className="exam-toggle-title">PMS</span>
                    </button>
                    <button
                      type="button"
                      className={`exam-toggle-btn ${formExamTarget === 'Both' ? 'is-active' : ''}`}
                      onClick={() => setFormExamTarget('Both')}
                    >
                      <span className="exam-toggle-title">Both</span>
                    </button>
                  </div>
                </div>

                {/* Step 3: Question details */}
                <div className="form-step-card">
                  <div className="step-tag">Step 3</div>
                  <label className="step-label">Question Details</label>
                  <div className="field-group">
                    <label className="field-label" htmlFor="drawer-q-prompt">Question Prompt *</label>
                    <textarea
                      id="drawer-q-prompt"
                      className="field-textarea"
                      rows={3}
                      placeholder="Enter question text clearly..."
                      value={formPrompt}
                      onChange={(e) => setFormPrompt(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Choices & Answer Key *</label>
                    <div className="choices-stack">
                      {['A', 'B', 'C', 'D'].map((letter, idx) => (
                        <div
                          key={letter}
                          className={`choice-input-row ${formAnswer === idx ? 'is-selected' : ''}`}
                        >
                          <button
                            type="button"
                            className={`choice-key-indicator ${formAnswer === idx ? 'is-correct' : ''}`}
                            onClick={() => setFormAnswer(idx)}
                          >
                            {formAnswer === idx ? (
                              <CheckIcon width="16" height="16" />
                            ) : (
                              <span>{letter}</span>
                            )}
                          </button>
                          <input
                            type="text"
                            className="field-input choice-text"
                            placeholder={`Option ${letter}...`}
                            value={formChoices[idx]}
                            onChange={(e) => {
                              const next = [...formChoices]
                              next[idx] = e.target.value
                              setFormChoices(next)
                            }}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="drawer-q-exp">Explanation</label>
                    <textarea
                      id="drawer-q-exp"
                      className="field-textarea"
                      rows={3}
                      placeholder="Cite constitutional article, historical context, or solution..."
                      value={formExplanation}
                      onChange={(e) => setFormExplanation(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="drawer-footer">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setIsAddDrawerOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving Draft…' : 'Submit Question Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
