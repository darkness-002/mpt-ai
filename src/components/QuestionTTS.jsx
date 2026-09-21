import { useEffect, useState } from 'react'
import { SpeakerIcon, VolumeXIcon } from './icons.jsx'

export default function QuestionTTS({ question }) {
  const [speaking, setSpeaking] = useState(false)
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    // When question changes, cancel previous speech
    if (isSupported && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }, [question?.id, isSupported])

  useEffect(() => {
    return () => {
      if (isSupported && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isSupported])

  if (!isSupported || !question) return null

  const handleToggle = (e) => {
    e.stopPropagation()
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }

    window.speechSynthesis.cancel()

    // Formulate text to read
    const parts = []
    if (question.directive) parts.push(question.directive)
    if (question.prompt) parts.push(question.prompt)
    if (question.statements && question.statements.length > 0) {
      parts.push(question.statements.join('. '))
    }
    if (question.choices && question.choices.length > 0) {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F']
      const choicesText = question.choices
        .map((c, i) => `Option ${letters[i] || i + 1}: ${c}`)
        .join('. ')
      parts.push(choicesText)
    }

    const text = parts.join('. ')
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.0

    // Check language (Urdu if question is RTL)
    if (question.rtl) {
      utterance.lang = 'ur-PK'
    } else {
      utterance.lang = 'en-US'
    }

    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <button
      type="button"
      className={`tts-btn ${speaking ? 'is-speaking' : ''}`}
      onClick={handleToggle}
      title={speaking ? 'Stop read aloud' : 'Read question aloud'}
      aria-label={speaking ? 'Stop read aloud' : 'Read question aloud'}
    >
      {speaking ? <VolumeXIcon width="16" height="16" /> : <SpeakerIcon width="16" height="16" />}
      <span className="tts-label">{speaking ? 'Stop Audio' : 'Listen'}</span>
    </button>
  )
}
