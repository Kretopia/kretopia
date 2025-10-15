import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface SubscriptionInfo {
  tier: string;
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
}

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

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[useAuth] Checking subscription for user:', user.id);

      // First, sync with Stripe to ensure we have the latest status
      const { data: syncData, error: syncError } = await supabase.functions.invoke('check-subscription');
      
      if (syncError) {
        console.error('[useAuth] Error syncing with Stripe:', syncError);
      } else {
        console.log('[useAuth] Synced with Stripe:', syncData);
      }

      // Then fetch the updated subscription info from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_product_id, subscription_end_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useAuth] Error fetching profile:', error);
        throw error;
      }
      
      console.log('[useAuth] Profile data:', profile);

      if (profile) {
        const newSubscriptionInfo = {
          tier: profile.subscription_tier || 'free',
          subscribed: profile.subscription_status === 'active',
          product_id: profile.subscription_product_id || null,
          subscription_end: profile.subscription_end_date || null,
        };
        console.log('[useAuth] Setting subscription info:', newSubscriptionInfo);
        setSubscriptionInfo(newSubscriptionInfo);
      }
    } catch (error) {
      console.error('[useAuth] Error checking subscription:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST - MUST be synchronous
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Defer subscription check to avoid deadlock
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          setTimeout(() => {
            checkSubscription();
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Defer subscription check
        if (session?.user) {
          setTimeout(() => {
            checkSubscription();
          }, 0);
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
