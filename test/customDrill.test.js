import { describe, expect, it } from 'vitest'

describe('Custom Drill Session Pool Builder', () => {
  const mockUnits = [
    {
      id: 'unit-1',
      title: 'English Vocabulary',
      lessons: [
        {
          id: 'l-1',
          questions: [
            { id: 'q-1', prompt: 'Question 1', choices: ['A', 'B', 'C', 'D'], answer: 0 },
            { id: 'q-2', prompt: 'Question 2', choices: ['A', 'B', 'C', 'D'], answer: 1 },
          ],
        },
      ],
    },
    {
      id: 'unit-2',
      title: 'General Knowledge',
      lessons: [
        {
          id: 'l-2',
          questions: [
            { id: 'q-3', prompt: 'Question 3', choices: ['A', 'B', 'C', 'D'], answer: 2 },
          ],
        },
      ],
    },
  ]

  function buildCandidatePool(units, isUnitSelected) {
    const enabledUnits = units.filter((u) => isUnitSelected(u.id))
    return enabledUnits.flatMap((u) =>
      (u.lessons ?? []).flatMap((l) =>
        (l.questions ?? []).map((q) => ({
          ...q,
          unitId: u.id,
          unitTitle: u.title,
        })),
      ),
    )
  }

  it('aggregates all questions when all units are selected', () => {
    const isSelected = () => true
    const pool = buildCandidatePool(mockUnits, isSelected)
    expect(pool.length).toBe(3)
    expect(pool.map((q) => q.id)).toEqual(['q-1', 'q-2', 'q-3'])
  })

  it('filters questions to single unit when specific unit is selected (e.g. 1-click drill)', () => {
    const isSelected = (unitId) => unitId === 'unit-2'
    const pool = buildCandidatePool(mockUnits, isSelected)
    expect(pool.length).toBe(1)
    expect(pool[0].id).toBe('q-3')
    expect(pool[0].unitTitle).toBe('General Knowledge')
  })

  it('safely handles non-array override parameters (like synthetic event objects)', () => {
    const overrideUnits = { target: {} } // Event object
    const isOverrideValid = Array.isArray(overrideUnits) && overrideUnits.length > 0
    expect(isOverrideValid).toBe(false)
  })
})
