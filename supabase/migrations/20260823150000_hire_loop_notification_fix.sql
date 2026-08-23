-- ============================================================
-- Hire loop notification fix
--
-- Root cause (see HIRE_LOOP_AUDIT.md): the March 2026 "SECURITY FIX 2"
-- migration (20260327223242) correctly restricted notifications INSERT to
-- `auth.uid() = user_id OR admin`, closing a real spoofing hole. It did not
-- audit its client-side callers: the hire-acceptance flow
-- (OpportunityDashboard.tsx) still tries to insert a notification for the
-- *applicant* while running as the *recruiter*'s session, which RLS now
-- silently rejects. The error is caught and only console.error'd; the
-- caller reports success regardless. The same pattern breaks the reverse
-- direction (applicant notifying the recruiter on apply).
--
-- Fix: move these cross-user notification writes into SECURITY DEFINER
-- RPCs that validate the caller's relationship to the target user
-- themselves (mirroring the existing public.vouch_on_credit pattern),
-- instead of relying on a direct client-side table write. Each RPC also
-- performs its own idempotency check via a dedupe_key, and the accept path
-- performs the entire accept+Studio+notify transition atomically so a
-- double-click or retry cannot create a second Studio or notification.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Idempotency support
-- ------------------------------------------------------------

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedupe_key text;

-- Partial unique index: most notification types never set this, only the
-- RPCs below do, so NULLs (unconstrained by a unique index) are fine.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
  ON public.notifications (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- Ties a Studio (projects row) to the acceptance that created it, so a
-- retried/duplicated accept_application call is a no-op on the second
-- attempt instead of creating a second Studio.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS source_application_id uuid
    REFERENCES public.applications(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_source_application_id
  ON public.projects (source_application_id)
  WHERE source_application_id IS NOT NULL;

-- ------------------------------------------------------------
-- 2. accept_application — atomic accept + Studio + collaborator + notify
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accept_application(_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _application RECORD;
  _opportunity RECORD;
  _existing_project_id uuid;
  _project_id uuid;
  _applicant_name text;
BEGIN
  SELECT * INTO _application FROM public.applications WHERE id = _application_id;
  IF _application IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found');
  END IF;

  SELECT * INTO _opportunity FROM public.opportunities WHERE id = _application.opportunity_id;
  IF _opportunity IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Opportunity not found');
  END IF;

  -- Only the opportunity owner may accept an applicant into it — mirrors
  -- the existing "Opportunity creators can update applications" RLS check.
  IF auth.uid() IS NULL OR auth.uid() <> _opportunity.created_by THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Idempotency: if a Studio already exists for this application (a prior
  -- successful call, or a concurrent/retried one), return it as-is instead
  -- of creating a second Studio, a second collaborator invite, or a second
  -- notification.
  SELECT id INTO _existing_project_id
  FROM public.projects
  WHERE source_application_id = _application_id;

  IF _existing_project_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'project_id', _existing_project_id, 'already_existed', true);
  END IF;

  UPDATE public.applications SET status = 'accepted', updated_at = now()
  WHERE id = _application_id;

  INSERT INTO public.projects (title, description, created_by, status, source_application_id)
  VALUES (
    _opportunity.title,
    'Project created from opportunity: ' || _opportunity.title,
    _opportunity.created_by,
    'active',
    _application_id
  )
  RETURNING id INTO _project_id;

  INSERT INTO public.project_collaborators (project_id, user_id, email, invited_by, role, status, accepted_at)
  VALUES (_project_id, _application.applicant_id, NULL, _opportunity.created_by, 'member', 'accepted', now());

  SELECT COALESCE(full_name, 'there') INTO _applicant_name
  FROM public.profiles WHERE user_id = _application.applicant_id;

  INSERT INTO public.notifications (
    user_id, type, title, message, link, action_url, action_text, priority, category, dedupe_key
  )
  VALUES (
    _application.applicant_id,
    'opportunity',
    'You''re hired! 🎉',
    'You got the gig: ' || _opportunity.title,
    '/desk/' || _project_id::text,
    '/desk/' || _project_id::text,
    'Open Project',
    'high',
    'opportunity',
    'studio-created:' || _project_id::text || ':applicant:' || _application.applicant_id::text
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object('success', true, 'project_id', _project_id, 'already_existed', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_application(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 3. notify_application_status — shortlist/reject (no Studio involved)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_application_status(_application_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _application RECORD;
  _opportunity RECORD;
  _title text;
  _message text;
BEGIN
  IF _status NOT IN ('shortlisted', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  SELECT * INTO _application FROM public.applications WHERE id = _application_id;
  IF _application IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found');
  END IF;

  SELECT * INTO _opportunity FROM public.opportunities WHERE id = _application.opportunity_id;
  IF _opportunity IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Opportunity not found');
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> _opportunity.created_by THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF _status = 'shortlisted' THEN
    _title := 'You''ve been shortlisted ⭐';
    _message := 'You made the shortlist for: ' || _opportunity.title;
  ELSE
    _title := 'Application update';
    _message := 'The poster chose someone else for: ' || _opportunity.title;
  END IF;

  INSERT INTO public.notifications (
    user_id, type, title, message, link, action_url, action_text, priority, category, dedupe_key
  )
  VALUES (
    _application.applicant_id,
    'opportunity',
    _title,
    _message,
    '/opportunity/' || _opportunity.id::text,
    '/opportunity/' || _opportunity.id::text,
    'View',
    'normal',
    'opportunity',
    'app-status:' || _application_id::text || ':' || _status
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_application_status(uuid, text) TO authenticated;

-- ------------------------------------------------------------
-- 4. notify_new_application — reverse direction (apply -> recruiter)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_new_application(_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _application RECORD;
  _opportunity RECORD;
BEGIN
  SELECT * INTO _application FROM public.applications WHERE id = _application_id;
  IF _application IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found');
  END IF;

  -- Only the applicant themselves can trigger the "someone applied"
  -- notification for their own application.
  IF auth.uid() IS NULL OR auth.uid() <> _application.applicant_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT * INTO _opportunity FROM public.opportunities WHERE id = _application.opportunity_id;
  IF _opportunity IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Opportunity not found');
  END IF;

  INSERT INTO public.notifications (
    user_id, type, title, message, link, action_url, action_text, priority, category, dedupe_key
  )
  VALUES (
    _opportunity.created_by,
    'opportunity',
    'New Application Received!',
    'Someone applied to: ' || _opportunity.title,
    '/opportunity-dashboard?opportunity=' || _opportunity.id::text,
    '/opportunity-dashboard?opportunity=' || _opportunity.id::text,
    'View Applicants',
    'normal',
    'opportunity',
    'new-application:' || _application_id::text
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_new_application(uuid) TO authenticated;
