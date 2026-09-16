import { describe, expect, it } from 'vitest'

describe('Analytics Weakest Subject Diagnostics Logic', () => {
  const mockTracks = [
    {
      id: 'css-mpt',
      exam: 'CSS',
      title: 'MPT Screening',
      units: [
        {
          id: 'english',
          title: 'English',
          lessons: [{ id: 'eng-1' }, { id: 'eng-2' }],
        },
        {
          id: 'general-abilities',
          title: 'General Abilities',
          lessons: [{ id: 'ga-1' }, { id: 'ga-2' }],
        },
        {
          id: 'islamic-studies',
          title: 'Islamic Studies',
          lessons: [{ id: 'isl-1' }],
        },
      ],
    },
  ]

  function findWeakestSubject(tracks, records) {
    const attempted = []
    for (const track of tracks) {
      for (const unit of track.units) {
        const unitLessons = unit.lessons
        const doneLessons = unitLessons.filter((l) => records[l.id])
        if (doneLessons.length > 0) {
          let unitScore = 0
          let unitTotal = 0
          doneLessons.forEach((l) => {
            const r = records[l.id]
            if (r) {
              unitScore += r.bestScore ?? 0
              unitTotal += r.total ?? 0
            }
          })
          const accuracy = unitTotal > 0 ? Math.round((unitScore / unitTotal) * 100) : 0
          attempted.push({
            trackId: track.id,
            unitId: unit.id,
            unitTitle: unit.title,
            accuracy,
            completed: doneLessons.length,
            totalLessons: unitLessons.length,
          })
        }
      }
    }

    if (attempted.length === 0) {
      const firstTrack = tracks[0]
      const firstUnit = firstTrack?.units?.[0]
      if (firstTrack && firstUnit) {
        return {
          trackId: firstTrack.id,
          unitId: firstUnit.id,
          unitTitle: firstUnit.title,
          isSuggested: true,
        }
      }
      return null
    }

    attempted.sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy
      return a.completed / a.totalLessons - b.completed / b.totalLessons
    })

    return attempted[0]
  }

  it('identifies the unit with lowest accuracy as weakest subject', () => {
    const records = {
      'eng-1': { lessonId: 'eng-1', bestScore: 9, total: 10 }, // 90%
      'ga-1': { lessonId: 'ga-1', bestScore: 4, total: 10 }, // 40% (weakest)
      'isl-1': { lessonId: 'isl-1', bestScore: 8, total: 10 }, // 80%
    }

    const weakest = findWeakestSubject(mockTracks, records)
    expect(weakest).toBeDefined()
    expect(weakest.unitId).toBe('general-abilities')
    expect(weakest.accuracy).toBe(40)
  })

  it('suggests the first core unit when no lessons have been attempted yet', () => {
    const weakest = findWeakestSubject(mockTracks, {})
    expect(weakest).toBeDefined()
    expect(weakest.unitId).toBe('english')
    expect(weakest.isSuggested).toBe(true)
  })
})
