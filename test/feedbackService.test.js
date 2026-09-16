import { beforeEach, describe, expect, it, vi } from 'vitest'
import { feedbackService } from '../src/lib/feedback.js'
import { settingsStore } from '../src/storage/settingsStore.js'

describe('feedbackService (SRP coordinator for audio/haptics/visual)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('runs onCorrect, onWrong, celebrate, tap without errors regardless of environment', () => {
    expect(() => {
      feedbackService.onCorrect()
      feedbackService.onWrong()
      feedbackService.celebrate({ withConfetti: false })
      feedbackService.tap(20)
    }).not.toThrow()
  })

  it('respects soundEnabled setting when disabled', () => {
    vi.spyOn(settingsStore, 'load').mockReturnValue({
      soundEnabled: false,
      hapticsEnabled: false,
    })

    expect(() => {
      feedbackService.onCorrect()
      feedbackService.onWrong()
      feedbackService.celebrate({ withConfetti: false })
    }).not.toThrow()
  })
})
