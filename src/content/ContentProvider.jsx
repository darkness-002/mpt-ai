import { useCallback, useEffect, useMemo, useState } from 'react'
import { ContentContext } from './contentContext.js'
import { buildCustomTracks } from './buildCustom.js'
import { loadBundledCurriculum } from '../data/curriculum.js'
import { contentStore } from '../storage/contentStore.js'

/**
 * Merges the bundled question bank with author-created content,
 * serving a unified, asynchronously loaded curriculum view to all screens.
 */
export function ContentProvider({ children }) {
  const [custom, setCustom] = useState({ categories: [], questions: [] })
  const [bundled, setBundled] = useState({ tracks: [], exams: [], lessons: [], totalQuestions: 0 })
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const [loadedCustom, loadedBundled] = await Promise.all([
      contentStore.load(),
      loadBundledCurriculum(),
    ])
    setCustom(loadedCustom)
    setBundled(loadedBundled)
    setReady(true)
    return loadedCustom
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([contentStore.load(), loadBundledCurriculum()]).then(
      ([loadedCustom, loadedBundled]) => {
        if (cancelled) return
        setCustom(loadedCustom)
        setBundled(loadedBundled)
        setReady(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => {
    const customTracks = buildCustomTracks(custom.categories, custom.questions)
    const tracks = [...(bundled.tracks ?? []), ...customTracks]

    const examOrder = [...(bundled.exams ?? [])]
    for (const track of customTracks) {
      if (!examOrder.some((exam) => exam.id === track.exam)) {
        examOrder.push({ id: track.exam, title: track.exam, blurb: '' })
      }
    }

    const lessons = tracks.flatMap((track) => track.units.flatMap((unit) => unit.lessons))
    const byId = new Map(lessons.map((lesson, index) => [lesson.id, { ...lesson, index }]))

    return {
      ready,
      tracks,
      exams: examOrder,
      lessons,
      categories: custom.categories,
      customQuestions: custom.questions,
      totalQuestions: lessons.reduce((n, lesson) => n + lesson.questions.length, 0),
      refresh,
      getTrack: (trackId) => tracks.find((track) => track.id === trackId) ?? null,
      getLesson: (lessonId) => byId.get(lessonId) ?? null,
      getNextLesson: (lessonId) => {
        const current = byId.get(lessonId)
        if (!current) return null
        const next = lessons[current.index + 1]
        return next && next.unitId === current.unitId ? next : null
      },
      /** Units unlock independently, so only the previous lesson in the unit gates. */
      getPrerequisite: (lessonId) => {
        const current = byId.get(lessonId)
        if (!current || current.indexInUnit === 0) return null
        return (
          lessons.find(
            (l) => l.unitId === current.unitId && l.indexInUnit === current.indexInUnit - 1,
          ) ?? null
        )
      },
    }
  }, [bundled, custom, ready, refresh])

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}
