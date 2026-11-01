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
  const [questionLimit, setQuestionLimit] = useState(100)
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
          rtl: Boolean(u.rtl || q.rtl),
        })),
      ),
    )
    return flat.slice(0, questionLimit)
  }, [activeTrack, questionLimit])

  const handlePrint = () => {
    window.print()
  }

  const negativeMarkingRule = activeTrack?.blueprint?.negativeMarking
    ? `-${activeTrack.blueprint.negativeMarking} Marks per incorrect answer`
    : 'No negative marking (0.00)'

  return (
    <div className="worksheet-page">
      {/* 1. SCREEN CONFIGURATION CONTROLS (Hidden during print) */}
      <div className="worksheet-controls no-print">
        <div className="worksheet-controls__top">
          <Link to="/" className="back-link">
            <ArrowLeftIcon width="16" height="16" />
            <span>Curriculum Dashboard</span>
          </Link>
          <button type="button" className="btn btn--primary print-trigger-btn" onClick={handlePrint}>
            <PrinterIcon width="18" height="18" />
            <span>Print / Save A4 PDF</span>
          </button>
        </div>

        <div className="worksheet-config-card">
          <div className="config-header">
            <h1 className="config-title">Printable Exam Paper & OMR Generator</h1>
            <p className="config-subtitle">
              Generates black-and-white, print-perfect A4 examination papers and official optical mark response (OMR) sheets with corner registration marks for physical exam room practice.
            </p>
          </div>

          <div className="config-row">
            <label className="config-field">
              <span className="field-lbl">Target Syllabus / Paper:</span>
              <select
                value={selectedTrackId}
                onChange={(e) => setSelectedTrackId(e.target.value)}
                className="config-select"
              >
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.exam})
                  </option>
                ))}
              </select>
            </label>

            <label className="config-field">
              <span className="field-lbl">Paper Length:</span>
              <select
                value={questionLimit}
                onChange={(e) => setQuestionLimit(Number(e.target.value))}
                className="config-select"
              >
                <option value={20}>20 MCQs (Quick Sectional)</option>
                <option value={50}>50 MCQs (Half Mock)</option>
                <option value={100}>100 MCQs (PMS Prelims Standard)</option>
                <option value={200}>200 MCQs (Full CSS MPT Mock)</option>
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
                <span>Include Official Key Page</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRINTABLE DOCUMENT (A4 BLACK & WHITE LAYOUT) */}
      <div className="printable-paper">
        {/* Official Paper Header */}
        <header className="paper-top-header">
          <div className="paper-seal">★ FEDERAL / PROVINCIAL PUBLIC SERVICE COMMISSION ★</div>
          <h1 className="paper-exam-name">{activeTrack?.title || 'SCREENING EXAMINATION'}</h1>
          <div className="paper-exam-sub">COMPETITIVE EXAMINATION FOR RECRUITMENT TO BS-17 POSTS</div>

          <div className="paper-meta-row">
            <span><strong>Time Allowed:</strong> {Math.round(worksheetQuestions.length * 1.0)} Minutes</span>
            <span><strong>Total MCQs:</strong> {worksheetQuestions.length}</span>
            <span><strong>Maximum Marks:</strong> {worksheetQuestions.length}</span>
            <span><strong>Marking:</strong> {negativeMarkingRule}</span>
          </div>

          <div className="candidate-details-box">
            <div className="field-line">
              <span><strong>Roll No:</strong> _______________________</span>
              <span><strong>Candidate Name:</strong> ____________________________________</span>
            </div>
            <div className="field-line">
              <span><strong>Examination Center:</strong> ________________________________</span>
              <span><strong>Date:</strong> ________________________</span>
            </div>
          </div>

          <div className="instructions-box">
            <strong>IMPORTANT INSTRUCTIONS FOR CANDIDATES:</strong>
            <ol>
              <li>Attempt all questions. Each question carries 1 mark.</li>
              <li>Fill only one bubble per question on the provided Optical Mark Recognition (OMR) response sheet using black or blue ballpoint pen.</li>
              <li>Cutting, erasing, double bubbling, or use of correcting fluid on the OMR sheet will lead to question invalidation.</li>
              <li>Negative marking rules apply as indicated above. Do not guess blindly if penalty is enforced.</li>
            </ol>
          </div>
        </header>

        {/* Questions Grid: Two-Column Print Layout */}
        <div className="paper-questions-grid">
          {worksheetQuestions.map((q, idx) => (
            <article key={idx} className="print-q" dir={q.rtl ? 'rtl' : 'ltr'}>
              <div className="print-q-prompt">
                <span className="print-q-num">Q{idx + 1}.</span> {q.prompt}
              </div>

              {q.statements && q.statements.length > 0 && (
                <div className="print-q-statements">
                  {q.statements.map((s, sIdx) => (
                    <div key={sIdx} className="statement-line">
                      {s}
                    </div>
                  ))}
                </div>
              )}

              <div className="print-q-choices">
                {q.choices.map((c, cIdx) => (
                  <div key={cIdx} className="print-choice">
                    <span className="print-choice-key">({String.fromCharCode(65 + cIdx)})</span> {c}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* 3. BLANK OMR RESPONSE SHEET WITH CORNER REGISTRATION MARKS */}
        {includeOMR && (
          <div className="print-page-break print-omr-section">
            {/* OMR Corner Registration Alignment Marks */}
            <div className="omr-reg-corner omr-reg-tl" aria-hidden="true" />
            <div className="omr-reg-corner omr-reg-tr" aria-hidden="true" />
            <div className="omr-reg-corner omr-reg-bl" aria-hidden="true" />
            <div className="omr-reg-corner omr-reg-br" aria-hidden="true" />

            {/* OMR Header */}
            <div className="omr-print-header">
              <div className="omr-header-seal">OPTICAL MARK RECOGNITION (OMR) RESPONSE SHEET</div>
              <h2>{activeTrack?.title || 'CIVIL SERVICES SCREENING TEST'}</h2>
              <div className="omr-candidate-strip">
                <span>ROLL NO: [ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</span>
                <span>SIGNATURE: __________________________</span>
              </div>
              <div className="omr-marking-guide">
                <span>CORRECT: <span className="bubble-sample filled">●</span></span>
                <span>WRONG: <span className="bubble-sample">✕</span></span>
                <span>WRONG: <span className="bubble-sample">✔</span></span>
                <span>WRONG: <span className="bubble-sample">◐</span></span>
                <span className="guide-note">Use Black/Blue Ballpoint only. Do not fold or staple.</span>
              </div>
            </div>

            {/* OMR Matrix Grid */}
            <div className="omr-print-grid">
              {worksheetQuestions.map((_, i) => (
                <div key={i} className="omr-print-row">
                  <span className="omr-num">{i + 1}</span>
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

            {/* Official Examiner Footer */}
            <div className="omr-footer-strip">
              <span>INVIGILATOR SIGNATURE: _______________________</span>
              <span>TOTAL MARKS OBTAINED: [ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; / {worksheetQuestions.length} ]</span>
            </div>
          </div>
        )}

        {/* 4. CONFIDENTIAL ANSWER KEY PAGE */}
        {includeKey && (
          <div className="print-page-break print-key-section">
            <div className="key-header-box">
              <span className="key-confidential-tag">STRICTLY CONFIDENTIAL — FOR EXAMINER USE ONLY</span>
              <h2 className="key-title">OFFICIAL ANSWER KEY & EXPLANATIONS</h2>
              <span className="key-meta">{activeTrack?.title} • {worksheetQuestions.length} Questions</span>
            </div>

            <div className="key-grid">
              {worksheetQuestions.map((q, i) => (
                <div key={i} className="key-item">
                  <span className="key-q">Q{i + 1}</span>
                  <strong className="key-ans">({String.fromCharCode(65 + q.answer)})</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
