import { Suspense, lazy, useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useOnboarding } from "./hooks/useOnboarding";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import { ModeDiscoverySheet } from "./components/ModeDiscoverySheet";
import { ModeThemeSync } from "./components/ModeThemeSync";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { InteractiveOnboarding } from "./components/onboarding/InteractiveOnboarding";
import { SkipLink } from "./components/ui/skip-link";
import { FeedbackWidget } from "./components/FeedbackWidget";
import { analytics } from "@/lib/analytics";
import { NetworkStatus } from "./components/NetworkStatus";
import { useNativeCapacitor } from "./hooks/useNativeCapacitor";
import { GuestBanner } from "./components/GuestBanner";
import { AuthGate } from "./components/AuthGate";
import { OnboardingTour } from "./components/OnboardingTour";
import { NewsletterPopup } from "./components/NewsletterPopup";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

// Lazy load active page components
const UnifiedHome = lazy(() => import("./components/home/UnifiedHome"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const EndorseSkill = lazy(() => import("./pages/EndorseSkill"));
const CreatorEPK = lazy(() => import("./pages/CreatorEPK"));
const SubmitReview = lazy(() => import("./pages/SubmitReview"));
const Profile = lazy(() => import("./pages/Profile"));
const ViewProfile = lazy(() => import("./pages/ViewProfile"));

const Circle = lazy(() => import("./pages/Circle"));
const CircleDetailPage = lazy(() => import("./pages/CircleDetail"));
const Circles = lazy(() => import("./pages/Circles"));
const Messages = lazy(() => import("./pages/Messages"));
const ThriveDesk = lazy(() => import("./pages/ThriveDesk"));
const ProjectsList = lazy(() => import("./pages/ProjectsList"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Admin = lazy(() => import("./pages/Admin"));
const Settings = lazy(() => import("./pages/Settings"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));
const ClaimProfile = lazy(() => import("./pages/ClaimProfile"));

const Search = lazy(() => import("./pages/Search"));
const NearbyCreators = lazy(() => import("./pages/NearbyCreators"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const ThrivePay = lazy(() => import("./pages/ThrivePay"));

const Install = lazy(() => import("./pages/Install"));
const JoinWithCode = lazy(() => import("./pages/JoinWithCode"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));

const OpportunityDetail = lazy(() => import("./pages/OpportunityDetail"));
const PostOpportunity = lazy(() => import("./pages/PostOpportunity"));
const VerifyOpportunity = lazy(() => import("./pages/VerifyOpportunity"));
const ProductionPage = lazy(() => import("./pages/ProductionPage"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const ClaimGig = lazy(() => import("./pages/ClaimGig"));

const EventPage = lazy(() => import("./pages/EventPage"));
const Events = lazy(() => import("./pages/Events"));
const Scene = lazy(() => import("./pages/Scene"));
const Podcast = lazy(() => import("./pages/Podcast"));
const Magazine = lazy(() => import("./pages/Magazine"));
const MagazineArticlePage = lazy(() => import("./pages/MagazineArticlePage"));
const CreditDatabase = lazy(() => import("./pages/CreditDatabase"));
const ICDBProjectPage = lazy(() => import("./pages/ICDBProjectPage"));
const BrandVerify = lazy(() => import("./pages/BrandVerify"));
const WorkHome = lazy(() => import("./pages/WorkHome"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingFallback />;
  }
  
  if (!user) {
    return <AuthGate>{children}</AuthGate>;
  }
  
  return <>{children}</>;
};

// Unified home: same layout for guests & authenticated users
const DefaultRoute = () => {
  const { user } = useAuth();
  const { isComplete, loading: onboardingLoading } = useOnboarding();
  
  if (user) {
    if (onboardingLoading) return <LoadingFallback />;
    if (!isComplete) return <Navigate to="/onboarding" replace />;
    
    // Check for pending event join (from OAuth redirect)
    const pendingEvent = sessionStorage.getItem('pending_event_join');
    if (pendingEvent) {
      sessionStorage.removeItem('pending_event_join');
      return <Navigate to={`/event/${pendingEvent}`} replace />;
    }
  }
  
  return <UnifiedHome />;
};

// Catch-all: authenticated users go to mode-aware home
const CatchAllRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/scene" replace />;
  let mode = "create";
  try { mode = localStorage.getItem("thrivein-nav-mode") || "create"; } catch {}
  return <Navigate to={mode === "work" ? "/desk" : "/scene"} replace />;
};

// Track page views
const PageViewTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    analytics.pageView(location.pathname);
  }, [location.pathname]);
  
  return null;
};

// Content wrapper that conditionally applies padding
const AppContent = () => {
  const location = useLocation();
  const { user } = useAuth();
  useNativeCapacitor();
  
  // Check if on public EPK page (hide navbar/bottomnav for standalone link-in-bio experience)
  const isPublicEPK = /^\/epk\/[^/]+$/.test(location.pathname);
  const isPublicEvent = /^\/event\/[^/]+$/.test(location.pathname);
  const isAuthPage = location.pathname === '/auth';
  const isDeckPage = location.pathname === '/deck';
  const isLandingPage = location.pathname === '/';
  
  // Public browsable routes where guests see nav — expanded to show platform value
  const publicBrowseRoutes = ['/scene', '/opportunities', '/credits', '/circle', '/search', '/event', '/profile'];
  const isPublicBrowse = publicBrowseRoutes.some(r => location.pathname.startsWith(r));
  
  // Show bottom nav for authenticated users OR guests on public browse routes (+ landing)
  const showBottomNav = !isPublicEPK && !isAuthPage && !isDeckPage && !!user;
  const showNavbar = !isPublicEPK && !isAuthPage && !isDeckPage;
  const showGuestBanner = !user && (isPublicBrowse || isLandingPage) && !isAuthPage;
  
  // Don't add bottom padding when on individual project pages or desk list
  const shouldAddBottomPadding = showBottomNav && !location.pathname.startsWith('/desk');
  
  return (
    <div className="h-full overflow-auto">
      <ModeThemeSync />
      <NetworkStatus />
      <SkipLink />
      <PageViewTracker />
      {showNavbar && <Navbar user={user} />}
      {showBottomNav && <BottomNav />}
      {user && !isPublicEPK && !isAuthPage && !isDeckPage && <ModeDiscoverySheet />}
      {user && !isAuthPage && <OnboardingTour />}
      {!user && <NewsletterPopup />}
      <PWAInstallPrompt />
      {showGuestBanner && <GuestBanner />}
      <main id="main-content" className={shouldAddBottomPadding ? "pb-20 lg:pb-0" : ""}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Active MVP Routes */}
            <Route path="/" element={<DefaultRoute />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            
            {/* Core Feature Pages - Public browsable, actions gated */}
            <Route path="/circle" element={<Circle />} />
            <Route path="/circle/:circleId" element={<ProtectedRoute><CircleDetailPage /></ProtectedRoute>} />
            <Route path="/circles" element={<Circles />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            {/* View other user's profile - Auth users get in-app view, public gets EPK */}
            <Route path="/profile/:userId" element={<ViewProfile />} />
            <Route path="/epk/:userId" element={<CreatorEPK />} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/my-analytics" element={<Navigate to="/profile" replace />} />
            <Route path="/guide" element={<Navigate to="/" replace />} />
            
            {/* ThriveDesk - Lightweight Project Workspace */}
            <Route path="/desk" element={<ProtectedRoute><WorkHome /></ProtectedRoute>} />
            <Route path="/desk/projects" element={<ProtectedRoute><ProjectsList /></ProtectedRoute>} />
            <Route path="/desk/:projectId" element={<ProtectedRoute><ThriveDesk /></ProtectedRoute>} />
            
            {/* Subscription & Payment Routes */}
            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/thrivepay" element={<ProtectedRoute><ThrivePay /></ProtectedRoute>} />
            <Route path="/wallet" element={<Navigate to="/thrivepay" replace />} />
            <Route path="/purchases" element={<Navigate to="/thrivepay" replace />} />
            <Route path="/accounting" element={<Navigate to="/thrivepay?tab=earnings" replace />} />
            <Route path="/thrivemoney" element={<Navigate to="/thrivepay?tab=earnings" replace />} />
            <Route path="/purchase-success" element={<PaymentSuccess />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            
            {/* Legacy redirects for removed features */}
            <Route path="/agent" element={<Navigate to="/circle" replace />} />
            <Route path="/sales" element={<Navigate to="/opportunities" replace />} />
            <Route path="/leads" element={<Navigate to="/opportunities" replace />} />
            <Route path="/outreach" element={<Navigate to="/opportunities" replace />} />
            <Route path="/thrive-ai" element={<Navigate to="/circle" replace />} />
            <Route path="/challenges" element={<Navigate to="/" replace />} />
            <Route path="/challenges/:id" element={<Navigate to="/" replace />} />
            <Route path="/market" element={<Navigate to="/opportunities" replace />} />
            <Route path="/market/:listingId" element={<Navigate to="/opportunities" replace />} />
            <Route path="/talent-manager" element={<ProtectedRoute><Circle /></ProtectedRoute>} />
            <Route path="/checkin" element={<Navigate to="/" replace />} />
            
            {/* Public Browsable Routes */}
            <Route path="/nearby" element={<NearbyCreators />} />
            <Route path="/events" element={<Events />} />
            <Route path="/scene" element={<Scene />} />
            
            {/* Public Magazine Article - SEO accessible */}
            <Route path="/magazine/:slug" element={<MagazineArticlePage />} />
            <Route path="/magazine" element={<Magazine />} />
            <Route path="/podcast" element={<Podcast />} />
            
            {/* PWA Install Page */}
            <Route path="/install" element={<Install />} />
            
            {/* Invite Link with Code */}
            <Route path="/join/:code" element={<JoinWithCode />} />
            
            {/* Project Invitation Accept */}
            <Route path="/accept-invite/:projectId" element={<AcceptInvite />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/analytics" element={<Navigate to="/admin" replace />} />
            <Route path="/admin-broadcast" element={<Navigate to="/admin" replace />} />
            <Route path="/waitlist-admin" element={<Navigate to="/admin" replace />} />
            <Route path="/test-emails" element={<Navigate to="/admin" replace />} />
            <Route path="/feedback-admin" element={<Navigate to="/admin" replace />} />

            {/* Pitch Deck */}
            <Route path="/deck" element={<Navigate to="/" replace />} />

            {/* Legal & Info Pages */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            
            {/* Partner Pages — redirected */}
            <Route path="/partner-directory" element={<Navigate to="/" replace />} />
            <Route path="/partner-submit" element={<Navigate to="/" replace />} />
            
            {/* Opportunity Management */}
            <Route path="/opportunity/:id" element={<OpportunityDetail />} />
            <Route path="/opportunity-dashboard" element={<Navigate to="/desk" replace />} />
            <Route path="/manage-opportunities" element={<Navigate to="/desk" replace />} />
            
            {/* Rewards - hidden for now */}
            <Route path="/rewards" element={<Navigate to="/" replace />} />
            
            {/* Credit Database & Discover - Public browsable */}
            <Route path="/credits" element={<CreditDatabase />} />
            <Route path="/credits/hub" element={<Navigate to="/credits" replace />} />
            <Route path="/credits/project/:projectId" element={<ICDBProjectPage />} />
            <Route path="/credits/discover" element={<Navigate to="/credits" replace />} />
            <Route path="/verify-credit" element={<BrandVerify />} />
            <Route path="/directory" element={<Navigate to="/search" replace />} />
            <Route path="/discover" element={<Navigate to="/search" replace />} />
            <Route path="/opportunities" element={<Opportunities />} />

            {/* Public Event Page */}
            <Route path="/event/:eventId" element={<EventPage />} />

            {/* Public Access Pages (No Auth Required) */}
            <Route path="/endorse" element={<EndorseSkill />} />
            <Route path="/submit-review" element={<SubmitReview />} />
            <Route path="/claim/:claimToken" element={<ClaimProfile />} />
            <Route path="/post-opportunity" element={<PostOpportunity />} />
            <Route path="/claim-gig/:token" element={<ClaimGig />} />
            <Route path="/verify-opportunity" element={<VerifyOpportunity />} />
            
            {/* Search & Notifications */}
            <Route path="/search" element={<Search />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            
            {/* Legacy redirects — consolidated */}
            <Route path="/dashboard" element={<Navigate to="/desk" replace />} />
            <Route path="/spark" element={<Navigate to="/" replace />} />
            <Route path="/cre8" element={<Navigate to="/" replace />} />
            <Route path="/marketplace" element={<Navigate to="/opportunities" replace />} />
            
            {/* 404 - Catch all: redirect to main app */}
            <Route path="*" element={<CatchAllRedirect />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <GlobalErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <VercelAnalytics />
                <BrowserRouter>
                  <InteractiveOnboarding />
                  <FeedbackWidget />
                  <AppContent />
                </BrowserRouter>
              </TooltipProvider>
            </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
