import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface SubscriptionInfo {
  tier: string;
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscriptionInfo: SubscriptionInfo;
  checkSubscription: (userId: string, forceSync?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const subscriptionCache = new Map<string, { data: SubscriptionInfo; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const AuthProvider = ({ children }: { children: ReactNode }) => {
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
  const fetchingRef = useRef(false);

  const fetchSubscriptionFromDB = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_product_id, subscription_end_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (profile) {
      // Check if trial is still valid
      const isTrialValid = profile.subscription_status === 'trial' && 
        profile.subscription_end_date && 
        new Date(profile.subscription_end_date) > new Date();
      
      // User is "subscribed" if active OR on valid trial
      const isSubscribed = profile.subscription_status === 'active' || isTrialValid;
      
      return {
        tier: isSubscribed ? (profile.subscription_tier || 'pro') : 'free',
        subscribed: isSubscribed,
        product_id: profile.subscription_product_id || null,
        subscription_end: profile.subscription_end_date || null,
      };
    }
    return null;
  };

  const checkSubscription = async (userId: string, forceSync = false) => {
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;

      const cached = subscriptionCache.get(userId);
      const now = Date.now();
      
      if (!forceSync && cached && (now - cached.timestamp) < CACHE_DURATION) {
        setSubscriptionInfo(cached.data);
        return;
      }

      // Fetch from DB immediately (fast)
      const subInfo = await fetchSubscriptionFromDB(userId);
      if (subInfo) {
        setSubscriptionInfo(subInfo);
        subscriptionCache.set(userId, { data: subInfo, timestamp: now });
      }

      // Sync with Stripe in background (don't await - non-blocking)
      const shouldSyncStripe = forceSync || (now - lastSyncRef.current) > CACHE_DURATION;
      if (shouldSyncStripe) {
        lastSyncRef.current = now;
        supabase.functions.invoke('check-subscription').catch(err => {
          // Log but don't disrupt user experience
          console.warn('[AuthContext] Background Stripe sync failed (non-critical):', err);
        });
      }
    } catch (error) {
      console.error('[AuthContext] Error checking subscription:', error);
    } finally {
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 2;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        // Handle session errors/sign out
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          retryCount = 0; // Reset retry count on successful events
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user && event === 'SIGNED_IN') {
          // Defer subscription check to avoid calling Supabase inside callback
          const userId = session.user.id;
          setTimeout(() => {
            checkSubscription(userId, true);
          }, 0);
        }
      }
    );

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        // Handle session errors (corrupted tokens, network issues)
        if (error) {
          console.warn('[AuthContext] Session error, clearing local storage:', error.message);
          // Clear corrupted session data aggressively
          if (error.message.includes('Failed to fetch') || error.message.includes('refresh_token')) {
            retryCount++;
            if (retryCount >= MAX_RETRIES) {
              console.warn('[AuthContext] Max retries reached, force clearing storage');
              // Force clear localStorage directly
              try {
                localStorage.removeItem('sb-kwmcocsitwssrtzkdojh-auth-token');
                sessionStorage.clear();
              } catch (e) {
                console.warn('[AuthContext] Storage clear error:', e);
              }
              await supabase.auth.signOut({ scope: 'local' });
              setSession(null);
              setUser(null);
            }
          }
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false); // Set loading false immediately
        
        // Load subscription data in background (non-blocking)
        if (session?.user) {
          const userId = session.user.id;
          fetchSubscriptionFromDB(userId)
            .then(subInfo => {
              if (isMounted && subInfo) {
                setSubscriptionInfo(subInfo);
              }
            })
            .catch(err => console.error('[AuthContext] Error loading subscription:', err));
        }
      } catch (error: any) {
        console.error('[AuthContext] Error getting session:', error);
        // On network errors, clear corrupted session to prevent infinite loops
        if (error?.message?.includes('Failed to fetch')) {
          console.warn('[AuthContext] Network error, clearing corrupted session');
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch (e) {
            // Ignore signout errors
          }
        }
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };
    
    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, subscriptionInfo, checkSubscription }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('[AuthContext] useAuth called outside AuthProvider. Returning safe defaults.');
    return {
      user: null,
      session: null,
      loading: false,
      subscriptionInfo: {
        tier: 'free',
        subscribed: false,
        product_id: null,
        subscription_end: null,
      },
      checkSubscription: async () => {
        // no-op fallback
        return;
      },
    } as AuthContextType;
  }
  return context;
};
