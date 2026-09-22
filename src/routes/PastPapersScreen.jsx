import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  BookIcon,
  CheckCircleIcon,
  CloseIcon,
  FileTextIcon,
  PrinterIcon,
  SearchIcon,
  SparklesIcon,
  TimerIcon,
  TrophyIcon,
} from '../components/icons.jsx'
import './PastPapersScreen.css'

export default function PastPapersScreen() {
  const [filterExam, setFilterExam] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterNegative, setFilterNegative] = useState('all') // 'all', 'penalty', 'no-penalty'
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'oldest', 'mcqs'

  const pastPapersList = useMemo(
    () => [
      {
        id: 'css-mpt-2026',
        title: 'FPSC CSS MPT 2026',
        exam: 'CSS',
        commission: 'Federal Public Service Commission (FPSC)',
        year: '2026',
        totalMcqs: 200,
        minutes: 200,
        negativeMarking: 0,
        provenance: 'Official FPSC Key',
        trackId: 'css-mpt',
        description: 'Official CSS Screening Test covering English Vocabulary & Grammar, General Abilities, Everyday Science, GK, Islamic Studies, and Urdu.',
      },
      {
        id: 'css-mpt-2025',
        title: 'FPSC CSS MPT 2025',
        exam: 'CSS',
        commission: 'Federal Public Service Commission (FPSC)',
        year: '2025',
        totalMcqs: 200,
        minutes: 200,
        negativeMarking: 0,
        provenance: 'Official FPSC Key',
        trackId: 'css-mpt',
        description: 'Full-length screening test paper for the CSS Competitive Examination 2025 with complete question bank and explanatory answers.',
      },
      {
        id: 'css-mpt-2024',
        title: 'FPSC CSS MPT 2024',
        exam: 'CSS',
        commission: 'Federal Public Service Commission (FPSC)',
        year: '2024',
        totalMcqs: 200,
        minutes: 200,
        negativeMarking: 0,
        provenance: 'Official FPSC Key',
        trackId: 'css-mpt',
        description: 'Authentic 200-MCQ preliminary examination paper with official answer keys across General Knowledge, Basic Mathematics, and English.',
      },
      {
        id: 'css-compulsory-gsa',
        title: 'CSS Compulsory — General Science & Ability (2016–2025)',
        exam: 'CSS',
        commission: 'FPSC Written Compulsory Part-I',
        year: '2016–2025',
        totalMcqs: 160,
        minutes: 160,
        negativeMarking: 0,
        provenance: 'FPSC Past Papers (Keyed by MPT-AI)',
        trackId: 'css-compulsory',
        description: 'Part-I objective 20-MCQ units extracted from CSS written compulsory examination papers spanning 2016 to 2025.',
      },
      {
        id: 'pms-prelims-2025',
        title: 'PPSC PMS Prelims 2025',
        exam: 'PMS',
        commission: 'Punjab Public Service Commission (PPSC)',
        year: '2025',
        totalMcqs: 100,
        minutes: 120,
        negativeMarking: 0.25,
        provenance: 'Official PPSC Paper',
        trackId: 'pms-prelims',
        description: 'Official provincial management service general knowledge screening paper featuring 0.25 negative marking per incorrect response.',
      },
      {
        id: 'pms-prelims-2024',
        title: 'PPSC PMS Prelims 2024',
        exam: 'PMS',
        commission: 'Punjab Public Service Commission (PPSC)',
        year: '2024',
        totalMcqs: 100,
        minutes: 120,
        negativeMarking: 0.25,
        provenance: 'Official PPSC Paper',
        trackId: 'pms-prelims',
        description: 'Authentic PPSC PMS General Knowledge screening exam with 100 high-yield questions, analytical math, and negative marking penalty.',
      },
      {
        id: 'pms-prelims-2023',
        title: 'PPSC PMS Prelims 2023',
        exam: 'PMS',
        commission: 'Punjab Public Service Commission (PPSC)',
        year: '2023',
        totalMcqs: 100,
        minutes: 120,
        negativeMarking: 0.25,
        provenance: 'Official PPSC Paper',
        trackId: 'pms-prelims',
        description: 'Verified 2023 PMS screening test with authentic answer key, negative marking calculations, and full detailed rationale.',
      },
      {
        id: 'upsc-prelims-2025-gs1',
        title: 'UPSC CSE Prelims 2025 — General Studies Paper I',
        exam: 'UPSC',
        commission: 'Union Public Service Commission (UPSC)',
        year: '2025',
        totalMcqs: 100,
        minutes: 120,
        negativeMarking: 0.33,
        provenance: 'Official UPSC Key',
        trackId: 'upsc-prelims',
        description: 'UPSC Civil Services Examination General Studies Paper I covering Indian Polity, Modern History, Geography, Environment, and Economics.',
      },
    ],
    [],
  )

  const totalMcqsCount = useMemo(
    () => pastPapersList.reduce((acc, p) => acc + p.totalMcqs, 0),
    [pastPapersList],
  )

  const filtered = useMemo(() => {
    return pastPapersList
      .filter((p) => {
        if (filterExam !== 'all' && p.exam !== filterExam) return false
        if (filterNegative === 'penalty' && p.negativeMarking === 0) return false
        if (filterNegative === 'no-penalty' && p.negativeMarking > 0) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const match =
            p.title.toLowerCase().includes(q) ||
            p.commission.toLowerCase().includes(q) ||
            p.year.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.exam.toLowerCase().includes(q)
          if (!match) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return b.year.localeCompare(a.year)
        if (sortBy === 'oldest') return a.year.localeCompare(b.year)
        if (sortBy === 'mcqs') return b.totalMcqs - a.totalMcqs
        return 0
      })
  }, [pastPapersList, filterExam, filterNegative, searchQuery, sortBy])

  const examCounts = useMemo(() => {
    return {
      all: pastPapersList.length,
      CSS: pastPapersList.filter((p) => p.exam === 'CSS').length,
      PMS: pastPapersList.filter((p) => p.exam === 'PMS').length,
      UPSC: pastPapersList.filter((p) => p.exam === 'UPSC').length,
    }
  }, [pastPapersList])

  return (
    <div className="papers-page">
      {/* Top Header & Breadcrumbs */}
      <div className="papers-header">
        <Link to="/" className="back-link">
          <ArrowLeftIcon width="16" height="16" />
          <span>Curriculum Dashboard</span>
        </Link>

        <div className="papers-hero">
          <div className="papers-hero__text">
            <div className="papers-title-wrap">
              <div className="papers-icon-badge">
                <FileTextIcon width="24" height="24" />
              </div>
              <div>
                <h1>Past Papers Vault</h1>
                <span className="papers-badge-tag">Official Archives (2013–2026)</span>
              </div>
            </div>
            <p className="papers-subtitle">
              Authentic civil service screening test past papers with official examiner keys, realistic negative marking rules, and instant printable test worksheets.
            </p>
          </div>

          {/* Quick Aggregate Stats Ribbon */}
          <div className="papers-stats-ribbon">
            <div className="papers-stat-card">
              <span className="papers-stat-num">{pastPapersList.length}</span>
              <span className="papers-stat-lbl">Official Papers</span>
            </div>
            <div className="papers-stat-card">
              <span className="papers-stat-num">{totalMcqsCount}+</span>
              <span className="papers-stat-lbl">Verified MCQs</span>
            </div>
            <div className="papers-stat-card">
              <span className="papers-stat-num">3</span>
              <span className="papers-stat-lbl">Exam Boards</span>
            </div>
            <div className="papers-stat-card">
              <span className="papers-stat-num">100%</span>
              <span className="papers-stat-lbl">Offline Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls Dock (Search, Category Tabs, Filters, Sort) */}
      <div className="papers-controls-card">
        <div className="papers-search-row">
          <div className="papers-search-box">
            <SearchIcon width="16" height="16" className="papers-search-icon" />
            <input
              type="text"
              className="papers-search-input"
              placeholder="Search past papers by year, subject, commission..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search past papers"
            />
            {searchQuery && (
              <button
                type="button"
                className="papers-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <CloseIcon width="14" height="14" />
              </button>
            )}
          </div>

          <div className="papers-sort-group">
            <label htmlFor="papers-sort-select" className="papers-sort-lbl">Sort:</label>
            <select
              id="papers-sort-select"
              className="papers-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="mcqs">Most Questions</option>
            </select>
          </div>
        </div>

        <div className="papers-filter-row">
          {/* Commission Selector */}
          <div className="papers-tabs-group" role="tablist" aria-label="Filter by Commission">
            <button
              type="button"
              className={`paper-filter-tab ${filterExam === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilterExam('all')}
            >
              <span>All Papers</span>
              <span className="tab-count">{examCounts.all}</span>
            </button>
            <button
              type="button"
              className={`paper-filter-tab ${filterExam === 'CSS' ? 'is-active' : ''}`}
              onClick={() => setFilterExam('CSS')}
            >
              <span>FPSC CSS</span>
              <span className="tab-count">{examCounts.CSS}</span>
            </button>
            <button
              type="button"
              className={`paper-filter-tab ${filterExam === 'PMS' ? 'is-active' : ''}`}
              onClick={() => setFilterExam('PMS')}
            >
              <span>PPSC PMS</span>
              <span className="tab-count">{examCounts.PMS}</span>
            </button>
            <button
              type="button"
              className={`paper-filter-tab ${filterExam === 'UPSC' ? 'is-active' : ''}`}
              onClick={() => setFilterExam('UPSC')}
            >
              <span>UPSC CSE</span>
              <span className="tab-count">{examCounts.UPSC}</span>
            </button>
          </div>

          {/* Negative Marking Rule Filter */}
          <div className="papers-penalty-toggle">
            <button
              type="button"
              className={`penalty-chip ${filterNegative === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilterNegative('all')}
            >
              All Rules
            </button>
            <button
              type="button"
              className={`penalty-chip ${filterNegative === 'penalty' ? 'is-active' : ''}`}
              onClick={() => setFilterNegative('penalty')}
            >
              Negative Marking
            </button>
            <button
              type="button"
              className={`penalty-chip ${filterNegative === 'no-penalty' ? 'is-active' : ''}`}
              onClick={() => setFilterNegative('no-penalty')}
            >
              Zero Penalty
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="papers-results-header">
        <span>Showing <strong>{filtered.length}</strong> of {pastPapersList.length} authenticated papers</span>
        {(searchQuery || filterExam !== 'all' || filterNegative !== 'all') && (
          <button
            type="button"
            className="papers-reset-btn"
            onClick={() => {
              setSearchQuery('')
              setFilterExam('all')
              setFilterNegative('all')
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Spacious 3-Column Desktop Grid / 1-Column Mobile Grid */}
      {filtered.length > 0 ? (
        <div className="papers-grid">
          {filtered.map((paper) => (
            <article key={paper.id} className="paper-card">
              <div className="paper-card__top">
                <div className="paper-card__badges">
                  <span className="paper-year-pill">{paper.year}</span>
                  <span className="paper-exam-badge">{paper.exam}</span>
                  {paper.negativeMarking > 0 ? (
                    <span className="paper-penalty-badge paper-penalty-badge--warning">
                      -{paper.negativeMarking} Penalty
                    </span>
                  ) : (
                    <span className="paper-penalty-badge paper-penalty-badge--neutral">
                      No Negative Marking
                    </span>
                  )}
                </div>
              </div>

              <div className="paper-card__body">
                <h3 className="paper-title">{paper.title}</h3>
                <p className="paper-commission">{paper.commission}</p>
                <p className="paper-desc">{paper.description}</p>
              </div>

              {/* Specs & Metrics Pill Strip */}
              <div className="paper-specs-grid">
                <div className="paper-spec-item">
                  <BookIcon width="14" height="14" />
                  <span><strong>{paper.totalMcqs}</strong> MCQs</span>
                </div>
                <div className="paper-spec-item">
                  <TimerIcon width="14" height="14" />
                  <span><strong>{paper.minutes}</strong> Mins</span>
                </div>
                <div className="paper-spec-item paper-spec-item--provenance">
                  <CheckCircleIcon width="14" height="14" />
                  <span>{paper.provenance}</span>
                </div>
              </div>

              {/* High-Contrast Action Hub */}
              <div className="paper-card__actions">
                <Link
                  to={`/mock/${paper.trackId}`}
                  className="paper-btn paper-btn--primary"
                  title="Start realistic timed simulation with interactive OMR sheet"
                >
                  <TrophyIcon width="14" height="14" />
                  <span>Attempt Timed Mock</span>
                  <span aria-hidden="true">→</span>
                </Link>

                <div className="paper-card__sub-actions">
                  <Link
                    to={`/drill?trackId=${paper.trackId}&count=20&autoStart=true`}
                    className="paper-btn paper-btn--secondary"
                    title="Launch a focused 20-question practice sprint"
                  >
                    <SparklesIcon width="14" height="14" />
                    <span>Quick 20</span>
                  </Link>
                  <Link
                    to={`/worksheet?trackId=${paper.trackId}`}
                    className="paper-btn paper-btn--secondary"
                    title="Generate printable PDF worksheet for physical study"
                  >
                    <PrinterIcon width="14" height="14" />
                    <span>Print</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="papers-empty-card">
          <FileTextIcon width="36" height="36" className="papers-empty-icon" />
          <h3>No Past Papers Match Your Filter</h3>
          <p>Try clearing your search query or selecting &quot;All Papers&quot; to view all past exam archives.</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setSearchQuery('')
              setFilterExam('all')
              setFilterNegative('all')
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  )
}
