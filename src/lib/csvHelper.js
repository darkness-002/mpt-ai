/**
 * CSV Import and Export Utilities for Civil Services Exam Questions
 */

export function exportQuestionsToCsv(questions) {
  const headers = ['Prompt', 'Choice A', 'Choice B', 'Choice C', 'Choice D', 'Correct Answer', 'Explanation', 'Subject']
  
  const escapeCell = (text) => {
    if (text == null) return '""'
    const str = String(text).replace(/"/g, '""')
    return `"${str}"`
  }

  const rows = questions.map((q) => {
    const choices = q.choices || []
    const answerLetter = Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4
      ? String.fromCharCode(65 + q.answer)
      : ''

    return [
      escapeCell(q.prompt),
      escapeCell(choices[0] || ''),
      escapeCell(choices[1] || ''),
      escapeCell(choices[2] || ''),
      escapeCell(choices[3] || ''),
      escapeCell(answerLetter),
      escapeCell(q.explanation || ''),
      escapeCell(q._subject || q.subject || 'General Knowledge'),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

export function parseCsvQuestions(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length <= 1) return []

  // Check and skip header
  const dataLines = lines[0].toLowerCase().includes('prompt') ? lines.slice(1) : lines
  const parsedQuestions = []

  for (const line of dataLines) {
    // Regex to parse comma-separated values respecting quoted strings
    const cells = []
    let inQuotes = false
    let currentCell = ''

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentCell += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(currentCell.trim())
        currentCell = ''
      } else {
        currentCell += char
      }
    }
    cells.push(currentCell.trim())

    if (cells.length < 3) continue // Skip invalid row

    const prompt = cells[0] || ''
    if (!prompt) continue

    const choices = [cells[1] || '', cells[2] || '', cells[3] || '', cells[4] || ''].filter(Boolean)
    const rawAnswer = (cells[5] || '').toUpperCase()
    let answerIndex = -1

    if (rawAnswer === 'A' || rawAnswer === '1') answerIndex = 0
    else if (rawAnswer === 'B' || rawAnswer === '2') answerIndex = 1
    else if (rawAnswer === 'C' || rawAnswer === '3') answerIndex = 2
    else if (rawAnswer === 'D' || rawAnswer === '4') answerIndex = 3

    const explanation = cells[6] || ''

    parsedQuestions.push({
      prompt,
      choices,
      answer: answerIndex,
      explanation,
    })
  }

  return parsedQuestions
}
