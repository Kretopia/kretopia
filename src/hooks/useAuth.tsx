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
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      
      if (data) {
        setSubscriptionInfo({
          tier: data.tier || 'free',
          subscribed: data.subscribed || false,
          product_id: data.product_id || null,
          subscription_end: data.subscription_end || null,
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  useEffect(() => {
    console.log('[useAuth] Initializing auth...');
    
    // Set up auth state listener FIRST - MUST be synchronous
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[useAuth] Auth state changed:', event, !!session);
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
    console.log('[useAuth] Checking for existing session...');
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        console.log('[useAuth] Got session:', !!session, error);
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
      console.log('[useAuth] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading, subscriptionInfo, checkSubscription };
};
