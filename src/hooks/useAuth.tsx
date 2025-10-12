import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface SubscriptionInfo {
  tier: string;
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
}

const CACHE_KEY = 'subscription_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>(() => {
    // Initialize from cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      } catch (e) {
        localStorage.removeItem(CACHE_KEY);
      }
    }
    return {
      tier: 'free',
      subscribed: false,
      product_id: null,
      subscription_end: null,
    };
  });

  const lastCheckRef = useRef<number>(0);
  const checkInProgressRef = useRef<boolean>(false);

  const checkSubscription = async (force = false) => {
    // Debounce: Don't check more than once per 30 seconds unless forced
    const now = Date.now();
    if (!force && (now - lastCheckRef.current < 30000 || checkInProgressRef.current)) {
      return;
    }

    checkInProgressRef.current = true;
    lastCheckRef.current = now;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        checkInProgressRef.current = false;
        return;
      }

      // Fetch subscription info directly from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_product_id, subscription_end_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useAuth] Error fetching profile:', error);
        checkInProgressRef.current = false;
        return;
      }

      if (profile) {
        const newSubscriptionInfo = {
          tier: profile.subscription_tier || 'free',
          subscribed: profile.subscription_status === 'active',
          product_id: profile.subscription_product_id || null,
          subscription_end: profile.subscription_end_date || null,
        };
        
        // Cache the result
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: newSubscriptionInfo,
          timestamp: Date.now()
        }));
        
        setSubscriptionInfo(newSubscriptionInfo);
      }
    } catch (error) {
      console.error('[useAuth] Error checking subscription:', error);
    } finally {
      checkInProgressRef.current = false;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // ONLY check subscription on sign in, not on token refresh
        if (session?.user && event === 'SIGNED_IN') {
          checkSubscription(true);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Only check if cache is stale
        if (session?.user) {
          const cached = localStorage.getItem(CACHE_KEY);
          let shouldCheck = true;
          
          if (cached) {
            try {
              const { timestamp } = JSON.parse(cached);
              shouldCheck = Date.now() - timestamp >= CACHE_DURATION;
            } catch (e) {
              // Cache corrupted, check
            }
          }
          
          if (shouldCheck) {
            checkSubscription();
          }
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
