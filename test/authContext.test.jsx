import { describe, expect, it } from 'vitest'
import { evaluatePermissions } from '../src/context/rbac.js'

describe('Role-Based Access Control (RBAC) Permission Rules', () => {
  it('Admin role has unrestricted access to all operations', () => {
    const perms = evaluatePermissions('admin')

    expect(perms.isAdmin).toBe(true)
    expect(perms.isEditor).toBe(true)
    expect(perms.isReviewer).toBe(true)
    expect(perms.isContributor).toBe(true)

    expect(perms.canAddQuestion('any-category')).toBe(true)
    expect(perms.canEditQuestion({})).toBe(true)
    expect(perms.canDeleteQuestion({})).toBe(true)
    expect(perms.canReviewQuestion({})).toBe(true)
  })

  it('Editor role can update existing questions and add questions, but CANNOT delete', () => {
    const perms = evaluatePermissions('editor')

    expect(perms.isAdmin).toBe(false)
    expect(perms.isEditor).toBe(true)
    expect(perms.isReviewer).toBe(false)
    expect(perms.isContributor).toBe(true)

    expect(perms.canAddQuestion('english')).toBe(true)
    expect(perms.canEditQuestion({})).toBe(true)
    expect(perms.canDeleteQuestion({})).toBe(false)
    expect(perms.canReviewQuestion({})).toBe(false)
  })

  it('Reviewer role can review and delete questions, but CANNOT edit or add', () => {
    const perms = evaluatePermissions('reviewer')

    expect(perms.isAdmin).toBe(false)
    expect(perms.isEditor).toBe(false)
    expect(perms.isReviewer).toBe(true)
    expect(perms.isContributor).toBe(false)

    expect(perms.canReviewQuestion({})).toBe(true)
    expect(perms.canDeleteQuestion({})).toBe(true)
    expect(perms.canEditQuestion({})).toBe(false)
    expect(perms.canAddQuestion('urdu')).toBe(false)
  })

  it('Contributor role can only INSERT into assigned categories and CANNOT edit or delete', () => {
    const profile = {
      role: 'contributor',
      assigned_categories: ['general-abilities', 'english'],
    }
    const perms = evaluatePermissions('contributor', profile)

    expect(perms.isAdmin).toBe(false)
    expect(perms.isEditor).toBe(false)
    expect(perms.isReviewer).toBe(false)
    expect(perms.isContributor).toBe(true)

    // Allowed on assigned category
    expect(perms.canAddQuestion('general-abilities')).toBe(true)
    expect(perms.canAddQuestion('english')).toBe(true)
    // Disallowed on unassigned category
    expect(perms.canAddQuestion('urdu')).toBe(false)

    // Strict no-edit, no-delete for contributor
    expect(perms.canEditQuestion({})).toBe(false)
    expect(perms.canDeleteQuestion({})).toBe(false)
  })
})
