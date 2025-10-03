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
    
    // Safety timeout - ensure loading doesn't hang forever
    const timeoutId = setTimeout(() => {
      console.warn('[useAuth] Auth initialization timeout - forcing loading to false');
      setLoading(false);
    }, 5000);
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useAuth] Auth state changed:', event, !!session);
        clearTimeout(timeoutId);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check subscription when user logs in or session changes
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          await checkSubscription();
        }
      }
    );

    // THEN check for existing session
    console.log('[useAuth] Checking for existing session...');
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        console.log('[useAuth] Got session:', !!session, error);
        clearTimeout(timeoutId);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check subscription if user is already logged in
        if (session?.user) {
          await checkSubscription();
        }
      })
      .catch((error) => {
        console.error('[useAuth] Error getting session:', error);
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      console.log('[useAuth] Cleaning up auth subscription');
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading, subscriptionInfo, checkSubscription };
};
