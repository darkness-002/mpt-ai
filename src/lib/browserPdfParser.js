import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'

// Set standard pdfjs worker source if needed or rely on bundled build
if (typeof window !== 'undefined' && !GlobalWorkerOptions.workerSrc) {
  // In modern bundlers, pdfjs-dist legacy build can execute in main thread if worker is empty
  GlobalWorkerOptions.workerSrc = ''
}

function splitOptions(items) {
  const segments = []
  for (const item of items) {
    const parts = item.str.split(/(?=\([a-d]\)\s)/)
    let cursor = item.x
    for (const part of parts) {
      const share = item.str.length ? (part.length / item.str.length) * item.width : 0
      const marker = part.match(/^\(([a-d])\)\s*/)
      if (marker) {
        segments.push({ text: part.slice(marker[0].length), font: item.font, end: cursor + share })
      } else if (segments.length) {
        const last = segments[segments.length - 1]
        last.text += part
        last.end = cursor + share
      }
      cursor += share
    }
  }
  return segments
}

export async function parsePdfInBrowser(arrayBuffer) {
  const pdf = await getDocument({ data: new Uint8Array(arrayBuffer), useSystemFonts: true }).promise
  const lines = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const { items } = await page.getTextContent()
    let current = null
    for (const item of items) {
      if (!item.str) continue
      const y = Math.round(item.transform[5])
      if (!current || Math.abs(current.y - y) > 3) {
        if (current) lines.push(current)
        current = { y, items: [] }
      }
      current.items.push({ str: item.str, font: item.fontName, x: item.transform[4], width: item.width })
    }
    if (current) lines.push(current)
  }

  const rawLines = lines.map((line) => ({ ...line, text: line.items.map((i) => i.str).join('').trim() }))

  const questions = []
  let section = 'General'
  let directive = null
  let q = null
  let sawOption = false

  const flush = () => {
    if (q && q.options.length) questions.push(q)
    q = null
  }

  for (const line of rawLines) {
    const text = line.text
    if (!text) continue

    const start = text.match(/^(\d{1,3})\.\s*(.*)$/)
    if (start) {
      flush()
      q = { number: Number(start[1]), section, directive, prompt: start[2].trim(), options: [] }
      sawOption = false
      if (/^\([a-d]\)\s/.test(q.prompt)) {
        const offset = line.items.findIndex((i) => /\([a-d]\)/.test(i.str))
        q.options.push(...splitOptions(line.items.slice(offset < 0 ? 0 : offset)))
        q.prompt = ''
        sawOption = true
      }
      continue
    }

    if (/^\([a-d]\)\s/.test(text)) {
      if (q) {
        q.options.push(...splitOptions(line.items))
        sawOption = true
      }
      continue
    }

    if (q && !sawOption) {
      q.prompt = `${q.prompt} ${text}`.trim()
    } else {
      directive = text
      flush()
    }
  }
  flush()

  // Detect bold font key
  const tally = new Map()
  questions.forEach((item) => item.options.forEach((o) => tally.set(o.font, (tally.get(o.font) || 0) + 1)))
  const regularFont = tally.size > 1 ? [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0] : null

  return questions.map((item) => {
    const opts = item.options.map((o) => o.text.replace(/\s+/g, ' ').trim())
    const boldIndex = regularFont
      ? item.options.findIndex((o) => o.font !== regularFont)
      : -1

    return {
      id: `custom-pdf-${Date.now()}-${item.number}`,
      prompt: item.prompt || item.directive || '',
      choices: opts.length >= 2 ? opts : ['', '', '', ''],
      answer: boldIndex >= 0 ? boldIndex : -1,
      directive: item.directive || undefined,
      explanation: '',
    }
  })
}

/** Parses plain text format (e.g. 1. Prompt \n A) Opt1 \n B) Opt2 \n Answer: A) */
export function parsePlainTextQuestions(text) {
  const blocks = text.split(/\n\s*\n/)
  const result = []

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 3) continue

    const promptLine = lines[0].replace(/^\d+[.)]\s*/, '')
    const choices = []
    let answer = -1
    let explanation = ''

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const choiceMatch = line.match(/^([A-Da-d\d])[.)]\s*(.*)$/)
      const ansMatch = line.match(/^(?:Answer|Key|Correct):\s*([A-Da-d\d])/i)
      const expMatch = line.match(/^(?:Explanation|Why):\s*(.*)$/i)

      if (choiceMatch) {
        choices.push(choiceMatch[2])
      } else if (ansMatch) {
        const letter = ansMatch[1].toUpperCase()
        if (letter === 'A' || letter === '1') answer = 0
        else if (letter === 'B' || letter === '2') answer = 1
        else if (letter === 'C' || letter === '3') answer = 2
        else if (letter === 'D' || letter === '4') answer = 3
      } else if (expMatch) {
        explanation = expMatch[1]
      }
    }

    if (promptLine && choices.length >= 2) {
      result.push({
        id: `custom-pasted-${Date.now()}-${result.length + 1}`,
        prompt: promptLine,
        choices,
        answer,
        explanation,
      })
    }
  }

  return result
}
