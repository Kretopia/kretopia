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

  match: (matchedUserId?: string) =>
    trackEvent({
      eventName: 'match_created',
      eventCategory: EventCategory.DISCOVERY,
      properties: { matched_user_id: matchedUserId },
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

  // Messaging events
  messageSent: (recipientId?: string) =>
    trackEvent({
      eventName: 'message_sent',
      eventCategory: EventCategory.MESSAGING,
      properties: { recipient_id: recipientId },
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
};
