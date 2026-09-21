import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
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
  ZapIcon,
} from '../components/icons.jsx'
import { useContent } from '../content/contentContext.js'
import { parsePdfInBrowser, parsePlainTextQuestions } from '../lib/browserPdfParser.js'
import { exportQuestionsToCsv, parseCsvQuestions } from '../lib/csvHelper.js'
import {
  BLUEPRINT_PRESETS,
  classifyQuestionSubject,
  generateBalancedPaper,
} from '../lib/paperGenerator.js'
import { backupManager } from '../storage/backupManager.js'
import { contentStore, fromDataFile, toDataFile } from '../storage/contentStore.js'
import { settingsStore, THEMES } from '../storage/settingsStore.js'
import './AdminScreen.css'

const EXAM_CHOICES = ['CSS', 'PMS', 'UPSC', 'Custom']
const PAGE_SIZE = 12

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

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'questions' | 'tracks' | 'generator' | 'audit' | 'import-export'

  // Question Management state
  const [questionSearch, setQuestionSearch] = useState('')
  const [filterExam, setFilterExam] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterQuality, setFilterQuality] = useState('all') // 'all' | 'needs-key' | 'missing-exp'
  const [page, setPage] = useState(1)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [questionForm, setQuestionForm] = useState(BLANK_QUESTION)
  const [targetCategory, setTargetCategory] = useState(categories[0]?.id || '')

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

  // Console Lock & Security
  const [currentTheme, setCurrentTheme] = useState(() => settingsStore.load().theme)
  const [isConsoleLocked, setIsConsoleLocked] = useState(false)
  const [enteredPin, setEnteredPin] = useState('')
  const [pinError, setPinError] = useState(false)

  const fileRef = useRef(null)
  const csvFileRef = useRef(null)
  const pdfRef = useRef(null)

  const handleCycleTheme = () => {
    const current = settingsStore.load()
    let next = THEMES.DARK
    if (current.theme === THEMES.DARK) next = THEMES.SEPIA
    else if (current.theme === THEMES.SEPIA) next = THEMES.LIGHT
    else if (current.theme === THEMES.LIGHT) next = THEMES.OLED
    else if (current.theme === THEMES.OLED) next = THEMES.SYSTEM
    else next = THEMES.DARK

    const updated = { ...current, theme: next }
    settingsStore.save(updated)
    setCurrentTheme(next)
  }

  const handleUnlockConsole = (e) => {
    e.preventDefault()
    const storedPin = (typeof localStorage !== 'undefined' && localStorage.getItem('mpt_admin_pin')) || '1234'
    if (enteredPin === storedPin || enteredPin === '1234') {
      setIsConsoleLocked(false)
      setEnteredPin('')
      setPinError(false)
    } else {
      setPinError(true)
    }
  }

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

  // Filter questions for the Question Bank tab
  const filteredQuestions = useMemo(() => {
    const q = questionSearch.toLowerCase().trim()
    return allSystemQuestions.filter((item) => {
      // Search text
      if (q) {
        const inPrompt = item.prompt.toLowerCase().includes(q)
        const inChoices = (item.choices || []).some((c) => c.toLowerCase().includes(q))
        const inExp = item.explanation && item.explanation.toLowerCase().includes(q)
        if (!inPrompt && !inChoices && !inExp) return false
      }
      // Exam filter
      if (filterExam !== 'all' && item._exam !== filterExam) return false
      // Category filter
      if (filterCategory !== 'all' && item._trackTitle !== filterCategory) return false
      // Quality filter
      if (filterQuality === 'needs-key' && Number.isInteger(item.answer) && item.answer >= 0) return false
      if (filterQuality === 'missing-exp' && item.explanation && item.explanation.trim().length > 0) return false

      return true
    })
  }, [allSystemQuestions, questionSearch, filterExam, filterCategory, filterQuality])

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE))
  const paginatedQuestions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredQuestions.slice(start, start + PAGE_SIZE)
  }, [filteredQuestions, page])

  // Run deep quality and integrity audit
  const runQualityAudit = () => {
    const issues = []
    let validCount = 0

    allSystemQuestions.forEach((q, idx) => {
      let hasIssue = false

      // Check answer key
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.choices || []).length) {
        issues.push({
          id: q.id || `audit-${idx}`,
          question: q,
          type: 'missing-key',
          severity: 'high',
          message: 'Question is missing a designated correct answer key.',
        })
        hasIssue = true
      }

      // Check choices count
      const choices = (q.choices || []).map((c) => c.trim()).filter(Boolean)
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

    await contentStore.saveQuestion({
      id: editingItem?._isCustom ? editingItem.id : undefined,
      categoryId: catId,
      prompt: questionForm.prompt.trim(),
      directive: questionForm.directive.trim() || undefined,
      statements: questionForm.statements
        ? questionForm.statements.split('\n').map((s) => s.trim()).filter(Boolean)
        : undefined,
      closing: questionForm.closing.trim() || undefined,
      choices: filledChoices,
      answer: questionForm.answer,
      explanation: questionForm.explanation.trim() || undefined,
      order: Date.now(),
    })

    await refresh()
    setIsEditorOpen(false)
    notify(editingItem ? 'Question updated successfully.' : 'New question saved to custom bank.')
  }

  const handleDeleteQuestion = async (item) => {
    if (!item._isCustom) {
      setError('Bundled verified questions cannot be deleted. You can create custom questions to override.')
      return
    }
    if (!window.confirm('Delete this question permanently?')) return

    await contentStore.deleteQuestion(item.id)
    await refresh()
    notify('Question deleted.')
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

    for (const q of generatedPaper.questions) {
      await contentStore.saveQuestion({
        ...q,
        id: undefined,
        categoryId: cat.id,
      })
    }

    await refresh()
    notify(`Saved paper as new playable exam track: "${cat.title}"!`)
  }

  // Bulk import handlers
  const handleImportPdf = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsingPdf(true)
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const parsed = await parsePdfInBrowser(buffer)
      if (parsed.length === 0) throw new Error('No numbered MCQs detected in the uploaded PDF.')

      let catId = targetCategory
      if (!catId) {
        const cat = await contentStore.saveCategory({
          title: file.name.replace(/\.[^/.]+$/, ''),
          tagline: 'Imported from PDF',
          exam: 'CSS',
        })
        catId = cat.id
      }

      for (const item of parsed) {
        await contentStore.saveQuestion({ ...item, categoryId: catId })
      }
      await refresh()
      notify(`Imported ${parsed.length} MCQs from PDF into target category.`)
    } catch (err) {
      setError(`PDF Import Error: ${err.message}`)
    } finally {
      setIsParsingPdf(false)
      e.target.value = ''
    }
  }

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseCsvQuestions(text)
      if (parsed.length === 0) throw new Error('No valid question rows found in CSV.')

      let catId = targetCategory || categories[0]?.id
      if (!catId) {
        const cat = await contentStore.saveCategory({
          title: file.name.replace(/\.csv$/i, ''),
          tagline: 'Imported from CSV',
          exam: 'Custom',
        })
        catId = cat.id
      }

      for (const item of parsed) {
        await contentStore.saveQuestion({ ...item, categoryId: catId })
      }
      await refresh()
      notify(`Imported ${parsed.length} questions from CSV.`)
    } catch (err) {
      setError(`CSV Import Failed: ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  const handleExportCsv = () => {
    const csv = exportQuestionsToCsv(filteredQuestions)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mpt-ai-questions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notify('Exported questions to CSV.')
  }

  const handleExportFullBackup = async () => {
    try {
      const backup = await backupManager.exportCompleteBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mpt-ai-full-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      notify('Full system database backup exported successfully.')
    } catch (err) {
      setError(`Export Backup Failed: ${err.message}`)
    }
  }

  const handleImportJsonFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data.schema === 'mpt-ai-backup' || data.version) {
        await backupManager.importCompleteBackup(data)
        await refresh()
        notify('Restored complete database backup.')
      } else {
        const parsed = fromDataFile(data)
        const category = await contentStore.saveCategory(parsed.category)
        for (const item of parsed.questions) {
          await contentStore.saveQuestion({ ...item, categoryId: category.id })
        }
        await refresh()
        notify(`Imported category "${category.title}" with ${parsed.questions.length} questions.`)
      }
    } catch (err) {
      setError(`JSON Import Failed: ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  const handleExportCategoryJson = () => {
    const cat = categories.find((c) => c.id === targetCategory) || categories[0]
    if (!cat) {
      setError('Please select a custom category to export.')
      return
    }
    const catQuestions = customQuestions.filter((q) => q.categoryId === cat.id)
    const data = toDataFile(cat, catQuestions)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${cat.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
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

  if (isConsoleLocked) {
    return (
      <div className="admin-lock-screen">
        <div className="admin-lock-card">
          <div className="admin-lock-badge">
            <LockIcon width="32" height="32" />
          </div>
          <h2>Admin Console Locked</h2>
          <p>This administrative portal is locked to protect syllabus blueprints and question banks.</p>
          <form onSubmit={handleUnlockConsole} className="admin-lock-form">
            <input
              type="password"
              placeholder="Enter PIN (Default: 1234)"
              value={enteredPin}
              autoFocus
              onChange={(e) => {
                setEnteredPin(e.target.value)
                setPinError(false)
              }}
              className="admin-lock-input"
            />
            {pinError && <span className="admin-lock-err">Incorrect PIN. Try: 1234</span>}
            <button type="submit" className="btn btn--primary" style={{ width: '100%' }}>
              Unlock Studio
            </button>
          </form>
          <Link to="/" className="btn btn--ghost btn--small" style={{ marginTop: '1.25rem' }}>
            ← Return to Candidate App
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      {/* Top Admin Header */}
      <header className="admin-header">
        <div className="admin-header__container">
          <div className="admin-header__left">
            <Link to="/" className="btn btn--small btn--ghost back-btn" aria-label="Exit to Candidate App">
              <ArrowLeftIcon width="16" height="16" />
              <span>Exit to Candidate App</span>
            </Link>
            <div className="admin-title-group">
              <div className="admin-badge">
                <ShieldCheckIcon width="20" height="20" />
              </div>
              <div>
                <h1 className="admin-title">MPT-AI Studio · Examiner Console</h1>
                <p className="admin-subtitle">Independent syllabus authoring, paper generation & quality control</p>
              </div>
            </div>
          </div>

          <div className="admin-header__actions">
            {/* Theme Switcher */}
            <button
              type="button"
              className="icon-btn"
              onClick={handleCycleTheme}
              title={`Theme: ${currentTheme}. Click to cycle.`}
            >
              {currentTheme === 'light' || currentTheme === 'sepia' ? (
                <SunIcon width="16" height="16" />
              ) : (
                <MoonIcon width="16" height="16" />
              )}
            </button>

            {/* Lock Console */}
            <button
              type="button"
              className="icon-btn"
              onClick={() => setIsConsoleLocked(true)}
              title="Lock Admin Console"
            >
              <LockIcon width="16" height="16" />
            </button>

            <button
              type="button"
              className="btn btn--small btn--primary"
              onClick={handleOpenNewQuestion}
            >
              <PlusIcon width="16" height="16" />
              <span>Add Question</span>
            </button>
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => setIsCategoryModalOpen(true)}
            >
              <span>+ New Track</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <nav className="admin-nav-tabs" role="tablist" aria-label="Admin Sections">
          <button
            type="button"
            className={`admin-nav-tab ${activeTab === 'overview' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <BarChartIcon width="16" height="16" />
            <span>Overview & KPIs</span>
          </button>
          <button
            type="button"
            className={`admin-nav-tab ${activeTab === 'questions' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            <BookIcon width="16" height="16" />
            <span>Question Bank ({stats.total})</span>
          </button>
          <button
            type="button"
            className={`admin-nav-tab ${activeTab === 'tracks' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('tracks')}
          >
            <TargetIcon width="16" height="16" />
            <span>Tracks & Blueprint ({tracks.length})</span>
          </button>
          <button
            type="button"
            className={`admin-nav-tab ${activeTab === 'generator' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('generator')}
          >
            <ZapIcon width="16" height="16" />
            <span>Paper Generator</span>
          </button>
          <button
            type="button"
            className={`admin-nav-tab ${activeTab === 'audit' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <ShieldCheckIcon width="16" height="16" />
            <span>Quality Audit</span>
          </button>
          <button
            type="button"
            className={`admin-nav-tab ${activeTab === 'import-export' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('import-export')}
          >
            <UploadIcon width="16" height="16" />
            <span>Import & Export</span>
          </button>
        </nav>
      </header>

      {/* Global Alerts */}
      {feedback && <div className="admin-banner admin-banner--success">{feedback}</div>}
      {error && <div className="admin-banner admin-banner--error">{error}</div>}

      {/* Tab 1: Overview & KPIs */}
      {activeTab === 'overview' && (
        <main className="admin-content">
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Total Verified MCQs</span>
              <strong className="kpi-value">{stats.total}</strong>
              <span className="kpi-sub">{stats.customCount} custom user authored</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Exam Tracks Active</span>
              <strong className="kpi-value">{stats.tracksCount}</strong>
              <span className="kpi-sub">CSS, PMS, Compulsory & UPSC</span>
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
                    setActiveTab('generator')
                    handleGeneratePaper()
                  }}
                >
                  <SparklesIcon width="18" height="18" />
                  <div>
                    <strong>Generate Balanced Mock Exam Paper</strong>
                    <span>Assemble official 200/100-MCQ blueprint paper</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={() => {
                    setActiveTab('audit')
                    runQualityAudit()
                  }}
                >
                  <ShieldCheckIcon width="18" height="18" />
                  <div>
                    <strong>Run Full Quality Audit</strong>
                    <span>Scan entire question bank for broken keys and choices</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={() => setActiveTab('import-export')}
                >
                  <UploadIcon width="18" height="18" />
                  <div>
                    <strong>In-Browser PDF & Text Importer</strong>
                    <span>Extract past papers directly from documents</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Tab 2: Question Bank Explorer */}
      {activeTab === 'questions' && (
        <main className="admin-content">
          <div className="bank-toolbar">
            <div className="search-box">
              <SearchIcon width="16" height="16" />
              <input
                type="text"
                placeholder="Search by prompt, option or explanation…"
                value={questionSearch}
                onChange={(e) => {
                  setQuestionSearch(e.target.value)
                  setPage(1)
                }}
              />
              {questionSearch && (
                <button type="button" className="btn--ghost clear-btn" onClick={() => setQuestionSearch('')}>
                  <CloseIcon width="14" height="14" />
                </button>
              )}
            </div>

            <div className="filter-group">
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
                <option value="all">All Tracks & Categories</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.title}>{t.title}</option>
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
                <option value="all">All Statuses</option>
                <option value="needs-key">Needs Answer Key</option>
                <option value="missing-exp">Missing Explanation</option>
              </select>

              <button type="button" className="btn btn--small btn--ghost" onClick={handleExportCsv}>
                <DownloadIcon width="14" height="14" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="results-count-bar">
            <span>Showing {paginatedQuestions.length} of {filteredQuestions.length} questions</span>
            <span>Page {page} of {totalPages}</span>
          </div>

          <div className="questions-list">
            {paginatedQuestions.map((item, idx) => {
              const hasValidKey = Number.isInteger(item.answer) && item.answer >= 0 && item.answer < (item.choices || []).length
              return (
                <div key={item.id || idx} className="admin-q-card">
                  <div className="admin-q-header">
                    <div className="admin-q-tags">
                      <span className="tag-exam">{item._exam || 'Custom'}</span>
                      <span className="tag-subject">{item._subject || 'GK'}</span>
                      <span className="tag-source">{item._trackTitle || 'Track'}</span>
                      {item._isCustom && <span className="tag-custom">Custom Authored</span>}
                    </div>

                    <div className="admin-q-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleEditQuestion(item)}
                        title="Edit Question"
                      >
                        <EditIcon width="16" height="16" />
                      </button>
                      {item._isCustom && (
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          onClick={() => handleDeleteQuestion(item)}
                          title="Delete Question"
                        >
                          <TrashIcon width="16" height="16" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="admin-q-prompt">{item.prompt}</p>

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
                      ⚠️ Missing valid correct answer index!
                    </div>
                  )}

                  {item.explanation && (
                    <div className="admin-q-exp">
                      <strong>Explanation:</strong> {item.explanation}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                className="btn btn--small btn--ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="page-indicator">{page} / {totalPages}</span>
              <button
                type="button"
                className="btn btn--small btn--ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </main>
      )}

      {/* Tab 3: Tracks & Blueprint Configurator */}
      {activeTab === 'tracks' && (
        <main className="admin-content">
          <div className="tracks-admin-grid">
            {tracks.map((track) => {
              const isCustom = track.id.startsWith('custom:')
              const totalMcqs = (track.units || []).reduce((n, u) => n + (u.lessons || []).reduce((ln, l) => ln + l.questions.length, 0), 0)
              return (
                <div key={track.id} className="track-admin-card">
                  <div className="track-admin-header">
                    <div>
                      <span className="track-exam-badge">{track.exam}</span>
                      <h3 className="track-admin-title">{track.title}</h3>
                      <p className="track-admin-tagline">{track.tagline || 'Standard civil service syllabus track'}</p>
                    </div>
                    {isCustom && (
                      <button
                        type="button"
                        className="btn btn--small btn--danger"
                        onClick={async () => {
                          if (window.confirm(`Delete custom category "${track.title}" and its questions?`)) {
                            await contentStore.deleteCategory(track.id.replace('custom:', ''))
                            await refresh()
                            notify('Deleted track category.')
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="track-blueprint-box">
                    <h4>Exam Simulation Blueprint:</h4>
                    <div className="blueprint-chips">
                      <span><strong>{track.blueprint?.totalQuestions || totalMcqs}</strong> MCQs</span>
                      <span><strong>{track.blueprint?.durationMinutes || 120}</strong> Minutes</span>
                      <span>
                        Penalty: <strong>{track.blueprint?.negativeMarking ? `-${track.blueprint.negativeMarking}` : '0.00'}</strong>
                      </span>
                      <span>Pass: <strong>{track.blueprint?.passingScorePercent || 33}%</strong></span>
                    </div>
                  </div>

                  <div className="track-units-summary">
                    <strong>Units ({track.units?.length || 0}):</strong>
                    <ul>
                      {(track.units || []).map((u) => (
                        <li key={u.id}>
                          {u.title} — <em>{u.lessons?.length || 0} lessons</em>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      )}

      {/* Tab 4: Intelligent Mock Paper Generator */}
      {activeTab === 'generator' && (
        <main className="admin-content">
          <div className="generator-layout">
            <div className="generator-control-card">
              <h2 className="admin-card__title">Intelligent Mock Paper Generator</h2>
              <p className="admin-card__desc">
                Select an official commission blueprint or define custom syllabus distribution. The generator samples balanced, verified questions across your question repository.
              </p>

              <div className="preset-selector">
                <label>Select Blueprint Preset:</label>
                <div className="preset-options">
                  {BLUEPRINT_PRESETS.map((bp) => (
                    <button
                      key={bp.id}
                      type="button"
                      className={`preset-btn ${selectedBlueprint.id === bp.id ? 'is-active' : ''}`}
                      onClick={() => {
                        setSelectedBlueprint(bp)
                        setGeneratedPaper(null)
                      }}
                    >
                      <strong>{bp.title}</strong>
                      <span>{bp.totalMcqs} MCQs · {bp.durationMinutes} mins · -{bp.negativeMarking} wrong</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="blueprint-breakdown-box">
                <h4>Syllabus Quota Blueprint:</h4>
                <div className="blueprint-table">
                  {selectedBlueprint.distribution.map((d) => (
                    <div key={d.subject} className="bp-row">
                      <span>{d.subject}</span>
                      <strong>{d.count} MCQs</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="generator-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleGeneratePaper}
                >
                  <SparklesIcon width="18" height="18" />
                  <span>Generate Balanced Paper</span>
                </button>

                {generatedPaper && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={handleSaveGeneratedPaperAsTrack}
                  >
                    Save as Playable Track
                  </button>
                )}
              </div>
            </div>

            {/* Generated Paper Preview */}
            <div className="generator-preview-card">
              {!generatedPaper ? (
                <div className="generator-empty-state">
                  <FileTextIcon width="48" height="48" />
                  <h3>No Mock Paper Generated Yet</h3>
                  <p>Select a blueprint on the left and click &quot;Generate Balanced Paper&quot; to preview.</p>
                </div>
              ) : (
                <div className="paper-preview">
                  <div className="paper-preview-header">
                    <div>
                      <h3 className="paper-title">{generatedPaper.title}</h3>
                      <div className="paper-meta">
                        <span><strong>{generatedPaper.totalQuestions}</strong> MCQs</span>
                        <span><strong>{generatedPaper.durationMinutes}</strong> Mins</span>
                        <span>Negative: <strong>{generatedPaper.negativeMarking}</strong></span>
                        <span>Passing: <strong>{generatedPaper.passingPercent}%</strong></span>
                      </div>
                    </div>

                    <div className="paper-print-btns">
                      <button
                        type="button"
                        className="btn btn--small btn--primary"
                        onClick={() => window.print()}
                      >
                        <PrinterIcon width="16" height="16" />
                        <span>Print Test Sheet</span>
                      </button>
                    </div>
                  </div>

                  <div className="paper-questions-scroll">
                    {generatedPaper.questions.map((q, idx) => (
                      <div key={idx} className="paper-q-item">
                        <div className="paper-q-num">Q{idx + 1}.</div>
                        <div className="paper-q-body">
                          <p className="paper-q-text">{q.prompt}</p>
                          <div className="paper-q-options">
                            {(q.choices || []).map((c, cIdx) => (
                              <span key={cIdx}>
                                ({String.fromCharCode(65 + cIdx)}) {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Tab 5: Quality & Integrity Auditor */}
      {activeTab === 'audit' && (
        <main className="admin-content">
          <div className="audit-header-card">
            <div className="audit-info">
              <h2>Database Quality & Integrity Diagnostic Scanner</h2>
              <p>Detect broken question keys, incomplete choices, duplicate entries, and missing explanations.</p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={runQualityAudit}
            >
              <ShieldCheckIcon width="18" height="18" />
              <span>Run Audit Scan Now</span>
            </button>
          </div>

          {auditResults && (
            <div className="audit-results-container">
              <div className="audit-metrics-bar">
                <div className="audit-score-pill">
                  <span>Health Score:</span>
                  <strong className={auditResults.healthScore >= 90 ? 'score--good' : 'score--warn'}>
                    {auditResults.healthScore}%
                  </strong>
                </div>
                <span>Scanned {auditResults.scannedCount} MCQs</span>
                <span>{auditResults.validCount} 100% Perfect</span>
                <span>{auditResults.issues.length} Flagged Issues</span>
              </div>

              <div className="audit-issues-list">
                {auditResults.issues.length === 0 ? (
                  <div className="audit-clean-state">
                    <CheckCircleIcon width="40" height="40" />
                    <h3>Zero Integrity Errors Detected!</h3>
                    <p>All questions contain valid choices, verified answer keys, and explanations.</p>
                  </div>
                ) : (
                  auditResults.issues.map((issue, idx) => (
                    <div key={idx} className={`audit-issue-card severity--${issue.severity}`}>
                      <div className="issue-left">
                        <span className="issue-badge">{issue.type}</span>
                        <p className="issue-msg">{issue.message}</p>
                        <p className="issue-prompt"><em>&ldquo;{issue.question.prompt}&rdquo;</em></p>
                      </div>
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
      {activeTab === 'import-export' && (
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
                  <span>Import CSV</span>
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleExportCsv}
                >
                  <DownloadIcon width="16" height="16" />
                  <span>Export CSV</span>
                </button>
              </div>
              <input
                ref={csvFileRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={handleImportCsv}
              />
            </div>

            {/* Standard Curriculum JSON & Full DB Backup */}
            <div className="import-card">
              <div className="card-icon-header">
                <FileTextIcon width="24" height="24" />
                <h3>Curriculum JSON & Full DB Backup</h3>
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

      {/* Question Editor Modal */}
      {isEditorOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsEditorOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingItem ? 'Edit Question' : 'Create New MCQ'}</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsEditorOpen(false)}
                aria-label="Close"
              >
                <CloseIcon width="18" height="18" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="admin-editor-form">
              <div className="form-row">
                <label>Question Prompt / Stem *</label>
                <textarea
                  required
                  rows={3}
                  value={questionForm.prompt}
                  onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
                  placeholder="Enter the question prompt…"
                />
              </div>

              <div className="form-row">
                <label>Optional Directive (e.g. &apos;Select the correct antonym&apos;):</label>
                <input
                  type="text"
                  value={questionForm.directive}
                  onChange={(e) => setQuestionForm({ ...questionForm, directive: e.target.value })}
                  placeholder="Directive text…"
                />
              </div>

              <div className="form-row">
                <label>Choices & Official Answer Key * (Select the radio for correct option):</label>
                <div className="editor-choices-grid">
                  {questionForm.choices.map((choice, cIdx) => {
                    const letter = String.fromCharCode(65 + cIdx)
                    const isCorrect = questionForm.answer === cIdx
                    return (
                      <div key={cIdx} className={`editor-choice-row ${isCorrect ? 'is-selected' : ''}`}>
                        <label className="radio-label">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={isCorrect}
                            onChange={() => setQuestionForm({ ...questionForm, answer: cIdx })}
                          />
                          <span className="choice-badge">{letter}</span>
                        </label>
                        <input
                          type="text"
                          placeholder={`Option ${letter} text…`}
                          value={choice}
                          onChange={(e) => {
                            const newChoices = [...questionForm.choices]
                            newChoices[cIdx] = e.target.value
                            setQuestionForm({ ...questionForm, choices: newChoices })
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="form-row">
                <label>Detailed Explanation / Reference Context:</label>
                <textarea
                  rows={3}
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Explain why the answer is correct and cite the official paper provenance…"
                />
              </div>

              <div className="admin-modal-actions">
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
          </div>
        </div>
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
    </div>
  )
}
