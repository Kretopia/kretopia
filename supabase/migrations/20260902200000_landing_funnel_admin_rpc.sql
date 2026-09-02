-- Landing conversion funnel for the admin dashboard (Kreto/Stage/Recordings/
-- Landing sprint, §8). Mirrors get_creative_action_funnels' exact pattern
-- (SECURITY DEFINER + has_role admin gate + STABLE + GRANT to authenticated,
-- relying on the internal check rather than a narrower grant) so this
-- doesn't introduce a second authorization style for admin RPCs.
--
-- Sessions, not users: Landing visitors are mostly unauthenticated, so every
-- stage counts DISTINCT session_id from analytics_events (event_category =
-- 'landing'), the same session_id landingMetrics.ts/analytics.ts already
-- write on every event via getSessionId().
--
-- PREPARED ONLY -- not applied. Per this session's standing rule, no
-- migration is pushed without your explicit go-ahead.

CREATE OR REPLACE FUNCTION public.get_landing_funnel(
  _start timestamptz DEFAULT (now() - interval '30 days'),
  _end timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  f_visited int;      -- landing_section_viewed, section = 'hero'
  f_first_chapter int; -- landing_section_viewed, section = 'chapter-passport'
  f_cta_clicked int;   -- cta_click
  f_auth_reached int;  -- signup_attempt or signin_attempt
  f_signup_attempted int;
  f_signup_succeeded int;
  by_section jsonb;
  by_cta jsonb;
  by_entry_source jsonb;
  total_sessions int;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT count(DISTINCT session_id) INTO f_visited
    FROM analytics_events
    WHERE event_category = 'landing' AND event_name = 'landing_section_viewed'
      AND event_properties->>'section' = 'hero'
      AND created_at BETWEEN _start AND _end;

  SELECT count(DISTINCT session_id) INTO f_first_chapter
    FROM analytics_events
    WHERE event_category = 'landing' AND event_name = 'landing_section_viewed'
      AND event_properties->>'section' = 'chapter-passport'
      AND created_at BETWEEN _start AND _end;

  SELECT count(DISTINCT session_id) INTO f_cta_clicked
    FROM analytics_events
    WHERE event_category = 'landing' AND event_name = 'cta_click'
      AND created_at BETWEEN _start AND _end;

  SELECT count(DISTINCT session_id) INTO f_auth_reached
    FROM analytics_events
    WHERE event_category = 'landing' AND event_name IN ('signup_attempt', 'signin_attempt')
      AND created_at BETWEEN _start AND _end;

  SELECT count(DISTINCT session_id) INTO f_signup_attempted
    FROM analytics_events
    WHERE event_category = 'landing' AND event_name = 'signup_attempt'
      AND created_at BETWEEN _start AND _end;

  SELECT count(DISTINCT session_id) INTO f_signup_succeeded
    FROM analytics_events
    WHERE event_category = 'landing' AND event_name = 'signup_success'
      AND created_at BETWEEN _start AND _end;

  SELECT count(DISTINCT session_id) INTO total_sessions
    FROM analytics_events
    WHERE event_category = 'landing' AND created_at BETWEEN _start AND _end;

  -- Per-section view breakdown (every real section, not just the two
  -- funnel checkpoints above)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('section', section, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
    INTO by_section
  FROM (
    SELECT event_properties->>'section' AS section, count(DISTINCT session_id) AS cnt
    FROM analytics_events
    WHERE event_category = 'landing' AND event_name = 'landing_section_viewed'
      AND created_at BETWEEN _start AND _end
    GROUP BY 1
  ) s;

  -- Per-CTA breakdown (cta_id + its most recent label + destination_type)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'cta_id', cta_id, 'label', label, 'section', section,
      'destination_type', destination_type, 'count', cnt
    ) ORDER BY cnt DESC), '[]'::jsonb)
    INTO by_cta
  FROM (
    SELECT
      event_properties->>'cta_id' AS cta_id,
      (array_agg(event_properties->>'label' ORDER BY created_at DESC))[1] AS label,
      (array_agg(event_properties->>'section' ORDER BY created_at DESC))[1] AS section,
      (array_agg(event_properties->>'destination_type' ORDER BY created_at DESC))[1] AS destination_type,
      count(*) AS cnt
    FROM analytics_events
    WHERE event_category = 'landing' AND event_name = 'cta_click'
      AND created_at BETWEEN _start AND _end
    GROUP BY 1
  ) c;

  -- Entry-source breakdown, measured at signup_attempt (the funnel stage
  -- product actually cares about attributing)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('entry_source', entry_source, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
    INTO by_entry_source
  FROM (
    SELECT event_properties->>'entry_source' AS entry_source, count(DISTINCT session_id) AS cnt
    FROM analytics_events
    WHERE event_category = 'landing' AND event_name = 'signup_attempt'
      AND created_at BETWEEN _start AND _end
    GROUP BY 1
  ) e;

  result := jsonb_build_object(
    'funnel', jsonb_build_array(
      jsonb_build_object('label', 'Landing visited',       'count', f_visited),
      jsonb_build_object('label', 'Reached first chapter',  'count', f_first_chapter),
      jsonb_build_object('label', 'CTA clicked',            'count', f_cta_clicked),
      jsonb_build_object('label', 'Auth page reached',      'count', f_auth_reached),
      jsonb_build_object('label', 'Signup attempted',       'count', f_signup_attempted),
      jsonb_build_object('label', 'Signup completed',       'count', f_signup_succeeded)
    ),
    'by_section', by_section,
    'by_cta', by_cta,
    'by_entry_source', by_entry_source,
    'total_sessions', total_sessions,
    'window', jsonb_build_object('start', _start, 'end', _end)
  );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_landing_funnel(timestamptz, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_landing_funnel(timestamptz, timestamptz) TO authenticated;
