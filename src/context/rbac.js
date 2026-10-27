/**
 * Evaluates role-based access control (RBAC) permissions.
 *
 * Roles:
 * - Admin: Full access to all telemetry, users, and CRUD on all questions/categories.
 * - Editor: Can UPDATE existing questions and add questions. Cannot delete.
 * - Reviewer: Can review and DELETE questions. Cannot edit.
 * - Contributor: Can only INSERT (add) questions to assigned categories. Cannot delete.
 */
export function evaluatePermissions(role, profile = null) {
  const isAdmin = role === 'admin'
  const isEditor = isAdmin || role === 'editor'
  const isReviewer = isAdmin || role === 'reviewer'
  const isContributor = isAdmin || role === 'contributor' || isEditor
  const isStaff = isAdmin || isEditor || isReviewer || role === 'contributor'

  return {
    isAdmin,
    isEditor,
    isReviewer,
    isContributor,
    isStaff,
    canAddQuestion: (categoryId) => {
      if (isAdmin || isEditor) return true
      if (isContributor) {
        if (!categoryId) return true
        const assigned = profile?.assigned_categories || []
        return assigned.length === 0 || assigned.includes(categoryId)
      }
      return false
    },
    canEditQuestion: (_question) => isEditor,
    canDeleteQuestion: (_question) => isReviewer,
    canReviewQuestion: (_question) => isReviewer,
  }
}
