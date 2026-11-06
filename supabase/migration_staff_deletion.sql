-- ==============================================================================
-- MPT-AI Database Migration: Staff Deletion RLS & Secure RPC Function
-- ==============================================================================

-- 1. Ensure RLS is enabled on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Add DELETE policy on public.profiles for admins
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- 3. Create secure RPC function to delete a staff account from both auth.users and public.profiles
CREATE OR REPLACE FUNCTION public.delete_staff_member(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verify calling user is an administrator
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can remove staff accounts.';
  END IF;

  -- Prevent admin from deleting their own active account
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Forbidden: You cannot delete your own admin account.';
  END IF;

  -- Delete from auth.users (cascades to public.profiles via foreign key)
  DELETE FROM auth.users WHERE id = target_user_id;

  -- Ensure row in public.profiles is also deleted if not cascaded
  DELETE FROM public.profiles WHERE id = target_user_id;
END;
$$;

-- Grant execution permission to authenticated users (function body enforces admin check)
GRANT EXECUTE ON FUNCTION public.delete_staff_member(UUID) TO authenticated;
