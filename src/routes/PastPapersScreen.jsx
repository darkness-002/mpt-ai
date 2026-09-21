import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  BookIcon,
  CheckCircleIcon,
  FileTextIcon,
  PrinterIcon,
  TimerIcon,
} from '../components/icons.jsx'
import './PastPapersScreen.css'

export default function PastPapersScreen() {
  const [filterExam, setFilterExam] = useState('all')

  const pastPapersList = [
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
      description: 'Official CSS Screening Test including English, General Abilities, GK, and Urdu.',
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
      description: 'Full-length screening test paper for the CSS Competitive Examination 2025.',
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
      description: 'Complete 200 MCQs covering General Knowledge, Everyday Science, Math, and English.',
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
      description: 'Part-I objective MCQs extracted from CSS written compulsory examination papers.',
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
      description: 'General Knowledge paper with 0.25 negative marking per incorrect response.',
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
      description: 'Official provincial management service general knowledge screening paper.',
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
      description: 'Past screening test with negative marking penalty and official answer key.',
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
      description: 'UPSC GS Paper I covering Indian Polity, History, Environment, Economy, and Science.',
    },
  ]

  const filtered = filterExam === 'all'
    ? pastPapersList
    : pastPapersList.filter((p) => p.exam === filterExam)

  return (
    <div className="papers-page">
      <div className="papers-header">
        <Link to="/" className="back-link">
          <ArrowLeftIcon width="16" height="16" />
          <span>Curriculum</span>
        </Link>
        <div className="papers-title-wrap">
          <FileTextIcon width="24" height="24" style={{ color: 'var(--blue)' }} />
          <h1>Past Papers Vault (2013–2026)</h1>
        </div>
        <p className="papers-subtitle">
          Authentic screening test past papers with official examiner keys, negative marking settings, and printable question papers.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="papers-filter-bar">
        <button
          type="button"
          className={`paper-filter-btn ${filterExam === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilterExam('all')}
        >
          All Papers ({pastPapersList.length})
        </button>
        <button
          type="button"
          className={`paper-filter-btn ${filterExam === 'CSS' ? 'is-active' : ''}`}
          onClick={() => setFilterExam('CSS')}
        >
          CSS MPT & Compulsory
        </button>
        <button
          type="button"
          className={`paper-filter-btn ${filterExam === 'PMS' ? 'is-active' : ''}`}
          onClick={() => setFilterExam('PMS')}
        >
          PMS Prelims (PPSC)
        </button>
        <button
          type="button"
          className={`paper-filter-btn ${filterExam === 'UPSC' ? 'is-active' : ''}`}
          onClick={() => setFilterExam('UPSC')}
        >
          UPSC CSE Prelims
        </button>
      </div>

      {/* Papers Grid */}
      <div className="papers-grid">
        {filtered.map((paper) => (
          <div key={paper.id} className="paper-card">
            <div className="paper-card__header">
              <span className="paper-year-pill">{paper.year}</span>
              <span className="paper-exam-badge">{paper.exam}</span>
            </div>

            <h3 className="paper-title">{paper.title}</h3>
            <p className="paper-commission">{paper.commission}</p>
            <p className="paper-desc">{paper.description}</p>

            <div className="paper-meta-chips">
              <span className="chip">
                <BookIcon width="13" height="13" /> {paper.totalMcqs} MCQs
              </span>
              <span className="chip">
                <TimerIcon width="13" height="13" /> {paper.minutes} Mins
              </span>
              <span className="chip">
                <CheckCircleIcon width="13" height="13" style={{ color: 'var(--green)' }} /> {paper.provenance}
              </span>
              {paper.negativeMarking > 0 && (
                <span className="chip chip--penalty">
                  -{paper.negativeMarking} Penalty
                </span>
              )}
            </div>

            <div className="paper-card__actions">
              <Link to={`/mock/${paper.trackId}`} className="btn btn--small btn--primary">
                Attempt Timed Mock →
              </Link>
              <Link to={`/drill?trackId=${paper.trackId}&count=20&autoStart=true`} className="btn btn--small btn--ghost">
                Practice 20 MCQs
              </Link>
              <Link to={`/worksheet?trackId=${paper.trackId}`} className="btn btn--small btn--ghost" title="Print Paper Worksheet">
                <PrinterIcon width="14" height="14" /> Print
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
