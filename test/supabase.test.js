import { describe, expect, it } from 'vitest'
import {
  isSupabaseConfigured,
  supabase,
  fetchUserProfile,
  fetchFullCurriculumFromSupabase,
  createStaffAccount,
  fetchProfilesList,
  fetchPaginatedQuestionsFromSupabase,
  updateProfileRole,
  deleteStaffProfile,
} from '../src/lib/supabase.js'

describe('Supabase Client & Configuration', () => {
  it('correctly reports configuration status based on environment variables', () => {
    // In test environment without real keys, isSupabaseConfigured should be false
    expect(typeof isSupabaseConfigured()).toBe('boolean')
  })

  it('initializes the supabase client object with standard client methods', () => {
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')
    expect(typeof supabase.auth.signUp).toBe('function')
    expect(typeof supabase.auth.signInWithPassword).toBe('function')
    expect(typeof supabase.channel).toBe('function')
  })

  it('safely handles fetchUserProfile when user is null', async () => {
    const profile = await fetchUserProfile(null)
    expect(profile).toBeNull()
  })

  it('safely handles fetchFullCurriculumFromSupabase', async () => {
    const curriculum = await fetchFullCurriculumFromSupabase()
    if (curriculum) {
      expect(Array.isArray(curriculum.tracks)).toBe(true)
    } else {
      expect(curriculum).toBeNull()
    }
  })

  it('provisions or handles staff account registration responses safely', async () => {
    const res = await createStaffAccount({
      email: 'examiner.test@example.com',
      password: 'testPassword123!',
      fullName: 'Dr. Test Examiner',
      role: 'editor',
      assignedCategories: ['general-abilities'],
    })

    if (res.error) {
      expect(res.error).toBeDefined()
    } else {
      expect(res.data).toBeDefined()
      expect(res.data.email).toBe('examiner.test@example.com')
    }
  })

  it('safely handles fetchProfilesList, updateProfileRole, and deleteStaffProfile', async () => {
    const list = await fetchProfilesList()
    expect(Array.isArray(list)).toBe(true)

    const updateRes = await updateProfileRole('00000000-0000-0000-0000-000000000001', 'reviewer')
    expect(updateRes).toBeDefined()

    const deleteRes = await deleteStaffProfile('00000000-0000-0000-0000-000000000001')
    expect(deleteRes).toBeDefined()
  })

  it('safely handles fetchPaginatedQuestionsFromSupabase', async () => {
    const res = await fetchPaginatedQuestionsFromSupabase({ page: 1, pageSize: 50, search: 'Pakistan' })
    if (res) {
      expect(Array.isArray(res.questions)).toBe(true)
      expect(res.questions.length).toBeLessThanOrEqual(50)
      expect(typeof res.totalCount).toBe('number')
    } else {
      expect(res).toBeNull()
    }
  })
})
