import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  BarChartIcon,
  BookIcon,
  CheckCircleIcon,
  CloseIcon,
  DownloadIcon,
  EditIcon,
  FileTextIcon,
  LockIcon,
  MoonIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SunIcon,
  TargetIcon,
  TrashIcon,
  UploadIcon,
  UserPlusIcon,
  UsersIcon,
  ZapIcon,
} from '../components/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useContent } from '../content/contentContext.js'
import { invalidateCurriculumCache } from '../data/curriculum.js'
import {
  createStaffAccount,
  deleteStaffProfile,
  fetchPaginatedQuestionsFromSupabase,
  fetchProfilesList,
  isSupabaseConfigured,
  supabase,
  updateProfileRole,
} from '../lib/supabase.js'
import { parsePdfInBrowser, parsePlainTextQuestions } from '../lib/browserPdfParser.js'
import { exportQuestionsToCsv, parseCsvQuestions } from '../lib/csvHelper.js'
import {
  BLUEPRINT_PRESETS,
  classifyQuestionSubject,
  generateBalancedPaper,
} from '../lib/paperGenerator.js'
import { backupManager } from '../storage/backupManager.js'
import { contentStore } from '../storage/contentStore.js'
import { settingsStore, THEMES } from '../storage/settingsStore.js'
import './AdminScreen.css'

const EXAM_CHOICES = ['CSS', 'PMS', 'Custom']
const PAGE_SIZE = 50

const THEME_NAMES = {
  [THEMES.LIGHT]: 'Minimal Light',
  [THEMES.MIDNIGHT]: 'Midnight Slate',
  [THEMES.IVORY]: 'Warm Ivory',
  [THEMES.OLED]: 'OLED Console',
  dark: 'Midnight Slate',
  sepia: 'Warm Ivory',
}

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
    full_name: 'Zainab Qureshi (Abilities Contributor)',
    role: 'contributor',
    assigned_categories: ['general-abilities', 'english'],
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
]

const BLANK_QUESTION = {
  prompt: '',
  directive: '',
  statements: '',
  closing: '',
  choices: ['', '', '', ''],
  answer: 0,
  explanation: '',
}

export default function AdminScreen() {
  const { categories, customQuestions, refresh, tracks } = useContent()
  const {
    role,
    setDevRole,
    canAddQuestion,
    canEditQuestion,
    canDeleteQuestion,
    user,
    profile,
    loading: authLoading,
    signIn,
    signOut,
  } = useAuth()

  // Live Supabase Telemetry state
  const [telemetry, setTelemetry] = useState({
    totalUsers: null,
    totalCompletions: null,
    cloudQuestions: null,
    connected: isSupabaseConfigured(),
    loading: false,
  })

  // Isolated Admin Login State
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const [isDevLoggedIn, setIsDevLoggedIn] = useState(() => {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('mpt_dev_logged_in') === 'true'
  })

  // User Management State (RBAC Provisioning)
  const [usersList, setUsersList] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false)
  const [provisionForm, setProvisionForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'contributor',
    assignedCategories: [],
  })
  const [provisionLoading, setProvisionLoading] = useState(false)
  const [provisionError, setProvisionError] = useState(null)

  // Fetch live Supabase telemetry
  useEffect(() => {
    let mounted = true
    async function fetchTelemetry() {
      if (!isSupabaseConfigured()) return
      setTelemetry((prev) => ({ ...prev, loading: true }))
      try {
        const [profilesRes, progressRes, questionsRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('user_progress').select('id', { count: 'exact', head: true }),
          supabase.from('questions').select('id', { count: 'exact', head: true }),
        ])
        if (mounted) {
          setTelemetry({
            totalUsers: profilesRes.count ?? 0,
            totalCompletions: progressRes.count ?? 0,
            cloudQuestions: questionsRes.count ?? 0,
            connected: true,
            loading: false,
          })
        }
      } catch (err) {
        console.warn('Supabase telemetry fetch notice:', err)
        if (mounted) setTelemetry((prev) => ({ ...prev, loading: false }))
      }
    }
    fetchTelemetry()
    return () => {
      mounted = false
    }
  }, [])

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'questions' | 'tracks' | 'generator' | 'audit' | 'import-export' | 'users'
  const currentTab = role !== 'admin' && activeTab === 'users' ? 'overview' : activeTab

  // Load team profiles when User Management tab is opened
  useEffect(() => {
    let mounted = true
    async function loadUsers() {
      if (currentTab === 'users' && role === 'admin') {
        setUsersLoading(true)
        try {
          if (isSupabaseConfigured()) {
            const list = await fetchProfilesList()
            if (mounted) {
              setUsersList(list.length > 0 ? list : DEFAULT_DEV_USERS)
            }
          } else {
            if (mounted && usersList.length === 0) {
              setUsersList(DEFAULT_DEV_USERS)
            }
          }
        } catch (err) {
          console.warn('Error fetching profiles:', err)
          if (mounted && usersList.length === 0) {
            setUsersList(DEFAULT_DEV_USERS)
          }
        } finally {
          if (mounted) setUsersLoading(false)
        }
      }
    }
    loadUsers()
    return () => {
      mounted = false
    }
  }, [currentTab, role, usersList.length])

  // Question Management state with Server-Side Pagination & 300ms Debounce
  const [questionSearch, setQuestionSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterExam, setFilterExam] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterQuality, setFilterQuality] = useState('all') // 'all' | 'needs-key' | 'missing-exp'
  const [page, setPage] = useState(1)
  const [paginatedQuestions, setPaginatedQuestions] = useState([])
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [questionForm, setQuestionForm] = useState(BLANK_QUESTION)
  const [targetCategory, setTargetCategory] = useState(categories[0]?.id || '')

  // 300ms Search Debounce to prevent UI freezing & wasteful requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(questionSearch)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [questionSearch])

  // Category creation modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryForm, setCategoryForm] = useState({ title: '', tagline: '', exam: 'Custom' })

  // Paper Generator state
  const [selectedBlueprint, setSelectedBlueprint] = useState(BLUEPRINT_PRESETS[0])
  const [generatedPaper, setGeneratedPaper] = useState(null)

  // Quality Auditor state
  const [auditResults, setAuditResults] = useState(null)

  // Batch import text state
  const [batchText, setBatchText] = useState('')
  const [isParsingPdf, setIsParsingPdf] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)

  // Console Lock & Modern 4-Theme Switching
  const [currentTheme, setCurrentTheme] = useState(() => settingsStore.load().theme)
  const [isConsoleLocked, setIsConsoleLocked] = useState(false)

  const fileRef = useRef(null)
  const csvFileRef = useRef(null)
  const pdfRef = useRef(null)

  const handleCycleTheme = () => {
    const current = settingsStore.load()
    let next = THEMES.MIDNIGHT
    if (current.theme === THEMES.LIGHT) next = THEMES.MIDNIGHT
    else if (current.theme === THEMES.MIDNIGHT || current.theme === 'dark') next = THEMES.IVORY
    else if (current.theme === THEMES.IVORY || current.theme === 'sepia') next = THEMES.OLED
    else if (current.theme === THEMES.OLED) next = THEMES.LIGHT
    else next = THEMES.LIGHT

    const updated = { ...current, theme: next }
    settingsStore.save(updated)
    setCurrentTheme(next)
  }

  // Handle staff login
  const handleStaffLogin = async (e) => {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)

    try {
      if (isSupabaseConfigured()) {
        const res = await signIn(loginEmail.trim(), loginPassword)
        if (res.error) {
          setLoginError(res.error.message || 'Invalid credentials for staff portal.')
        } else {
          notify('Authenticated successfully.')
        }
      } else {
        // Offline / dev login
        setIsDevLoggedIn(true)
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('mpt_dev_logged_in', 'true')
        }
        notify(`Logged in as dev role: ${role.toUpperCase()}`)
      }
    } catch (err) {
      setLoginError(err.message || 'Authentication failed.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleDevLogin = (targetRole) => {
    setDevRole(targetRole)
    setIsDevLoggedIn(true)
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('mpt_dev_logged_in', 'true')
    }
    notify(`Entered Examiner Studio as '${targetRole.toUpperCase()}'.`)
  }

  const handleSignOutOrLock = async () => {
    if (isSupabaseConfigured()) {
      await signOut()
    }
    setIsDevLoggedIn(false)
    setIsConsoleLocked(true)
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('mpt_dev_logged_in')
    }
  }

  // Provisioning new team members
  const handleProvisionSubmit = async (e) => {
    e.preventDefault()
    setProvisionError(null)
    setProvisionLoading(true)

    try {
      const res = await createStaffAccount({
        email: provisionForm.email.trim(),
        password: provisionForm.password,
        fullName: provisionForm.fullName.trim(),
        role: provisionForm.role,
        assignedCategories: provisionForm.assignedCategories,
      })

      if (res.error) {
        setProvisionError(res.error.message)
        return
      }

      const newMember = {
        id: res.data?.id || `user-${Date.now()}`,
        email: provisionForm.email.trim(),
        full_name: provisionForm.fullName.trim() || provisionForm.email.split('@')[0],
        role: provisionForm.role,
        assigned_categories: provisionForm.assignedCategories,
        created_at: new Date().toISOString(),
      }

      setUsersList((prev) => [newMember, ...prev])
      setIsProvisionModalOpen(false)
      setProvisionForm({
        fullName: '',
        email: '',
        password: '',
        role: 'contributor',
        assignedCategories: [],
      })
      notify(`Account created for ${newMember.email} with role '${newMember.role.toUpperCase()}'.`)
    } catch (err) {
      setProvisionError(err.message || 'Failed to provision team member.')
    } finally {
      setProvisionLoading(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateProfileRole(userId, newRole)
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      )
      notify(`Updated user role to '${newRole.toUpperCase()}'.`)
    } catch (err) {
      setError(`Failed to update role: ${err.message}`)
    }
  }

  const handleRevokeUser = async (userId, userEmail) => {
    if (!window.confirm(`Revoke staff credentials for "${userEmail}" permanently?`)) return
    try {
      await deleteStaffProfile(userId)
      setUsersList((prev) => prev.filter((u) => u.id !== userId))
      notify(`Staff access revoked for ${userEmail}.`)
    } catch (err) {
      setError(`Failed to revoke user: ${err.message}`)
    }
  }

  // Filtered staff users for User Management table
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchSearch =
        !userSearch.trim() ||
        (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter
      return matchSearch && matchRole
    })
  }, [usersList, userSearch, userRoleFilter])

  // Categories available to current active user based on RBAC clearance
  const availableCategoriesForUser = useMemo(() => {
    if (role === 'admin' || role === 'editor') return categories
    if (role === 'contributor') {
      const assigned = profile?.assigned_categories || []
      if (assigned.length === 0) return categories
      return categories.filter((c) => assigned.includes(c.id))
    }
    return categories
  }, [categories, role, profile])

  const notify = (msg) => {
    setError(null)
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 4000)
  }

  // Compile all questions across all tracks for unified administrative search
  const allSystemQuestions = useMemo(() => {
    const list = []
    for (const track of tracks) {
      for (const unit of track.units || []) {
        for (const lesson of unit.lessons || []) {
          for (const q of lesson.questions || []) {
            if (q && q.prompt) {
              list.push({
                ...q,
                _trackTitle: track.title,
                _exam: track.exam,
                _unitTitle: unit.title,
                _isCustom: track.id.startsWith('custom:'),
                _subject: classifyQuestionSubject(q, track.title, unit.title),
              })
            }
          }
        }
      }
    }
    return list
  }, [tracks])

  // System overview KPIs
  const stats = useMemo(() => {
    const total = allSystemQuestions.length
    const withKey = allSystemQuestions.filter((q) => Number.isInteger(q.answer) && q.answer >= 0).length
    const withExp = allSystemQuestions.filter((q) => q.explanation && q.explanation.trim().length > 0).length
    const keyless = total - withKey
    const customCount = customQuestions.length

    // Subject breakdown
    const subjectMap = {}
    for (const q of allSystemQuestions) {
      const sub = q._subject || 'General Knowledge'
      subjectMap[sub] = (subjectMap[sub] || 0) + 1
    }

    // Commission breakdown
    const examMap = {}
    for (const q of allSystemQuestions) {
      const ex = q._exam || 'Other'
      examMap[ex] = (examMap[ex] || 0) + 1
    }

    return {
      total,
      withKey,
      keyless,
      withExp,
      customCount,
      tracksCount: tracks.length,
      categoriesCount: categories.length,
      healthPercent: total > 0 ? Math.round((withKey / total) * 100) : 100,
      subjectBreakdown: Object.entries(subjectMap).sort((a, b) => b[1] - a[1]),
      examBreakdown: Object.entries(examMap),
    }
  }, [allSystemQuestions, customQuestions, tracks, categories])

  // Server-Side Paginated Question Fetching (Max 50 items per page with .range(from, to))
  const loadQuestions = useCallback(async () => {
    setQuestionsLoading(true)
    try {
      if (isSupabaseConfigured()) {
        const res = await fetchPaginatedQuestionsFromSupabase({
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          categoryId: filterCategory,
          exam: filterExam,
          quality: filterQuality,
        })
        if (res) {
          setPaginatedQuestions(res.questions)
          setTotalQuestionsCount(res.totalCount)
          return
        }
      }

      // Offline / Local Sandbox Fallback: paginate in-memory questions by 50 items
      let filtered = allSystemQuestions
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase()
        filtered = filtered.filter((q) => {
          const matchPrompt = q.prompt && q.prompt.toLowerCase().includes(query)
          const matchChoices = (q.choices || []).some((c) => c && c.toLowerCase().includes(query))
          const matchExp = q.explanation && q.explanation.toLowerCase().includes(query)
          return matchPrompt || matchChoices || matchExp
        })
      }

      if (filterExam !== 'all') {
        filtered = filtered.filter((q) => q._exam === filterExam)
      }

      if (filterCategory !== 'all') {
        filtered = filtered.filter(
          (q) => q._unitTitle === filterCategory || q.categoryId === filterCategory,
        )
      }

      if (filterQuality === 'needs-key') {
        filtered = filtered.filter(
          (q) => !Number.isInteger(q.answer) || q.answer < 0,
        )
      } else if (filterQuality === 'missing-exp') {
        filtered = filtered.filter((q) => !q.explanation || !q.explanation.trim())
      }

      setTotalQuestionsCount(filtered.length)
      const from = (page - 1) * PAGE_SIZE
      setPaginatedQuestions(filtered.slice(from, from + PAGE_SIZE))
    } catch (err) {
      console.warn('Error loading paginated questions:', err)
    } finally {
      setQuestionsLoading(false)
    }
  }, [page, debouncedSearch, filterCategory, filterExam, filterQuality, allSystemQuestions])

  useEffect(() => {
    if (currentTab === 'questions') {
      loadQuestions()
    }
  }, [loadQuestions, currentTab])

  const totalPages = Math.max(1, Math.ceil(totalQuestionsCount / PAGE_SIZE))

  // Comprehensive Quality Auditor
  const handleRunAudit = () => {
    const issues = []
    let validCount = 0

    allSystemQuestions.forEach((q, idx) => {
      let hasIssue = false
      const choices = (q.choices || []).filter(Boolean)

      // Check missing key
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= choices.length) {
        issues.push({
          id: q.id || `audit-${idx}`,
          question: q,
          type: 'missing-key',
          severity: 'high',
          message: 'Question has no valid answer key assigned.',
        })
        hasIssue = true
      }

      // Check choices count
      if (choices.length < 2) {
        issues.push({
          id: q.id || `audit-${idx}`,
          question: q,
          type: 'few-choices',
          severity: 'high',
          message: `Only ${choices.length} options provided. At least 2 are required.`,
        })
        hasIssue = true
      }

      // Check duplicate choices
      const uniqueChoices = new Set(choices.map((c) => c.toLowerCase()))
      if (uniqueChoices.size < choices.length) {
        issues.push({
          id: q.id || `audit-${idx}`,
          question: q,
          type: 'duplicate-choices',
          severity: 'medium',
          message: 'Question has two or more identical options.',
        })
        hasIssue = true
      }

      // Check missing explanation
      if (!q.explanation || q.explanation.trim().length === 0) {
        issues.push({
          id: q.id || `audit-${idx}`,
          question: q,
          type: 'missing-exp',
          severity: 'low',
          message: 'Question lacks an explanation for student feedback.',
        })
        hasIssue = true
      }

      if (!hasIssue) validCount++
    })

    const healthScore = allSystemQuestions.length > 0
      ? Math.round((validCount / allSystemQuestions.length) * 100)
      : 100

    setAuditResults({
      scannedCount: allSystemQuestions.length,
      validCount,
      healthScore,
      issues,
      auditedAt: new Date().toLocaleTimeString(),
    })
    notify('Quality audit completed.')
  }

  // Question modal handlers
  const handleOpenNewQuestion = () => {
    setEditingItem(null)
    setQuestionForm(BLANK_QUESTION)
    if (availableCategoriesForUser.length > 0 && !availableCategoriesForUser.some((c) => c.id === targetCategory)) {
      setTargetCategory(availableCategoriesForUser[0].id)
    }
    setIsEditorOpen(true)
  }

  const handleEditQuestion = (item) => {
    setEditingItem(item)
    setQuestionForm({
      prompt: item.prompt || '',
      directive: item.directive || '',
      statements: (item.statements || []).join('\n'),
      closing: item.closing || '',
      choices: [...(item.choices || []), '', '', '', ''].slice(0, Math.max(4, item.choices?.length || 4)),
      answer: Number.isInteger(item.answer) ? item.answer : 0,
      explanation: item.explanation || '',
    })
    if (item.categoryId) {
      setTargetCategory(item.categoryId)
    }
    setIsEditorOpen(true)
  }

  const handleSaveQuestion = async (e) => {
    e.preventDefault()

    // RBAC Permissions check
    if (!editingItem && !canAddQuestion(targetCategory)) {
      setError(`Permission Denied: Role '${role}' is not authorized to create questions in this category.`)
      return
    }
    if (editingItem && !canEditQuestion(editingItem)) {
      setError(`Permission Denied: Role '${role}' cannot edit questions. Requires Editor or Admin role.`)
      return
    }

    if (!questionForm.prompt.trim()) {
      setError('Question prompt cannot be empty.')
      return
    }

    const filledChoices = questionForm.choices.map((c) => c.trim()).filter(Boolean)
    if (filledChoices.length < 2) {
      setError('Please provide at least two valid options.')
      return
    }

    if (questionForm.answer < 0 || questionForm.answer >= filledChoices.length) {
      setError('Please select a valid correct answer option.')
      return
    }

    // Ensure we have a target custom category
    let catId = targetCategory
    if (!catId) {
      if (categories.length > 0) {
        catId = categories[0].id
      } else {
        const newCat = await contentStore.saveCategory({
          title: 'Custom Question Bank',
          tagline: 'Authored Questions',
          exam: 'Custom',
        })
        catId = newCat.id
      }
    }

    const qId = editingItem ? editingItem.id : `question:${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const statementList = questionForm.statements
      ? questionForm.statements.split('\n').map((s) => s.trim()).filter(Boolean)
      : undefined

    // 1. Cloud-sync to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { error: sbErr } = await supabase.from('questions').upsert({
          id: qId,
          category_id: catId,
          prompt: questionForm.prompt.trim(),
          directive: questionForm.directive.trim() || null,
          statements: statementList || null,
          closing: questionForm.closing.trim() || null,
          choices: filledChoices,
          answer: questionForm.answer,
          explanation: questionForm.explanation.trim() || null,
          display_order: Date.now(),
          is_reviewed: true,
        })
        if (sbErr) {
          console.warn('Supabase upsert warning:', sbErr.message)
        } else {
          invalidateCurriculumCache()
        }
      } catch (err) {
        console.warn('Network error saving to Supabase:', err)
      }
    }

    // 2. Also save to local contentStore for instant reactivity
    await contentStore.saveQuestion({
      id: qId,
      categoryId: catId,
      prompt: questionForm.prompt.trim(),
      directive: questionForm.directive.trim() || undefined,
      statements: statementList,
      closing: questionForm.closing.trim() || undefined,
      choices: filledChoices,
      answer: questionForm.answer,
      explanation: questionForm.explanation.trim() || undefined,
      order: Date.now(),
    })

    await refresh()
    await loadQuestions()
    setIsEditorOpen(false)
    notify(editingItem ? 'Question updated successfully.' : 'New question saved successfully.')
  }

  const handleDeleteQuestion = async (item) => {
    // RBAC Permissions check
    if (!canDeleteQuestion(item)) {
      setError(`Permission Denied: Role '${role}' cannot delete questions. Requires Reviewer or Admin role.`)
      return
    }

    if (!window.confirm('Delete this question permanently from database?')) return

    // 1. Delete from Supabase if configured
    if (isSupabaseConfigured() && item.id) {
      try {
        const { error: sbErr } = await supabase.from('questions').delete().eq('id', item.id)
        if (sbErr) {
          console.warn('Supabase deletion error:', sbErr.message)
        } else {
          invalidateCurriculumCache()
        }
      } catch (err) {
        console.warn('Network error deleting from Supabase:', err)
      }
    }

    // 2. Delete from local contentStore if present
    if (item._isCustom) {
      await contentStore.deleteQuestion(item.id)
    }

    await refresh()
    await loadQuestions()
    notify('Question deleted permanently.')
  }

  // Create category handler
  const handleSaveCategory = async (e) => {
    e.preventDefault()
    if (!categoryForm.title.trim()) {
      setError('Please enter a category title.')
      return
    }
    const hue = Math.round(Math.random() * 360)
    const saved = await contentStore.saveCategory({ ...categoryForm, hue })
    await refresh()
    setTargetCategory(saved.id)
    setIsCategoryModalOpen(false)
    setCategoryForm({ title: '', tagline: '', exam: 'Custom' })
    notify(`Created exam track category "${saved.title}".`)
  }

  // Generator handler
  const handleGeneratePaper = () => {
    const paper = generateBalancedPaper(tracks, selectedBlueprint)
    setGeneratedPaper(paper)
    notify(`Generated balanced paper: ${paper.questions.length} MCQs.`)
  }

  const handleSaveGeneratedPaperAsTrack = async () => {
    if (!generatedPaper) return
    const cat = await contentStore.saveCategory({
      title: `${selectedBlueprint.title} (Mock ${new Date().toLocaleDateString()})`,
      tagline: `Full Mock Paper · ${generatedPaper.questions.length} MCQs · ${generatedPaper.durationMinutes}m`,
      exam: selectedBlueprint.exam || 'Custom',
      hue: 210,
    })

    for (let i = 0; i < generatedPaper.questions.length; i++) {
      const q = generatedPaper.questions[i]
      await contentStore.saveQuestion({
        prompt: q.prompt,
        directive: q.directive,
        statements: q.statements,
        closing: q.closing,
        choices: q.choices,
        answer: q.answer,
        explanation: q.explanation,
        categoryId: cat.id,
        order: i,
      })
    }

    await refresh()
    notify(`Saved mock paper as custom category "${cat.title}".`)
  }

  const handlePrintPaper = () => {
    window.print()
  }

  // Import / Export handlers
  const handleExportFullBackup = async () => {
    const json = await backupManager.exportFullBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mpt-ai-examiner-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    notify('Full system backup exported.')
  }

  const handleImportJsonFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    try {
      const parsed = JSON.parse(text)
      if (parsed.version && parsed.data) {
        // It's a full backup
        await backupManager.restoreBackup(text)
        await refresh()
        notify('System backup restored successfully.')
      } else if (parsed.category && Array.isArray(parsed.questions)) {
        // It's a single track export
        const category = await contentStore.saveCategory(parsed.category)
        for (const item of parsed.questions) {
          await contentStore.saveQuestion({ ...item, categoryId: category.id })
        }
        await refresh()
        notify(`Imported track "${category.title}" with ${parsed.questions.length} questions.`)
      } else {
        setError('Unrecognized JSON format. Must be an MPT-AI backup or track export.')
      }
    } catch (err) {
      setError(`JSON parse failed: ${err.message}`)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleExportCsvQuestions = () => {
    const questionsToExport = paginatedQuestions.length > 0 ? paginatedQuestions : allSystemQuestions
    const csvContent = exportQuestionsToCsv(questionsToExport)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mpt-ai-questions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notify(`Exported ${questionsToExport.length} questions to CSV.`)
  }

  const handleImportCsvFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    try {
      const parsed = parseCsvQuestions(text)
      if (parsed.length === 0) {
        setError('No valid questions found in CSV file. Check format header.')
        return
      }

      let catId = targetCategory || categories[0]?.id
      if (!catId) {
        const cat = await contentStore.saveCategory({
          title: 'CSV Imported Questions',
          tagline: `Imported on ${new Date().toLocaleDateString()}`,
          exam: 'Custom',
        })
        catId = cat.id
      }

      for (const item of parsed) {
        await contentStore.saveQuestion({ ...item, categoryId: catId })
      }
      await refresh()
      notify(`Imported ${parsed.length} questions from CSV successfully.`)
    } catch (err) {
      setError(`CSV import failed: ${err.message}`)
    } finally {
      if (csvFileRef.current) csvFileRef.current.value = ''
    }
  }

  const handleImportPdf = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsParsingPdf(true)
    setError(null)
    try {
      const parsed = await parsePdfInBrowser(file)
      if (parsed.length === 0) {
        setError('No MCQs could be extracted from PDF. Check format: "1. Prompt \\n A) Opt1 \\n B) Opt2 \\n Answer: A"')
        return
      }

      let catId = targetCategory || categories[0]?.id
      if (!catId) {
        const cat = await contentStore.saveCategory({
          title: file.name.replace(/\.pdf$/i, ''),
          tagline: `PDF Extracted on ${new Date().toLocaleDateString()}`,
          exam: 'Custom',
        })
        catId = cat.id
      }

      for (const item of parsed) {
        await contentStore.saveQuestion({ ...item, categoryId: catId })
      }
      await refresh()
      notify(`Extracted ${parsed.length} MCQs from PDF and saved to category.`)
    } catch (err) {
      setError(`PDF parse failed: ${err.message}`)
    } finally {
      setIsParsingPdf(false)
      if (pdfRef.current) pdfRef.current.value = ''
    }
  }

  const handleExportCategoryJson = async () => {
    const cat = categories.find((c) => c.id === targetCategory) || categories[0]
    if (!cat) {
      setError('Please select a category to export.')
      return
    }
    const catQuestions = customQuestions.filter((q) => q.categoryId === cat.id)
    const exportData = {
      category: cat,
      questions: catQuestions,
      exportedAt: new Date().toISOString(),
      format: 'mpt-ai-track-v1',
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${cat.title.toLowerCase().replace(/\s+/g, '-')}-questions.json`
    a.click()
    URL.revokeObjectURL(url)
    notify(`Exported standard JSON for "${cat.title}".`)
  }

  const handleImportTextBatch = async () => {
    if (!batchText.trim()) return
    const parsed = parsePlainTextQuestions(batchText)
    if (parsed.length === 0) {
      setError('Could not parse text. Ensure format: "1. Prompt \\n A) Opt1 \\n B) Opt2 \\n Answer: A"')
      return
    }

    let catId = targetCategory || categories[0]?.id
    if (!catId) {
      const cat = await contentStore.saveCategory({
        title: 'Batch Imported MCQs',
        tagline: 'Plain text import',
        exam: 'Custom',
      })
      catId = cat.id
    }

    for (const item of parsed) {
      await contentStore.saveQuestion({ ...item, categoryId: catId })
    }
    await refresh()
    setBatchText('')
    notify(`Parsed and added ${parsed.length} questions.`)
  }

  // Security Gate: Protect /admin with isolated staff login screen
  const isSupabase = isSupabaseConfigured()
  const isStaff = ['admin', 'editor', 'reviewer', 'contributor'].includes(role)

  if (authLoading) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card" style={{ textAlign: 'center' }}>
          <div className="admin-login-badge" style={{ margin: '0 auto 1.25rem' }}>
            <ShieldCheckIcon width="36" height="36" />
          </div>
          <h2>Verifying Credentials…</h2>
          <p>Connecting to Examiner Authentication gateway.</p>
        </div>
      </div>
    )
  }

  if (isSupabase) {
    if (!user) {
      return (
        <div className="admin-login-screen">
          <div className="admin-login-card">
            <div className="admin-login-header">
              <div className="admin-login-badge">
                <ShieldCheckIcon width="36" height="36" />
              </div>
              <h2>Examiner Studio · Staff Portal</h2>
              <p>Restricted administrative access. Authenticate with staff credentials.</p>
            </div>

            {loginError && <div className="admin-banner admin-banner--error">{loginError}</div>}

            <form onSubmit={handleStaffLogin} className="admin-login-form">
              <div className="admin-login-field">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="examiner@mpt-ai.org"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value)
                    setLoginError(null)
                  }}
                  className="admin-login-input"
                />
              </div>

              <div className="admin-login-field">
                <label>Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value)
                    setLoginError(null)
                  }}
                  className="admin-login-input"
                />
              </div>

              <button
                type="submit"
                className="btn btn--primary admin-login-btn"
                disabled={loginLoading}
              >
                {loginLoading ? 'Authenticating Staff…' : 'Sign In to Examiner Studio'}
              </button>
            </form>

            <Link to="/" className="btn btn--ghost btn--small" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              ← Return to Candidate Application
            </Link>
          </div>
        </div>
      )
    }

    if (!isStaff) {
      return (
        <div className="admin-login-screen">
          <div className="admin-login-card" style={{ textAlign: 'center' }}>
            <div className="admin-login-badge" style={{ margin: '0 auto 1.25rem' }}>
              <LockIcon width="36" height="36" />
            </div>
            <h2>Access Restricted</h2>
            <p>
              Signed in as <strong>{user.email}</strong>. Your account does not have staff permissions (Admin, Editor, Reviewer, Contributor).
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
              Please contact the system administrator to provision examiner access for your account.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn--primary" onClick={signOut}>
                Sign Out
              </button>
              <Link to="/" className="btn btn--ghost btn--small">
                ← Return to Candidate Application
              </Link>
            </div>
          </div>
        </div>
      )
    }
  } else {
    // Offline / Local Development environment
    if (!isDevLoggedIn || isConsoleLocked) {
      return (
        <div className="admin-login-screen">
          <div className="admin-login-card">
            <div className="admin-login-header">
              <div className="admin-login-badge">
                <ShieldCheckIcon width="36" height="36" />
              </div>
              <h2>Examiner Studio · Staff Portal</h2>
              <p>Restricted administrative access. Authenticate with staff credentials.</p>
            </div>

            {loginError && <div className="admin-banner admin-banner--error">{loginError}</div>}

            <form onSubmit={handleStaffLogin} className="admin-login-form">
              <div className="admin-login-field">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="admin@mpt-ai.internal"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value)
                    setLoginError(null)
                  }}
                  className="admin-login-input"
                />
              </div>

              <div className="admin-login-field">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value)
                    setLoginError(null)
                  }}
                  className="admin-login-input"
                />
              </div>

              <button
                type="submit"
                className="btn btn--primary admin-login-btn"
                disabled={loginLoading}
              >
                Sign In to Examiner Studio
              </button>
            </form>

            <div className="admin-dev-notice-box">
              <div className="admin-dev-notice-header">Offline Dev Environment</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0 0 0.75rem' }}>
                Supabase credentials not configured in .env. Select a role below for instant preview:
              </p>
              <div className="admin-dev-role-grid">
                <button
                  type="button"
                  className="admin-dev-role-btn"
                  onClick={() => handleDevLogin('admin')}
                >
                  Enter as Admin
                </button>
                <button
                  type="button"
                  className="admin-dev-role-btn"
                  onClick={() => handleDevLogin('editor')}
                >
                  Enter as Editor
                </button>
                <button
                  type="button"
                  className="admin-dev-role-btn"
                  onClick={() => handleDevLogin('reviewer')}
                >
                  Enter as Reviewer
                </button>
                <button
                  type="button"
                  className="admin-dev-role-btn"
                  onClick={() => handleDevLogin('contributor')}
                >
                  Enter as Contributor
                </button>
              </div>
            </div>

            <Link to="/" className="btn btn--ghost btn--small" style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              ← Return to Candidate Application
            </Link>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="admin-layout">
      {/* Mobile Header Bar (< 1024px) */}
      <header className="admin-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle Navigation Menu"
          >
            <BookIcon width="18" height="18" />
          </button>
          <span style={{ fontWeight: 800, fontSize: '0.92rem' }}>MPT·AI Studio</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="icon-btn"
            onClick={handleCycleTheme}
            title={`Theme: ${THEME_NAMES[currentTheme] || currentTheme}. Click to cycle.`}
          >
            {currentTheme === 'light' || currentTheme === 'ivory' || currentTheme === 'sepia' ? (
              <SunIcon width="16" height="16" />
            ) : (
              <MoonIcon width="16" height="16" />
            )}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={handleSignOutOrLock}
            title="Lock Studio / Sign Out"
          >
            <LockIcon width="16" height="16" />
          </button>
        </div>
      </header>

      {/* Left-Hand Sidebar (Modern SaaS Layout) */}
      {mobileMenuOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${mobileMenuOpen ? 'is-open' : ''}`}>
        {/* Sidebar Brand Header */}
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__brand">
            <div className="admin-sidebar__badge">
              <ShieldCheckIcon width="20" height="20" />
            </div>
            <div className="admin-sidebar__title-text">
              <h1>MPT·AI Studio</h1>
              <p>Examiner Console</p>
            </div>
          </div>

          <div className={`admin-cloud-pill ${telemetry.connected ? 'is-connected' : 'is-offline'}`}>
            <span className="cloud-pulse-dot" />
            <span>{telemetry.connected ? 'Cloud Database Connected' : 'Local Offline Sandbox'}</span>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="admin-sidebar__nav" role="tablist" aria-label="Admin Sections">
          <div className="admin-nav-group-label">Core Management</div>
          <button
            type="button"
            className={`admin-nav-item ${currentTab === 'overview' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('overview')
              setMobileMenuOpen(false)
            }}
          >
            <span className="admin-nav-item__left">
              <BarChartIcon width="16" height="16" />
              <span>Overview (Stats)</span>
            </span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${currentTab === 'questions' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('questions')
              setMobileMenuOpen(false)
            }}
          >
            <span className="admin-nav-item__left">
              <BookIcon width="16" height="16" />
              <span>Manage Questions</span>
            </span>
            <span className="admin-nav-badge">{totalQuestionsCount || stats.total}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${currentTab === 'tracks' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('tracks')
              setMobileMenuOpen(false)
            }}
          >
            <span className="admin-nav-item__left">
              <TargetIcon width="16" height="16" />
              <span>Categories & Tracks</span>
            </span>
            <span className="admin-nav-badge">{tracks.length}</span>
          </button>

          <div className="admin-nav-group-label">Examiner Tools</div>
          <button
            type="button"
            className={`admin-nav-item ${currentTab === 'generator' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('generator')
              setMobileMenuOpen(false)
            }}
          >
            <span className="admin-nav-item__left">
              <ZapIcon width="16" height="16" />
              <span>Paper Generator</span>
            </span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${currentTab === 'audit' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('audit')
              setMobileMenuOpen(false)
            }}
          >
            <span className="admin-nav-item__left">
              <ShieldCheckIcon width="16" height="16" />
              <span>Quality Audit</span>
            </span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${currentTab === 'import-export' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('import-export')
              setMobileMenuOpen(false)
            }}
          >
            <span className="admin-nav-item__left">
              <UploadIcon width="16" height="16" />
              <span>Import & Export</span>
            </span>
          </button>

          {role === 'admin' && (
            <>
              <div className="admin-nav-group-label">Administration</div>
              <button
                type="button"
                className={`admin-nav-item ${currentTab === 'users' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab('users')
                  setMobileMenuOpen(false)
                }}
              >
                <span className="admin-nav-item__left">
                  <UsersIcon width="16" height="16" />
                  <span>Team Management</span>
                </span>
                <span className="admin-nav-badge">{usersList.length}</span>
              </button>
            </>
          )}
        </nav>

        {/* Sidebar Footer User & Controls */}
        <div className="admin-sidebar__footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar">
              {(profile?.full_name || user?.email || role || 'A')[0].toUpperCase()}
            </div>
            <div className="admin-sidebar-user-info">
              <div className="admin-sidebar-user-name">
                {profile?.full_name || user?.email?.split('@')[0] || 'Staff Member'}
              </div>
              <span className="admin-sidebar-user-role">
                {role.toUpperCase()}
              </span>
            </div>
          </div>

          {/* RBAC Role Preview Switcher */}
          <div className="rbac-role-switcher" title="Switch active RBAC role to preview permissions">
            <span className="rbac-switcher-lbl">Preview:</span>
            {['admin', 'editor', 'reviewer', 'contributor'].map((r) => (
              <button
                key={r}
                type="button"
                className={`rbac-role-btn ${role === r ? 'is-active' : ''}`}
                onClick={() => {
                  setDevRole(r)
                  notify(`Switched preview role to '${r.toUpperCase()}'.`)
                }}
              >
                {r[0].toUpperCase()}
              </button>
            ))}
          </div>

          <div className="admin-sidebar-actions-row">
            <Link to="/" className="btn btn--small btn--ghost" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
              <ArrowLeftIcon width="14" height="14" />
              <span>Exit</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCycleTheme}
                title={`Theme: ${THEME_NAMES[currentTheme] || currentTheme}. Click to cycle.`}
              >
                {currentTheme === 'light' || currentTheme === 'ivory' || currentTheme === 'sepia' ? (
                  <SunIcon width="16" height="16" />
                ) : (
                  <MoonIcon width="16" height="16" />
                )}
              </button>

              <button
                type="button"
                className="icon-btn"
                onClick={handleSignOutOrLock}
                title="Lock Studio / Sign Out"
              >
                <LockIcon width="16" height="16" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar__title-group">
            <h2>
              {currentTab === 'overview' && 'System Overview & Stats'}
              {currentTab === 'questions' && 'Manage Questions'}
              {currentTab === 'tracks' && 'Categories & Syllabus Tracks'}
              {currentTab === 'generator' && 'Paper Generator'}
              {currentTab === 'audit' && 'Quality Assurance & Audit'}
              {currentTab === 'import-export' && 'Bulk Import & Export'}
              {currentTab === 'users' && 'Team Management & Roles'}
            </h2>
            <p>
              {currentTab === 'overview' && 'Curriculum metrics, answer key verification ratio, and database telemetry.'}
              {currentTab === 'questions' && 'Search, filter, author, and review question bank entries with server-side pagination.'}
              {currentTab === 'tracks' && 'Commission guidelines, syllabi blueprints, and course units.'}
              {currentTab === 'generator' && 'Generate balanced screening mock papers strictly according to syllabus.'}
              {currentTab === 'audit' && 'Automated verification against answer keys, duplicates, and explanations.'}
              {currentTab === 'import-export' && 'Extract past papers from PDF, Excel/CSV, and standard JSON formats.'}
              {currentTab === 'users' && 'Manage team roles, access clearance, and staff credentials.'}
            </p>
          </div>

          <div className="admin-topbar__actions">
            <button
              type="button"
              className={`btn btn--small btn--primary ${!canAddQuestion(targetCategory) ? 'btn--disabled' : ''}`}
              onClick={() => {
                if (canAddQuestion(targetCategory)) {
                  handleOpenNewQuestion()
                } else {
                  setError(`Role '${role}' cannot add questions. Contributor or Admin clearance required.`)
                }
              }}
              title={canAddQuestion(targetCategory) ? 'Add New Question' : `Role '${role}' cannot add questions`}
            >
              <PlusIcon width="16" height="16" />
              <span>Add New Question</span>
            </button>

            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => setIsCategoryModalOpen(true)}
            >
              <span>+ Add Track</span>
            </button>
          </div>
        </header>

        {/* Global Alerts */}
        {feedback && <div className="admin-banner admin-banner--success">{feedback}</div>}
        {error && <div className="admin-banner admin-banner--error">{error}</div>}

        {/* Tab 1: Overview & KPIs */}
        {currentTab === 'overview' && (
          <main className="admin-content">
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-label">Total Verified MCQs</span>
                <strong className="kpi-value">{stats.total}</strong>
                <span className="kpi-sub">
                  {telemetry.connected && telemetry.cloudQuestions !== null
                    ? `${telemetry.cloudQuestions} in Supabase cloud`
                    : `${stats.customCount} custom user authored`}
                </span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Registered Candidates</span>
                <strong className="kpi-value">
                  {telemetry.connected ? (telemetry.totalUsers ?? '—') : 'Local'}
                </strong>
                <span className="kpi-sub">
                  {telemetry.connected ? 'Active profiles in Supabase' : 'Offline sandbox'}
                </span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Completed Sessions</span>
                <strong className="kpi-value">
                  {telemetry.connected ? (telemetry.totalCompletions ?? '—') : stats.customCount}
                </strong>
                <span className="kpi-sub">
                  {telemetry.connected ? 'Database synchronized' : 'Local sessions'}
                </span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Exam Tracks Active</span>
                <strong className="kpi-value">{stats.tracksCount}</strong>
                <span className="kpi-sub">CSS, PMS, Compulsory & Custom</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Keyed Questions Ratio</span>
                <strong className="kpi-value">{stats.healthPercent}%</strong>
                <span className="kpi-sub">{stats.withKey} / {stats.total} verified answers</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Pedagogical Explanations</span>
                <strong className="kpi-value">{stats.withExp}</strong>
                <span className="kpi-sub">{Math.round((stats.withExp / (stats.total || 1)) * 100)}% coverage</span>
              </div>
            </div>

            <div className="admin-section-grid">
              {/* Subject Distribution */}
              <div className="admin-card">
                <h2 className="admin-card__title">Syllabus Subject Distribution</h2>
                <div className="subject-list">
                  {stats.subjectBreakdown.map(([sub, count]) => {
                    const pct = Math.round((count / (stats.total || 1)) * 100)
                    return (
                      <div key={sub} className="subject-row">
                        <div className="subject-row__header">
                          <span className="subject-name">{sub}</span>
                          <span className="subject-count"><strong>{count}</strong> ({pct}%)</span>
                        </div>
                        <div className="subject-bar">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Commission Breakdown & Quick Actions */}
              <div className="admin-card">
                <h2 className="admin-card__title">Exam Commission Coverage</h2>
                <div className="commission-grid">
                  {stats.examBreakdown.map(([exam, count]) => (
                    <div key={exam} className="commission-tile">
                      <span className="commission-name">{exam}</span>
                      <span className="commission-val">{count} MCQs</span>
                    </div>
                  ))}
                </div>

                <h2 className="admin-card__title" style={{ marginTop: '1.5rem' }}>Quick Studio Actions</h2>
                <div className="quick-actions-list">
                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={() => {
                      setActiveTab('questions')
                      setFilterQuality('needs-key')
                    }}
                  >
                    <span>Fix Questions Missing Key</span>
                    <span className="badge badge--warning">{stats.keyless}</span>
                  </button>

                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={() => {
                      setActiveTab('questions')
                      setFilterQuality('missing-exp')
                    }}
                  >
                    <span>Add Explanations</span>
                    <span className="badge badge--muted">{stats.total - stats.withExp}</span>
                  </button>

                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={() => setActiveTab('generator')}
                  >
                    <span>Generate Blueprint Paper</span>
                    <span>⚡</span>
                  </button>

                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={handleRunAudit}
                  >
                    <span>Run Complete Quality Audit</span>
                    <span>🛡️</span>
                  </button>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* Tab 2: Manage Questions (Server-Side Paginated with 300ms Debounced Search) */}
        {currentTab === 'questions' && (
          <main className="admin-content">
            <div className="admin-toolbar">
              <div className="admin-toolbar__search">
                <SearchIcon width="16" height="16" />
                <input
                  type="search"
                  placeholder="Search questions by prompt, choices, or explanation (300ms debounced)…"
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                />
                {questionSearch && (
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ padding: '0.2rem' }}
                    onClick={() => setQuestionSearch('')}
                    title="Clear search"
                  >
                    <CloseIcon width="14" height="14" />
                  </button>
                )}
              </div>

              <div className="admin-toolbar__filters">
                <select
                  value={filterExam}
                  onChange={(e) => {
                    setFilterExam(e.target.value)
                    setPage(1)
                  }}
                  className="admin-select"
                >
                  <option value="all">All Exams</option>
                  {EXAM_CHOICES.map((ex) => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value)
                    setPage(1)
                  }}
                  className="admin-select"
                >
                  <option value="all">All Subjects / Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.title}>{c.title}</option>
                  ))}
                </select>

                <select
                  value={filterQuality}
                  onChange={(e) => {
                    setFilterQuality(e.target.value)
                    setPage(1)
                  }}
                  className="admin-select"
                >
                  <option value="all">All Question Statuses</option>
                  <option value="needs-key">Missing Answer Key</option>
                  <option value="missing-exp">Missing Explanation</option>
                </select>

                <button
                  type="button"
                  className="btn btn--small btn--primary"
                  onClick={handleOpenNewQuestion}
                  disabled={!canAddQuestion(targetCategory)}
                  title={canAddQuestion(targetCategory) ? 'Add New Question' : `Role '${role}' cannot add questions`}
                >
                  <PlusIcon width="16" height="16" />
                  <span>Add New Question</span>
                </button>
              </div>
            </div>

            <div className="admin-results-meta">
              <span>
                {questionsLoading ? (
                  'Fetching questions from database…'
                ) : (
                  <>
                    Showing{' '}
                    <strong>
                      {totalQuestionsCount === 0
                        ? 0
                        : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalQuestionsCount)}`}
                    </strong>{' '}
                    of <strong>{totalQuestionsCount}</strong> questions (Max 50/page)
                  </>
                )}
              </span>

              {totalPages > 1 && (
                <div className="admin-pagination">
                  <button
                    type="button"
                    className="btn btn--small btn--ghost"
                    disabled={page === 1 || questionsLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="page-indicator">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn--small btn--ghost"
                    disabled={page >= totalPages || questionsLoading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <div className="admin-q-list">
              {questionsLoading ? (
                <div className="admin-empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                  <p>Loading questions from database…</p>
                </div>
              ) : paginatedQuestions.length === 0 ? (
                <div className="admin-empty-state">
                  <p>No questions matched your active search and filters.</p>
                </div>
              ) : (
                paginatedQuestions.map((item, idx) => {
                  const hasValidKey = Number.isInteger(item.answer) && item.answer >= 0
                  const hasExplanation = Boolean(item.explanation && item.explanation.trim())

                  return (
                    <div key={item.id || idx} className="admin-q-card">
                      <div className="admin-q-header">
                        <div className="admin-status-pills">
                          {hasValidKey ? (
                            <span className="status-pill status-pill--reviewed" title="Answer key assigned and ready">
                              <CheckCircleIcon width="13" height="13" />
                              <span>Reviewed</span>
                            </span>
                          ) : (
                            <span className="status-pill status-pill--error" title="Missing valid answer key">
                              <AlertTriangleIcon width="13" height="13" />
                              <span>Needs Answer Key</span>
                            </span>
                          )}

                          {!hasExplanation && (
                            <span className="status-pill status-pill--warning" title="No pedagogical explanation provided">
                              <AlertCircleIcon width="13" height="13" />
                              <span>Missing Explanation</span>
                            </span>
                          )}

                          <span className="status-pill status-pill--exam">{item._exam || 'CSS'}</span>
                          <span className="status-pill status-pill--subject">{item._subject || item._unitTitle || 'General'}</span>
                          {item._isCustom && <span className="status-pill status-pill--custom">Custom Authored</span>}
                        </div>

                        <div className="admin-q-actions">
                          {/* Edit Action: Restricted to Editor and Admin */}
                          {canEditQuestion(item) && (
                            <button
                              type="button"
                              className="btn btn--small btn--ghost"
                              onClick={() => handleEditQuestion(item)}
                              title="Edit Question in Slide-Out Drawer"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                            >
                              <EditIcon width="14" height="14" />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Delete Action: Restricted to Reviewer and Admin */}
                          {(item._isCustom || isSupabaseConfigured()) && canDeleteQuestion(item) && (
                            <button
                              type="button"
                              className="btn btn--small btn--ghost btn--danger"
                              onClick={() => handleDeleteQuestion(item)}
                              title="Delete Question"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                            >
                              <TrashIcon width="14" height="14" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="admin-q-prompt">{item.prompt}</p>

                      {item.directive && (
                        <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--muted)', margin: '0 0 0.5rem' }}>
                          Directive: {item.directive}
                        </p>
                      )}

                      <div className="admin-q-choices">
                        {(item.choices || []).map((choice, cIdx) => {
                          const isCorrect = item.answer === cIdx
                          const letter = String.fromCharCode(65 + cIdx)
                          return (
                            <div
                              key={cIdx}
                              className={`admin-choice-chip ${isCorrect ? 'is-correct' : ''}`}
                            >
                              <strong>{letter}:</strong> {choice}
                              {isCorrect && <span className="key-check">✓ Official Key</span>}
                            </div>
                          )
                        })}
                      </div>

                      {!hasValidKey && (
                        <div className="admin-q-warning">
                          ⚠️ Warning: Question does not have a verified answer key assigned!
                        </div>
                      )}

                      {item.explanation && (
                        <div className="admin-q-explanation">
                          <strong>Explanation:</strong> {item.explanation}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Bottom Pagination Bar */}
            {!questionsLoading && totalPages > 1 && (
              <div className="admin-pagination" style={{ marginTop: '2rem' }}>
                <button
                  type="button"
                  className="btn btn--small btn--ghost"
                  disabled={page === 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  Previous Page
                </button>
                <span className="page-indicator">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn--small btn--ghost"
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  Next Page
                </button>
              </div>
            )}
          </main>
        )}

      {/* Tab 3: Tracks & Blueprint Studio */}
      {currentTab === 'tracks' && (
        <main className="admin-content">
          <div className="tracks-manager-header">
            <div>
              <h2>Configured Syllabus Tracks</h2>
              <p>Independent syllabi structures and Commission guidelines</p>
            </div>
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => setIsCategoryModalOpen(true)}
            >
              <PlusIcon width="16" height="16" />
              <span>Create New Track</span>
            </button>
          </div>

          <div className="tracks-grid">
            {tracks.map((track) => {
              const isCustom = track.id.startsWith('custom:')
              return (
                <div key={track.id} className="track-admin-card">
                  <div className="track-admin-header">
                    <span className="badge badge--primary">{track.exam}</span>
                    {isCustom && <span className="badge badge--accent">Custom Created</span>}
                  </div>
                  <h3 className="track-admin-title">{track.title}</h3>
                  <p className="track-admin-tagline">{track.tagline}</p>

                  <div className="track-blueprint-specs">
                    <div className="spec-item">
                      <span>Total MCQs:</span>
                      <strong>{track.blueprint?.totalMcqs || 100}</strong>
                    </div>
                    <div className="spec-item">
                      <span>Time Allowed:</span>
                      <strong>{track.blueprint?.minutes || 100}m</strong>
                    </div>
                    <div className="spec-item">
                      <span>Passing Marks:</span>
                      <strong>{track.blueprint?.passingMarks || 40}</strong>
                    </div>
                    <div className="spec-item">
                      <span>Negative Marking:</span>
                      <strong>{track.blueprint?.negativeMarking ? `-${track.blueprint.negativeMarking}` : 'None'}</strong>
                    </div>
                  </div>

                  <div className="track-units-preview">
                    <strong>Syllabus Units ({track.units?.length || 0}):</strong>
                    <ul>
                      {(track.units || []).map((u) => (
                        <li key={u.id}>
                          <span>{u.title}</span>
                          <span className="unit-qcount">{u.questionCount} MCQs</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isCustom && (
                    <div className="track-card-actions">
                      <button
                        type="button"
                        className="btn btn--small btn--ghost btn--danger"
                        onClick={async () => {
                          if (confirm(`Delete track "${track.title}" and its questions?`)) {
                            await contentStore.deleteCategory(track.id.replace('custom:', ''))
                            await refresh()
                            notify('Track deleted.')
                          }
                        }}
                      >
                        Delete Track
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </main>
      )}

      {/* Tab 4: Paper Generator */}
      {currentTab === 'generator' && (
        <main className="admin-content">
          <div className="generator-layout">
            {/* Blueprint Controls */}
            <div className="generator-controls">
              <h2>Official Blueprint Presets</h2>
              <p>Generate authentic, balanced papers strictly aligned with Commission guidelines.</p>

              <div className="blueprint-chips">
                {BLUEPRINT_PRESETS.map((bp) => (
                  <button
                    key={bp.id}
                    type="button"
                    className={`blueprint-preset-card ${selectedBlueprint.id === bp.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedBlueprint(bp)
                      setGeneratedPaper(null)
                    }}
                  >
                    <div className="bp-header">
                      <span className="badge badge--small">{bp.exam}</span>
                      <span className="bp-time">{bp.durationMinutes} mins</span>
                    </div>
                    <h3 className="bp-title">{bp.title}</h3>
                    <p className="bp-sub">{bp.description}</p>
                    <div className="bp-footer">
                      <span>{bp.totalQuestions} Questions</span>
                      <span>Pass: {bp.passingMarks}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="generator-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleGeneratePaper}
                >
                  <SparklesIcon width="16" height="16" />
                  <span>Generate Balanced Paper Now</span>
                </button>
              </div>
            </div>

            {/* Generated Paper Preview */}
            <div className="generator-preview">
              {generatedPaper ? (
                <div className="generated-paper-card">
                  <div className="paper-print-header">
                    <div className="paper-seal">MPT-AI EXAMINER CONSOLE</div>
                    <h2>{generatedPaper.blueprintTitle}</h2>
                    <p>Official Screening Paper Blueprint · {generatedPaper.exam} Commission</p>
                    <div className="paper-meta-row">
                      <span>Total Time: {generatedPaper.durationMinutes} Minutes</span>
                      <span>Total Marks: {generatedPaper.questions.length}</span>
                      <span>Negative Marking: {generatedPaper.negativeMarking ? `Yes (-${generatedPaper.negativeMarking})` : 'No'}</span>
                    </div>
                  </div>

                  <div className="paper-action-bar">
                    <button
                      type="button"
                      className="btn btn--small btn--primary"
                      onClick={handlePrintPaper}
                    >
                      <PrinterIcon width="16" height="16" />
                      <span>Print Official Paper</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn--small btn--ghost"
                      onClick={handleSaveGeneratedPaperAsTrack}
                    >
                      <TargetIcon width="16" height="16" />
                      <span>Save as Playable Track</span>
                    </button>
                  </div>

                  <div className="paper-questions-list">
                    {generatedPaper.questions.map((q, qIndex) => (
                      <div key={q.id || qIndex} className="paper-question-item">
                        <div className="paper-q-stem">
                          <strong>Q{qIndex + 1}.</strong> {q.prompt}
                        </div>
                        <div className="paper-q-choices">
                          {(q.choices || []).map((ch, cIndex) => {
                            const letter = String.fromCharCode(65 + cIndex)
                            return (
                              <div key={cIndex} className="paper-q-choice">
                                <strong>{letter})</strong> {ch}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Print Key at Bottom */}
                  <div className="paper-key-section">
                    <h3>Confidential Examiner Answer Key</h3>
                    <div className="paper-key-grid">
                      {generatedPaper.questions.map((q, qIndex) => (
                        <div key={qIndex} className="key-item">
                          <span>Q{qIndex + 1}:</span>
                          <strong>{String.fromCharCode(65 + (q.answer ?? 0))}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="generator-placeholder">
                  <ZapIcon width="48" height="48" />
                  <h3>No Paper Generated Yet</h3>
                  <p>Choose an authentic blueprint preset on the left and click &apos;Generate Balanced Paper&apos; to assemble a complete exam paper.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Tab 5: Quality Audit */}
      {currentTab === 'audit' && (
        <main className="admin-content">
          <div className="audit-header">
            <div>
              <h2>Question Bank Quality Assurance Engine</h2>
              <p>Automated verification against answer keys, duplicate choices, and pedagogical depth.</p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleRunAudit}
            >
              <ShieldCheckIcon width="16" height="16" />
              <span>Run Automated Audit</span>
            </button>
          </div>

          {auditResults && (
            <div className="audit-results-panel">
              <div className="audit-score-card">
                <div className="audit-score-badge">
                  <span className="score-val">{auditResults.healthScore}%</span>
                  <span className="score-lbl">Quality Index</span>
                </div>
                <div className="audit-score-summary">
                  <h3>Audit Completed at {auditResults.auditedAt}</h3>
                  <p>
                    Verified <strong>{auditResults.validCount}</strong> out of{' '}
                    <strong>{auditResults.scannedCount}</strong> questions without any detected issues.
                  </p>
                </div>
              </div>

              <div className="audit-issues-list">
                <h3>Detected Issues ({auditResults.issues.length})</h3>
                {auditResults.issues.length === 0 ? (
                  <div className="audit-clean-state">
                    <CheckCircleIcon width="32" height="32" />
                    <h4>Flawless Question Bank!</h4>
                    <p>All scanned MCQs have verified keys, distinct choices, and explanation metadata.</p>
                  </div>
                ) : (
                  auditResults.issues.map((issue) => (
                    <div key={issue.id} className={`audit-issue-card audit-issue--${issue.severity}`}>
                      <div className="issue-header">
                        <span className={`badge badge--${issue.severity}`}>{issue.type}</span>
                        <span className="issue-msg">{issue.message}</span>
                      </div>
                      <p className="issue-prompt">{issue.question.prompt}</p>
                      <button
                        type="button"
                        className="btn btn--small btn--ghost"
                        onClick={() => handleEditQuestion(issue.question)}
                      >
                        Fix in Editor →
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {/* Tab 6: Import & Export Studio */}
      {currentTab === 'import-export' && (
        <main className="admin-content">
          <div className="import-grid">
            {/* Target Category Selector */}
            <div className="import-card target-picker-card">
              <h3>Target Category for Imports</h3>
              <p>Select which exam category new questions will be deposited into:</p>
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="admin-select"
                style={{ width: '100%' }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.title} ({c.exam})</option>
                ))}
              </select>
            </div>

            {/* In-Browser PDF Parser */}
            <div className="import-card">
              <div className="card-icon-header">
                <FileTextIcon width="24" height="24" />
                <h3>PDF Past Paper Extractor</h3>
              </div>
              <p>Upload official past-paper PDFs. The browser extracts numbered MCQs and bolded answer keys automatically.</p>
              <button
                type="button"
                className="btn btn--primary"
                disabled={isParsingPdf}
                onClick={() => pdfRef.current?.click()}
              >
                <UploadIcon width="16" height="16" />
                <span>{isParsingPdf ? 'Extracting Questions…' : 'Upload Past Paper PDF'}</span>
              </button>
              <input
                ref={pdfRef}
                type="file"
                accept="application/pdf,.pdf"
                hidden
                onChange={handleImportPdf}
              />
            </div>

            {/* CSV Question Import / Export */}
            <div className="import-card">
              <div className="card-icon-header">
                <DownloadIcon width="24" height="24" />
                <h3>Bulk CSV / Excel Format</h3>
              </div>
              <p>Import questions from Excel CSV spreadsheets (Prompt, A, B, C, D, Key, Explanation).</p>
              <div className="card-btn-row">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => csvFileRef.current?.click()}
                >
                  <UploadIcon width="16" height="16" />
                  <span>Import CSV File</span>
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleExportCsvQuestions}
                >
                  <DownloadIcon width="16" height="16" />
                  <span>Export CSV File</span>
                </button>
              </div>
              <input
                ref={csvFileRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={handleImportCsvFile}
              />
            </div>

            {/* JSON Full Backup & Restore */}
            <div className="import-card">
              <div className="card-icon-header">
                <DownloadIcon width="24" height="24" />
                <h3>Database Backup & Migration</h3>
              </div>
              <p>Export standard curriculum JSON packages or generate a complete offline snapshot backup of all IndexedDB data.</p>
              <div className="card-btn-row" style={{ flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleExportFullBackup}
                >
                  <DownloadIcon width="16" height="16" />
                  <span>Full DB Backup</span>
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleExportCategoryJson}
                >
                  <DownloadIcon width="16" height="16" />
                  <span>Export Track JSON</span>
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => fileRef.current?.click()}
                >
                  <UploadIcon width="16" height="16" />
                  <span>Restore JSON</span>
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={handleImportJsonFile}
              />
            </div>

            {/* Plain Text Parser */}
            <div className="import-card import-card--full">
              <div className="card-icon-header">
                <EditIcon width="24" height="24" />
                <h3>Bulk Plain Text & Markdown MCQ Parser</h3>
              </div>
              <p>Paste formatted questions below. The parser auto-detects standard formats (`1. Question \n A) ... \n B) ... \n Answer: A \n Explanation: ...`).</p>
              <textarea
                className="batch-text-area"
                rows={8}
                placeholder="1. Who was the first Governor-General of Pakistan?&#10;A) Liaquat Ali Khan&#10;B) Quaid-e-Azam Muhammad Ali Jinnah&#10;C) Khawaja Nazimuddin&#10;D) Ghulam Muhammad&#10;Answer: B&#10;Explanation: Quaid-e-Azam served from August 1947 until September 1948."
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
              />
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleImportTextBatch}
                disabled={!batchText.trim()}
              >
                <span>Parse and Import Batch</span>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Tab 7: User Management & RBAC Dashboard (Strictly for Super Admin) */}
      {currentTab === 'users' && role === 'admin' && (
        <main className="admin-content users-dashboard">
          {/* Staff Summary KPIs */}
          <div className="users-kpi-bar">
            <div className="users-kpi-card">
              <span className="users-kpi-label">Total Staff Accounts</span>
              <strong className="users-kpi-value">{usersList.length}</strong>
            </div>
            <div className="users-kpi-card">
              <span className="users-kpi-label">Super Admins</span>
              <strong className="users-kpi-value" style={{ color: '#f87171' }}>
                {usersList.filter((u) => u.role === 'admin').length}
              </strong>
            </div>
            <div className="users-kpi-card">
              <span className="users-kpi-label">Content Editors</span>
              <strong className="users-kpi-value" style={{ color: '#fbbf24' }}>
                {usersList.filter((u) => u.role === 'editor').length}
              </strong>
            </div>
            <div className="users-kpi-card">
              <span className="users-kpi-label">Quality Reviewers</span>
              <strong className="users-kpi-value" style={{ color: '#60a5fa' }}>
                {usersList.filter((u) => u.role === 'reviewer').length}
              </strong>
            </div>
            <div className="users-kpi-card">
              <span className="users-kpi-label">Contributors</span>
              <strong className="users-kpi-value" style={{ color: '#34d399' }}>
                {usersList.filter((u) => u.role === 'contributor').length}
              </strong>
            </div>
          </div>

          {/* Search, Filter & Provision Action */}
          <div className="users-toolbar">
            <div className="users-toolbar__filters">
              <input
                type="search"
                placeholder="Search staff by name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="users-search-input"
              />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="admin-select"
              >
                <option value="all">All Staff Roles</option>
                <option value="admin">Super Admin</option>
                <option value="editor">Editor</option>
                <option value="reviewer">Reviewer</option>
                <option value="contributor">Contributor</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => {
                setProvisionError(null)
                setIsProvisionModalOpen(true)
              }}
            >
              <UserPlusIcon width="16" height="16" />
              <span>+ Provision Team Member</span>
            </button>
          </div>

          {/* Team Members Data Grid */}
          <div className="users-table-container">
            {usersLoading ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
                Loading staff profiles from database…
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
                No team members match current filter criteria.
              </div>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>RBAC Role & Permissions</th>
                    <th>Category Clearance</th>
                    <th>Date Added</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const initials = (u.full_name || u.email || 'U')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                    const isSelf = user?.id === u.id || user?.email === u.email

                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="user-cell-meta">
                            <div className="user-avatar">{initials}</div>
                            <div>
                              <div className="user-meta-name">
                                {u.full_name || 'Staff Member'}
                                {isSelf && (
                                  <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 800 }}>
                                    (You)
                                  </span>
                                )}
                              </div>
                              <div className="user-meta-email">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`role-badge role-badge--${u.role}`}>
                              {u.role}
                            </span>
                            <select
                              value={u.role}
                              disabled={isSelf}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="role-select-inline"
                              title={isSelf ? 'Cannot demote own active session' : 'Change staff role'}
                            >
                              <option value="admin">Admin (Full DB)</option>
                              <option value="editor">Editor (Edit MCQs)</option>
                              <option value="reviewer">Reviewer (Audit & Delete)</option>
                              <option value="contributor">Contributor (Add MCQs)</option>
                            </select>
                          </div>
                        </td>
                        <td>
                          {u.role === 'contributor' ? (
                            <div className="category-tags-list">
                              {u.assigned_categories && u.assigned_categories.length > 0 ? (
                                u.assigned_categories.map((catId) => {
                                  const catName = categories.find((c) => c.id === catId)?.title || catId
                                  return (
                                    <span key={catId} className="category-tag-chip">
                                      {catName}
                                    </span>
                                  )
                                })
                              ) : (
                                <span className="category-tag-chip category-tag-chip--all">
                                  All Categories (Unrestricted)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                              Full System Clearance
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                            {u.created_at
                              ? new Date(u.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {!isSelf && (
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              onClick={() => handleRevokeUser(u.id, u.email)}
                              title="Revoke staff credentials"
                            >
                              <TrashIcon width="16" height="16" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      )}

      </div> {/* End .admin-main */}

      {/* Question Editor Slide-Out Drawer (Spacious Full-Height SaaS Experience) */}
      {isEditorOpen && (
        <>
          <div
            className="admin-drawer-backdrop"
            onClick={() => setIsEditorOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            <div className="admin-drawer__header">
              <div className="admin-drawer__title-text">
                <h3 id="drawer-title">{editingItem ? 'Edit Question' : 'Add New Question'}</h3>
                <p>Provide question details, multiple choice options, and explanation below.</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsEditorOpen(false)}
                aria-label="Close Editor Drawer"
              >
                <CloseIcon width="20" height="20" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="admin-drawer__body">
              {/* Subject Categorization */}
              <div className="drawer-section">
                <div className="drawer-section-title">
                  <TargetIcon width="16" height="16" />
                  <span>Subject & Categorization</span>
                </div>
                <div className="drawer-field">
                  <label>Subject Category *</label>
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    required
                  >
                    {availableCategoriesForUser.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.exam || 'Custom'})
                      </option>
                    ))}
                  </select>
                  {role === 'contributor' && profile?.assigned_categories?.length > 0 && (
                    <span className="drawer-field-hint">
                      Cleared subject categories assigned by Super Admin.
                    </span>
                  )}
                </div>
              </div>

              {/* Question Statement & Directive */}
              <div className="drawer-section">
                <div className="drawer-section-title">
                  <BookIcon width="16" height="16" />
                  <span>Question Prompt & Directive</span>
                </div>
                <div className="drawer-field">
                  <label>Question Prompt / Stem *</label>
                  <span className="drawer-field-hint">
                    Type or paste the complete question as it appears on official papers.
                  </span>
                  <textarea
                    required
                    rows={4}
                    value={questionForm.prompt}
                    onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
                    placeholder="Enter the question prompt statement..."
                  />
                </div>
                <div className="drawer-field">
                  <label>Special Instruction / Directive (Optional)</label>
                  <span className="drawer-field-hint">
                    e.g. &apos;Select the correct antonym&apos; or &apos;Identify the grammatically correct sentence&apos;
                  </span>
                  <input
                    type="text"
                    value={questionForm.directive}
                    onChange={(e) => setQuestionForm({ ...questionForm, directive: e.target.value })}
                    placeholder="Directive text..."
                  />
                </div>
              </div>

              {/* Answer Choices & Verified Answer Key */}
              <div className="drawer-section">
                <div className="drawer-section-title">
                  <CheckCircleIcon width="16" height="16" />
                  <span>Answer Choices & Verified Answer Key *</span>
                </div>
                <span className="drawer-field-hint">
                  Fill in the options below and select the radio button next to the verified correct answer:
                </span>
                <div className="drawer-choices-list">
                  {questionForm.choices.map((choice, cIdx) => {
                    const letter = String.fromCharCode(65 + cIdx)
                    const isCorrect = questionForm.answer === cIdx
                    return (
                      <div
                        key={cIdx}
                        className={`drawer-choice-row ${isCorrect ? 'is-selected' : ''}`}
                      >
                        <label className="drawer-choice-radio" title="Mark as correct answer">
                          <input
                            type="radio"
                            name="drawerCorrectAnswer"
                            checked={isCorrect}
                            onChange={() => setQuestionForm({ ...questionForm, answer: cIdx })}
                          />
                          <span className="drawer-choice-letter">{letter}</span>
                        </label>
                        <input
                          type="text"
                          className="drawer-choice-input"
                          placeholder={`Option ${letter} text...`}
                          value={choice}
                          onChange={(e) => {
                            const newChoices = [...questionForm.choices]
                            newChoices[cIdx] = e.target.value
                            setQuestionForm({ ...questionForm, choices: newChoices })
                          }}
                        />
                        {isCorrect && (
                          <span className="drawer-choice-key-tag">✓ Official Key</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Pedagogical Explanation */}
              <div className="drawer-section">
                <div className="drawer-section-title">
                  <SparklesIcon width="16" height="16" />
                  <span>Pedagogical Explanation & Historical Context</span>
                </div>
                <div className="drawer-field">
                  <label>Explanation & Verification Provenance (Optional)</label>
                  <span className="drawer-field-hint">
                    Provide background facts, historical context, or calculation steps to aid candidates in learning:
                  </span>
                  <textarea
                    rows={4}
                    value={questionForm.explanation}
                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                    placeholder="Explain why the answer is correct and cite the official paper year..."
                  />
                </div>
              </div>

              {/* Drawer Sticky Footer */}
              <div className="admin-drawer__footer">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setIsEditorOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  {editingItem ? 'Update Question' : 'Save Question to Bank'}
                </button>
              </div>
            </form>
          </aside>
        </>
      )}

      {/* New Category Modal */}
      {isCategoryModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="admin-modal admin-modal--small" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Create New Exam Track Category</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsCategoryModalOpen(false)}
                aria-label="Close"
              >
                <CloseIcon width="18" height="18" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="admin-editor-form">
              <div className="form-row">
                <label>Category Title *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.title}
                  onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
                  placeholder="e.g. FPSC CSS MPT 2027 Mock Bank"
                />
              </div>

              <div className="form-row">
                <label>Tagline / Description</label>
                <input
                  type="text"
                  value={categoryForm.tagline}
                  onChange={(e) => setCategoryForm({ ...categoryForm, tagline: e.target.value })}
                  placeholder="e.g. Coached test series"
                />
              </div>

              <div className="form-row">
                <label>Exam Commission Group</label>
                <select
                  value={categoryForm.exam}
                  onChange={(e) => setCategoryForm({ ...categoryForm, exam: e.target.value })}
                  className="admin-select"
                >
                  {EXAM_CHOICES.map((ex) => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  Create Track Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision New Team Member Modal */}
      {isProvisionModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsProvisionModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Provision New Team Member</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsProvisionModalOpen(false)}
                aria-label="Close"
              >
                <CloseIcon width="18" height="18" />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="admin-modal-form">
              {provisionError && (
                <div className="admin-banner admin-banner--error">{provisionError}</div>
              )}

              <div className="form-row">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ayesha Khan"
                  value={provisionForm.fullName}
                  onChange={(e) => setProvisionForm({ ...provisionForm, fullName: e.target.value })}
                />
              </div>

              <div className="form-row">
                <label>Email Address (Username) *</label>
                <input
                  type="email"
                  required
                  placeholder="examiner@mpt-ai.org"
                  value={provisionForm.email}
                  onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                />
              </div>

              <div className="form-row">
                <label>Temporary Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={provisionForm.password}
                  onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                />
              </div>

              <div className="form-row">
                <label>Assign RBAC Staff Role *</label>
                <select
                  value={provisionForm.role}
                  onChange={(e) => setProvisionForm({ ...provisionForm, role: e.target.value })}
                  className="admin-select"
                >
                  <option value="contributor">Contributor — Can only ADD questions into assigned categories</option>
                  <option value="editor">Editor — Can edit and update existing questions</option>
                  <option value="reviewer">Reviewer — Can review and DELETE questions</option>
                  <option value="admin">Super Admin — Full unrestricted access to all questions & users</option>
                </select>
              </div>

              {provisionForm.role === 'contributor' && (
                <div className="form-row">
                  <label>Assigned Categories (Leave blank for all categories):</label>
                  <div className="category-checkboxes-grid">
                    {categories.map((cat) => {
                      const isChecked = provisionForm.assignedCategories.includes(cat.id)
                      return (
                        <label key={cat.id} className="category-checkbox-item">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...provisionForm.assignedCategories, cat.id]
                                : provisionForm.assignedCategories.filter((id) => id !== cat.id)
                              setProvisionForm({ ...provisionForm, assignedCategories: updated })
                            }}
                          />
                          <span>{cat.title} ({cat.exam || 'Custom'})</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="admin-modal-actions" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setIsProvisionModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={provisionLoading}
                >
                  {provisionLoading ? 'Provisioning Account…' : 'Generate Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
