import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface SubscriptionInfo {
  tier: string;
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
}

// Cache subscription data to avoid repeated checks
const subscriptionCache = new Map<string, { data: SubscriptionInfo; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    tier: 'free',
    subscribed: false,
    product_id: null,
    subscription_end: null,
  });
  const lastSyncRef = useRef<number>(0);

  const fetchSubscriptionFromDB = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_product_id, subscription_end_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (profile) {
      return {
        tier: profile.subscription_tier || 'free',
        subscribed: profile.subscription_status === 'active',
        product_id: profile.subscription_product_id || null,
        subscription_end: profile.subscription_end_date || null,
      };
    }
    return null;
  };

  const checkSubscription = async (forceSync = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check cache first
      const cached = subscriptionCache.get(user.id);
      const now = Date.now();
      
      if (!forceSync && cached && (now - cached.timestamp) < CACHE_DURATION) {
        setSubscriptionInfo(cached.data);
        return;
      }

      // Only sync with Stripe if it's been more than 5 minutes since last sync
      const shouldSyncStripe = forceSync || (now - lastSyncRef.current) > CACHE_DURATION;
      
      if (shouldSyncStripe) {
        await supabase.functions.invoke('check-subscription');
        lastSyncRef.current = now;
      }

      // Fetch from DB
      const subInfo = await fetchSubscriptionFromDB(user.id);
      if (subInfo) {
        setSubscriptionInfo(subInfo);
        subscriptionCache.set(user.id, { data: subInfo, timestamp: now });
      }
    } catch (error) {
      console.error('[useAuth] Error checking subscription:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Only check subscription on actual sign-in (not every token refresh)
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(() => checkSubscription(true), 0); // Force sync on sign-in
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Use cached data on page load (don't force Stripe sync)
        if (session?.user) {
          setTimeout(() => checkSubscription(false), 0);
        }
      })
      .catch((error) => {
        console.error('[useAuth] Error getting session:', error);
        setLoading(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading, subscriptionInfo, checkSubscription };
};
