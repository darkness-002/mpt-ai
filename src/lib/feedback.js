import { fireConfetti } from './confetti.js'
import { playCelebrationSound, playSuccessSound, playWrongSound, triggerHaptic } from './sound.js'
import { settingsStore } from '../storage/settingsStore.js'

/**
 * Unified Feedback Service adhering to Single Responsibility Principle (SRP).
 * Encapsulates audio, haptic, and visual feedback mechanisms based on user settings.
 */
export const feedbackService = {
  /**
   * Triggers feedback when user provides a correct answer.
   */
  onCorrect() {
    const settings = settingsStore.load()
    if (settings.soundEnabled) {
      playSuccessSound()
    }
    if (settings.hapticsEnabled) {
      triggerHaptic(40)
    }
  },

  /**
   * Triggers feedback when user provides an incorrect answer.
   */
  onWrong() {
    const settings = settingsStore.load()
    if (settings.soundEnabled) {
      playWrongSound()
    }
    if (settings.hapticsEnabled) {
      triggerHaptic([40, 80, 40])
    }
  },

  /**
   * Triggers celebration feedback (confetti, chime, haptics) on mastery or high score.
   */
  celebrate({ withConfetti = true, durationMs = 2500 } = {}) {
    if (withConfetti) {
      fireConfetti(durationMs)
    }
    const settings = settingsStore.load()
    if (settings.soundEnabled) {
      playCelebrationSound()
    }
    if (settings.hapticsEnabled) {
      triggerHaptic([50, 100, 50, 100, 150])
    }
  },

  /**
   * Light haptic feedback for UI interactions.
   */
  tap(pattern = 30) {
    const settings = settingsStore.load()
    if (settings.hapticsEnabled) {
      triggerHaptic(pattern)
    }
  },
}
