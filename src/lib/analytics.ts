import { supabase } from "@/integrations/supabase/client";

// Generate a session ID that persists during the browser session
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Performance timing helper
const pageLoadTimes = new Map<string, number>();

interface TrackEventParams {
  eventName: string;
  eventCategory: string;
  properties?: Record<string, any>;
  userId?: string;
}

export const trackEvent = async ({
  eventName,
  eventCategory,
  properties = {},
  userId,
}: TrackEventParams) => {
  try {
    const sessionId = getSessionId();
    
    // Get current user if not provided
    let finalUserId = userId;
    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      finalUserId = user?.id;
    }

    await supabase.from('analytics_events').insert({
      user_id: finalUserId,
      session_id: sessionId,
      event_name: eventName,
      event_category: eventCategory,
      event_properties: properties,
      page_path: window.location.pathname,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    // Silently fail - don't break the app if analytics fails
    console.error('Analytics tracking error:', error);
  }
};

// Start page load timing
export const startPageTiming = (pageName: string) => {
  pageLoadTimes.set(pageName, performance.now());
};

// End page load timing and track
export const endPageTiming = async (pageName: string) => {
  const startTime = pageLoadTimes.get(pageName);
  if (startTime) {
    const loadTime = Math.round(performance.now() - startTime);
    pageLoadTimes.delete(pageName);
    await trackEvent({
      eventName: 'page_load_time',
      eventCategory: 'performance',
      properties: { pageName, loadTimeMs: loadTime }
    });
  }
};

// Predefined event categories
export const EventCategory = {
  AUTH: 'auth',
  NAVIGATION: 'navigation',
  PROFILE: 'profile',
  DISCOVERY: 'discovery',
  MESSAGING: 'messaging',
  OPPORTUNITIES: 'opportunities',
  SUBSCRIPTION: 'subscription',
  ENGAGEMENT: 'engagement',
  ONBOARDING: 'onboarding',
  COLLABORATION: 'collaboration',
  PROJECT: 'project',
  PAYWALL: 'paywall',
} as const;

// Common event tracking functions
export const analytics = {
  // Auth events
  signUp: (method: string = 'email') =>
    trackEvent({
      eventName: 'sign_up',
      eventCategory: EventCategory.AUTH,
      properties: { method },
    }),

  signIn: (method: string = 'email') =>
    trackEvent({
      eventName: 'sign_in',
      eventCategory: EventCategory.AUTH,
      properties: { method },
    }),

  signOut: () =>
    trackEvent({
      eventName: 'sign_out',
      eventCategory: EventCategory.AUTH,
    }),

  // Navigation events
  pageView: (pageName: string) =>
    trackEvent({
      eventName: 'page_view',
      eventCategory: EventCategory.NAVIGATION,
      properties: { page: pageName },
    }),

  // Profile events
  profileComplete: (completionPercentage: number) =>
    trackEvent({
      eventName: 'profile_completed',
      eventCategory: EventCategory.PROFILE,
      properties: { completion_percentage: completionPercentage },
    }),

  profileUpdate: (field: string) =>
    trackEvent({
      eventName: 'profile_updated',
      eventCategory: EventCategory.PROFILE,
      properties: { field },
    }),

  // Discovery events
  swipe: (direction: 'left' | 'right', targetUserId?: string) =>
    trackEvent({
      eventName: 'swipe',
      eventCategory: EventCategory.DISCOVERY,
      properties: { direction, target_user_id: targetUserId },
    }),

  undoSwipe: (targetUserId: string) =>
    trackEvent({
      eventName: 'undo_swipe',
      eventCategory: EventCategory.DISCOVERY,
      properties: { target_user_id: targetUserId },
    }),

  swipeLimitHit: (currentTier: string) =>
    trackEvent({
      eventName: 'swipe_limit_hit',
      eventCategory: EventCategory.PAYWALL,
      properties: { current_tier: currentTier, limit: 30 },
    }),

  match: (matchedUserId?: string) =>
    trackEvent({
      eventName: 'match_created',
      eventCategory: EventCategory.DISCOVERY,
      properties: { matched_user_id: matchedUserId },
    }),

  matchExplanationViewed: (targetUserId: string, matchScore: number) =>
    trackEvent({
      eventName: 'match_explanation_viewed',
      eventCategory: EventCategory.DISCOVERY,
      properties: { target_user_id: targetUserId, match_score: matchScore },
    }),

  profilePreview: (targetUserId: string, source: 'match_card' | 'search' | 'message') =>
    trackEvent({
      eventName: 'profile_preview',
      eventCategory: EventCategory.DISCOVERY,
      properties: { target_user_id: targetUserId, source },
    }),

  // Opportunity events
  opportunityView: (opportunityId: string) =>
    trackEvent({
      eventName: 'opportunity_viewed',
      eventCategory: EventCategory.OPPORTUNITIES,
      properties: { opportunity_id: opportunityId },
    }),

  opportunityApply: (opportunityId: string) =>
    trackEvent({
      eventName: 'opportunity_applied',
      eventCategory: EventCategory.OPPORTUNITIES,
      properties: { opportunity_id: opportunityId },
    }),

  opportunityCreate: (opportunityId: string) =>
    trackEvent({
      eventName: 'opportunity_created',
      eventCategory: EventCategory.OPPORTUNITIES,
      properties: { opportunity_id: opportunityId },
    }),

  // Subscription events
  subscriptionStart: (tier: string, amount?: number) =>
    trackEvent({
      eventName: 'subscription_started',
      eventCategory: EventCategory.SUBSCRIPTION,
      properties: { tier, amount },
    }),

  subscriptionCancel: (tier: string) =>
    trackEvent({
      eventName: 'subscription_canceled',
      eventCategory: EventCategory.SUBSCRIPTION,
      properties: { tier },
    }),

  subscriptionUpgrade: (fromTier: string, toTier: string) =>
    trackEvent({
      eventName: 'subscription_upgraded',
      eventCategory: EventCategory.SUBSCRIPTION,
      properties: { from_tier: fromTier, to_tier: toTier },
    }),

  paywallViewed: (feature: string, currentTier: string) =>
    trackEvent({
      eventName: 'paywall_viewed',
      eventCategory: EventCategory.PAYWALL,
      properties: { feature, current_tier: currentTier },
    }),

  // Messaging events
  messageSent: (recipientId?: string, source?: 'match' | 'direct' | 'project') =>
    trackEvent({
      eventName: 'message_sent',
      eventCategory: EventCategory.MESSAGING,
      properties: { recipient_id: recipientId, source },
    }),

  conversationStarted: (recipientId: string, source: 'match' | 'profile') =>
    trackEvent({
      eventName: 'conversation_started',
      eventCategory: EventCategory.MESSAGING,
      properties: { recipient_id: recipientId, source },
    }),

  // Onboarding events
  onboardingStart: () =>
    trackEvent({
      eventName: 'onboarding_started',
      eventCategory: EventCategory.ONBOARDING,
    }),

  onboardingComplete: () =>
    trackEvent({
      eventName: 'onboarding_completed',
      eventCategory: EventCategory.ONBOARDING,
    }),

  onboardingStep: (stepNumber: number, stepName: string) =>
    trackEvent({
      eventName: 'onboarding_step',
      eventCategory: EventCategory.ONBOARDING,
      properties: { step_number: stepNumber, step_name: stepName },
    }),

  // Collaboration events
  connectionRequest: (targetUserId?: string) =>
    trackEvent({
      eventName: 'connection_request',
      eventCategory: EventCategory.COLLABORATION,
      properties: { target_user_id: targetUserId },
    }),

  projectCreated: (projectId: string, matchId?: string, collaboratorCount?: number) =>
    trackEvent({
      eventName: 'project_created',
      eventCategory: EventCategory.PROJECT,
      properties: { project_id: projectId, match_id: matchId, collaborator_count: collaboratorCount },
    }),

  projectFileShared: (projectId: string, fileType: string) =>
    trackEvent({
      eventName: 'project_file_shared',
      eventCategory: EventCategory.PROJECT,
      properties: { project_id: projectId, file_type: fileType },
    }),

  projectTaskCompleted: (projectId: string) =>
    trackEvent({
      eventName: 'project_task_completed',
      eventCategory: EventCategory.PROJECT,
      properties: { project_id: projectId },
    }),

  projectChatMessage: (projectId: string) =>
    trackEvent({
      eventName: 'project_chat_message',
      eventCategory: EventCategory.PROJECT,
      properties: { project_id: projectId },
    }),

  portfolioItemAdded: (mediaType: string) =>
    trackEvent({
      eventName: 'portfolio_item_added',
      eventCategory: EventCategory.PROFILE,
      properties: { media_type: mediaType },
    }),

  profileViewed: (profileUserId: string, source: 'match' | 'public' | 'search' | 'message') =>
    trackEvent({
      eventName: 'profile_viewed',
      eventCategory: EventCategory.PROFILE,
      properties: { profile_user_id: profileUserId, source },
    }),

  // CTA button clicks
  ctaClick: (ctaName: string, location: string) =>
    trackEvent({
      eventName: 'cta_click',
      eventCategory: EventCategory.ENGAGEMENT,
      properties: { cta_name: ctaName, location },
    }),

  // Feature usage
  featureUsed: (featureName: string, details?: Record<string, any>) =>
    trackEvent({
      eventName: 'feature_used',
      eventCategory: EventCategory.ENGAGEMENT,
      properties: { feature: featureName, ...details },
    }),

  // Error tracking
  errorOccurred: (errorType: string, errorMessage: string, context?: string) =>
    trackEvent({
      eventName: 'error_occurred',
      eventCategory: EventCategory.ENGAGEMENT,
      properties: { error_type: errorType, error_message: errorMessage, context },
    }),

  // Session tracking
  sessionStart: () =>
    trackEvent({
      eventName: 'session_start',
      eventCategory: EventCategory.ENGAGEMENT,
    }),

  sessionEnd: (duration: number) =>
    trackEvent({
      eventName: 'session_end',
      eventCategory: EventCategory.ENGAGEMENT,
      properties: { duration_seconds: duration },
    }),
};
