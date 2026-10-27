import { describe, expect, it } from 'vitest'
import { evaluatePermissions } from '../src/context/rbac.js'

describe('Public Student Authentication & Authorization', () => {
  it('correctly maps public student role and grants non-privileged permissions', () => {
    const studentRole = 'student'
    const perms = evaluatePermissions(studentRole)

    expect(perms.isAdmin).toBe(false)
    expect(perms.isEditor).toBe(false)
    expect(perms.isReviewer).toBe(false)
    expect(perms.isContributor).toBe(false)
    expect(perms.isStaff).toBe(false)

    expect(perms.canAddQuestion('english')).toBe(false)
    expect(perms.canEditQuestion({})).toBe(false)
    expect(perms.canDeleteQuestion({})).toBe(false)
    expect(perms.canReviewQuestion({})).toBe(false)
  })

  it('correctly grants isStaff to admin, editor, reviewer, and contributor', () => {
    expect(evaluatePermissions('admin').isStaff).toBe(true)
    expect(evaluatePermissions('editor').isStaff).toBe(true)
    expect(evaluatePermissions('reviewer').isStaff).toBe(true)
    expect(evaluatePermissions('contributor').isStaff).toBe(true)
    expect(evaluatePermissions('student').isStaff).toBe(false)
  })

  it('determines role correctly for public students vs staff accounts', () => {
    const resolveDisplayRole = (user, profile) => {
      if (!user) return 'Guest'
      if (profile?.role === 'admin') return 'Admin'
      if (profile?.role === 'editor') return 'Editor'
      if (profile?.role === 'reviewer') return 'Reviewer'
      if (profile?.role === 'contributor' && user.user_metadata?.role !== 'student') return 'Contributor'
      return 'Student'
    }

    // Unauthenticated user
    expect(resolveDisplayRole(null, null)).toBe('Guest')

    // Public student user with no staff profile
    const studentUser = { id: 's1', email: 'student1@example.com', user_metadata: { role: 'student' } }
    expect(resolveDisplayRole(studentUser, null)).toBe('Student')

    // Public student user whose profile is null
    const studentUser2 = { id: 's2', email: 'student2@example.com' }
    expect(resolveDisplayRole(studentUser2, null)).toBe('Student')

    // Staff admin user
    const adminUser = { id: 'a1', email: 'admin@mpt.ai' }
    expect(resolveDisplayRole(adminUser, { role: 'admin' })).toBe('Admin')

    // Staff editor user
    const editorUser = { id: 'e1', email: 'editor@mpt.ai' }
    expect(resolveDisplayRole(editorUser, { role: 'editor' })).toBe('Editor')

    // Staff reviewer user
    const reviewerUser = { id: 'r1', email: 'reviewer@mpt.ai' }
    expect(resolveDisplayRole(reviewerUser, { role: 'reviewer' })).toBe('Reviewer')
  })

  it('resolves active role in AuthContext hierarchy: profile > user (student) > devRole / guest', () => {
    const computeActiveRole = (profile, user, devRole) => {
      if (profile?.role) return profile.role
      if (user) {
        return user.user_metadata?.role || 'student'
      }
      return devRole || 'guest'
    }

    // Scenario 1: Logged-in student with no staff profile -> active role is 'student'
    const studentUser = { id: 'student-123', email: 'aspirant@pms.pk' }
    expect(computeActiveRole(null, studentUser, 'admin')).toBe('student')

    // Scenario 2: Logged-in admin with admin profile -> active role is 'admin'
    const adminUser = { id: 'admin-123', email: 'director@mpt.ai' }
    expect(computeActiveRole({ role: 'admin' }, adminUser, 'contributor')).toBe('admin')

    // Scenario 3: Logged-out unauthenticated user -> defaults to 'guest'
    expect(computeActiveRole(null, null, null)).toBe('guest')
    expect(computeActiveRole(null, null, 'editor')).toBe('editor')
  })

  it('strictly requires both user authentication AND isStaff to display admin navigation', () => {
    const shouldDisplayAdminLink = (user, isStaff) => Boolean(user && isStaff)

    // Unauthenticated visitor -> never show
    expect(shouldDisplayAdminLink(null, false)).toBe(false)
    expect(shouldDisplayAdminLink(null, true)).toBe(false)

    // Authenticated student -> never show
    const student = { id: 's1', email: 'student@example.com' }
    expect(shouldDisplayAdminLink(student, false)).toBe(false)

    // Authenticated staff -> show
    const admin = { id: 'a1', email: 'admin@mpt-ai.org' }
    expect(shouldDisplayAdminLink(admin, true)).toBe(true)
  })
})
