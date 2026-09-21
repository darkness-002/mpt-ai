import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeftIcon, PrinterIcon } from '../components/icons.jsx'
import { useContent } from '../content/contentContext.js'
import './WorksheetScreen.css'

export default function WorksheetScreen() {
  const [searchParams] = useSearchParams()
  const paramTrack = searchParams.get('trackId')
  const { tracks } = useContent()

  const [selectedTrackId, setSelectedTrackId] = useState(() => paramTrack || tracks[0]?.id || '')
  const [questionLimit, setQuestionLimit] = useState(50)
  const [includeKey, setIncludeKey] = useState(true)
  const [includeOMR, setIncludeOMR] = useState(true)

  const activeTrack = tracks.find((t) => t.id === selectedTrackId) ?? tracks[0]

  const worksheetQuestions = useMemo(() => {
    if (!activeTrack) return []
    const flat = activeTrack.units.flatMap((u) =>
      u.lessons.flatMap((l) =>
        l.questions.map((q) => ({
          ...q,
          unitTitle: u.title,
          rtl: u.rtl,
        })),
      ),
    )
    return flat.slice(0, questionLimit)
  }, [activeTrack, questionLimit])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="worksheet-page">
      {/* Configuration Controls (Hidden during print) */}
      <div className="worksheet-controls no-print">
        <div className="worksheet-controls__top">
          <Link to="/" className="back-link">
            <ArrowLeftIcon width="16" height="16" />
            <span>Curriculum</span>
          </Link>
          <button type="button" className="btn btn--primary" onClick={handlePrint}>
            <PrinterIcon width="16" height="16" /> Print / Save as PDF
          </button>
        </div>

        <div className="worksheet-config-card">
          <h1 className="config-title">Printable Worksheet & OMR Generator</h1>
          <p className="config-subtitle">
            Format exam question papers and blank OMR bubble sheets for offline pen-and-paper practice.
          </p>

          <div className="config-row">
            <label className="config-field">
              <span>Select Paper / Track:</span>
              <select
                value={selectedTrackId}
                onChange={(e) => setSelectedTrackId(e.target.value)}
                className="config-select"
              >
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="config-field">
              <span>Number of MCQs:</span>
              <select
                value={questionLimit}
                onChange={(e) => setQuestionLimit(Number(e.target.value))}
                className="config-select"
              >
                <option value={20}>20 MCQs (Quick Test)</option>
                <option value={50}>50 MCQs (Sectional Paper)</option>
                <option value={100}>100 MCQs (Standard Exam)</option>
                <option value={200}>200 MCQs (Full MPT Mock)</option>
              </select>
            </label>

            <div className="config-toggles">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={includeOMR}
                  onChange={(e) => setIncludeOMR(e.target.checked)}
                />
                <span>Include Blank OMR Sheet</span>
              </label>

              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={includeKey}
                  onChange={(e) => setIncludeKey(e.target.checked)}
                />
                <span>Include Answer Key at End</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Paper Document (Rendered for Screen & Print) */}
      <div className="printable-paper">
        {/* Official Header */}
        <header className="paper-top-header">
          <div className="paper-seal">★ CIVIL SERVICES PREPARATION SCREENING TEST ★</div>
          <h1 className="paper-exam-name">{activeTrack?.title || 'SCREENING EXAMINATION'}</h1>
          <div className="paper-meta-row">
            <span>Time Allowed: {Math.round(worksheetQuestions.length * 1.0)} Minutes</span>
            <span>Maximum Marks: {worksheetQuestions.length}</span>
            <span>Negative Marking: {activeTrack?.blueprint?.negativeMarking ?? 'None'}</span>
          </div>
          <div className="candidate-details-box">
            <div className="field-line">
              <span>Candidate Roll No: ____________________</span>
              <span>Candidate Name: ____________________________________</span>
            </div>
            <div className="field-line">
              <span>Center: _______________________________</span>
              <span>Date: ________________________</span>
            </div>
          </div>
          <div className="instructions-box">
            <strong>INSTRUCTIONS FOR CANDIDATES:</strong>
            <ol>
              <li>Attempt all questions. Each question carries 1 mark.</li>
              <li>Fill only one circle per question on the OMR sheet using black/blue ballpoint.</li>
              <li>Read all options carefully before marking your answer.</li>
            </ol>
          </div>
        </header>

        {/* Questions Grid */}
        <div className="paper-questions-grid">
          {worksheetQuestions.map((q, idx) => (
            <div key={idx} className="print-q" dir={q.rtl ? 'rtl' : 'ltr'}>
              <div className="print-q-prompt">
                <strong>Q{idx + 1}.</strong> {q.prompt}
              </div>

              {q.statements && q.statements.length > 0 && (
                <div className="print-q-statements">
                  {q.statements.map((s, sIdx) => (
                    <div key={sIdx}>{s}</div>
                  ))}
                </div>
              )}

              <div className="print-q-choices">
                {q.choices.map((c, cIdx) => (
                  <div key={cIdx} className="print-choice">
                    <strong>({String.fromCharCode(65 + cIdx)})</strong> {c}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Printable OMR Sheet */}
        {includeOMR && (
          <div className="print-page-break print-omr-section">
            <div className="omr-print-header">
              <h2>OPTICAL MARK RECOGNITION (OMR) RESPONSE SHEET</h2>
              <p>Fill circles completely: [●] Correct &nbsp;&nbsp; [X] Incorrect &nbsp;&nbsp; [/] Incorrect</p>
            </div>

            <div className="omr-print-grid">
              {worksheetQuestions.map((_, i) => (
                <div key={i} className="omr-print-row">
                  <span className="omr-num">{i + 1}.</span>
                  <div className="omr-circles">
                    {['A', 'B', 'C', 'D'].map((letter) => (
                      <div key={letter} className="omr-print-bubble">
                        {letter}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Separate Answer Key at End */}
        {includeKey && (
          <div className="print-page-break print-key-section">
            <h2 className="key-header">CONFIDENTIAL OFFICIAL ANSWER KEY</h2>
            <div className="key-grid">
              {worksheetQuestions.map((q, i) => (
                <div key={i} className="key-item">
                  <span className="key-q">Q{i + 1}:</span>
                  <strong className="key-ans">Option {String.fromCharCode(65 + q.answer)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
