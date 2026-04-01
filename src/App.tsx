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

// Lazy load active page components
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const EndorseSkill = lazy(() => import("./pages/EndorseSkill"));
const CreatorEPK = lazy(() => import("./pages/CreatorEPK"));
const SubmitReview = lazy(() => import("./pages/SubmitReview"));
const Profile = lazy(() => import("./pages/Profile"));
const ViewProfile = lazy(() => import("./pages/ViewProfile"));

const Circle = lazy(() => import("./pages/Circle"));
const CircleDetailPage = lazy(() => import("./pages/CircleDetail"));
const CirclesPage = lazy(() => import("./pages/Circles"));
const Messages = lazy(() => import("./pages/Messages"));
const ThriveDesk = lazy(() => import("./pages/ThriveDesk"));
const ProjectsList = lazy(() => import("./pages/ProjectsList"));
const Analytics = lazy(() => import("./pages/Analytics"));
const MyAnalytics = lazy(() => import("./pages/MyAnalytics"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Admin = lazy(() => import("./pages/Admin"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const AdminBroadcast = lazy(() => import("./pages/AdminBroadcast"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const PartnerDirectory = lazy(() => import("./pages/PartnerDirectory"));
const PartnerSubmit = lazy(() => import("./pages/PartnerSubmit"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));
const ClaimProfile = lazy(() => import("./pages/ClaimProfile"));

const Search = lazy(() => import("./pages/Search"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const TestEmails = lazy(() => import("./pages/TestEmails"));
const PurchaseSuccess = lazy(() => import("./pages/PurchaseSuccess"));
const MyPurchases = lazy(() => import("./pages/MyPurchases"));
const ThrivePay = lazy(() => import("./pages/ThrivePay"));

const SalesDashboard = lazy(() => import("./pages/SalesDashboard"));
const NearbyCreators = lazy(() => import("./pages/NearbyCreators"));
const Install = lazy(() => import("./pages/Install"));
const JoinWithCode = lazy(() => import("./pages/JoinWithCode"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const WaitlistAdmin = lazy(() => import("./pages/WaitlistAdmin"));

const Marketplace = lazy(() => import("./pages/Marketplace"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const OpportunityDetail = lazy(() => import("./pages/OpportunityDetail"));
const OpportunityDashboard = lazy(() => import("./pages/OpportunityDashboard"));
const ManageOpportunities = lazy(() => import("./pages/ManageOpportunities"));
const PostOpportunity = lazy(() => import("./pages/PostOpportunity"));
const RewardsShop = lazy(() => import("./pages/RewardsShop"));
const VerifyOpportunity = lazy(() => import("./pages/VerifyOpportunity"));
const Accounting = lazy(() => import("./pages/Accounting"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const FeedbackAdmin = lazy(() => import("./pages/FeedbackAdmin"));
const CheckIn = lazy(() => import("./pages/CheckIn"));

const PitchDeck = lazy(() => import("./pages/PitchDeck"));
const Guide = lazy(() => import("./pages/Guide"));
const EventPage = lazy(() => import("./pages/EventPage"));
const Events = lazy(() => import("./pages/Events"));
const Scene = lazy(() => import("./pages/Scene"));
const MagazineArticlePage = lazy(() => import("./pages/MagazineArticlePage"));
const TalentManager = lazy(() => import("./pages/TalentManager"));
const CreditDatabase = lazy(() => import("./pages/CreditDatabase"));
const ICDBProjectPage = lazy(() => import("./pages/ICDBProjectPage"));
const ICDBDiscovery = lazy(() => import("./pages/ICDBDiscovery"));
const ICDBHub = lazy(() => import("./pages/ICDBHub"));
const BrandVerify = lazy(() => import("./pages/BrandVerify"));
const Challenges = lazy(() => import("./pages/Challenges"));
const ChallengeDetail = lazy(() => import("./pages/ChallengeDetail"));
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
  const location = useLocation();
  
  if (loading) {
    return <LoadingFallback />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// Mode-aware default route: Create→Scene, Work→Desk
const DefaultRoute = () => {
  const { user } = useAuth();
  const { isComplete, loading: onboardingLoading } = useOnboarding();
  
  if (!user) return <Landing />;
  if (onboardingLoading) return <LoadingFallback />;
  if (!isComplete) return <Navigate to="/onboarding" replace />;
  
  // Check for pending event join (from OAuth redirect)
  const pendingEvent = sessionStorage.getItem('pending_event_join');
  if (pendingEvent) {
    sessionStorage.removeItem('pending_event_join');
    return <Navigate to={`/event/${pendingEvent}`} replace />;
  }
  
  // Read mode synchronously from localStorage to avoid flash
  let mode = "create";
  try { mode = localStorage.getItem("thrivein-nav-mode") || "create"; } catch {}
  return <Navigate to={mode === "work" ? "/desk" : "/scene"} replace />;
};

// Catch-all: authenticated users go to mode-aware home
const CatchAllRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
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
  
  // Don't add bottom padding when on individual project pages or desk list
  const shouldAddBottomPadding = user && !location.pathname.startsWith('/desk') && !isPublicEPK && !isPublicEvent && !isDeckPage;
  
  return (
    <div className="h-full overflow-auto">
      <ModeThemeSync />
      <NetworkStatus />
      <SkipLink />
      <PageViewTracker />
      {!isPublicEPK && !isAuthPage && !isDeckPage && <Navbar user={user} />}
      {user && !isPublicEPK && !isAuthPage && !isDeckPage && <BottomNav />}
      {user && !isPublicEPK && !isAuthPage && !isDeckPage && <ModeDiscoverySheet />}
      <main id="main-content" className={shouldAddBottomPadding ? "pb-20 lg:pb-0" : ""}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Active MVP Routes */}
            <Route path="/" element={<DefaultRoute />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            
            {/* Core Feature Pages - Only 4 Active */}
            <Route path="/circle" element={<ProtectedRoute><Circle /></ProtectedRoute>} />
            <Route path="/circle/:circleId" element={<ProtectedRoute><CircleDetailPage /></ProtectedRoute>} />
            <Route path="/circles" element={<ProtectedRoute><CirclesPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            {/* View other user's profile - Auth users get in-app view, public gets EPK */}
            <Route path="/profile/:userId" element={<ViewProfile />} />
            <Route path="/epk/:userId" element={<CreatorEPK />} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/my-analytics" element={<ProtectedRoute><MyAnalytics /></ProtectedRoute>} />
            <Route path="/guide" element={<Guide />} />
            
            {/* ThriveDesk - Lightweight Project Workspace */}
            <Route path="/desk" element={<ProtectedRoute><WorkHome /></ProtectedRoute>} />
            <Route path="/desk/projects" element={<ProtectedRoute><ProjectsList /></ProtectedRoute>} />
            <Route path="/desk/:projectId" element={<ProtectedRoute><ThriveDesk /></ProtectedRoute>} />
            
            {/* Subscription & Payment Routes */}
            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/thrivepay" element={<ProtectedRoute><ThrivePay /></ProtectedRoute>} />
            <Route path="/wallet" element={<Navigate to="/thrivepay" replace />} />
            <Route path="/purchases" element={<ProtectedRoute><MyPurchases /></ProtectedRoute>} />
            <Route path="/accounting" element={<Navigate to="/thrivepay?tab=earnings" replace />} />
            <Route path="/thrivemoney" element={<Navigate to="/thrivepay?tab=earnings" replace />} />
            <Route path="/purchase-success" element={<PurchaseSuccess />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            
            {/* Legacy redirects for removed features */}
            <Route path="/agent" element={<Navigate to="/circle" replace />} />
            <Route path="/sales" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
            <Route path="/outreach" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
            <Route path="/thrive-ai" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
            
            {/* Nearby Creators */}
            <Route path="/nearby" element={<ProtectedRoute><NearbyCreators /></ProtectedRoute>} />
            <Route path="/events" element={<Navigate to="/scene" replace />} />
            <Route path="/scene" element={<ProtectedRoute><Scene /></ProtectedRoute>} />
            
            {/* Public Magazine Article - SEO accessible */}
            <Route path="/magazine/:slug" element={<MagazineArticlePage />} />
            
            {/* PWA Install Page */}
            <Route path="/install" element={<Install />} />
            
            {/* Invite Link with Code */}
            <Route path="/join/:code" element={<JoinWithCode />} />
            
            {/* Project Invitation Accept */}
            <Route path="/accept-invite/:projectId" element={<AcceptInvite />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/admin-broadcast" element={<ProtectedRoute><AdminBroadcast /></ProtectedRoute>} />
            <Route path="/waitlist-admin" element={<ProtectedRoute><WaitlistAdmin /></ProtectedRoute>} />
            <Route path="/test-emails" element={<ProtectedRoute><TestEmails /></ProtectedRoute>} />
            <Route path="/feedback-admin" element={<ProtectedRoute><FeedbackAdmin /></ProtectedRoute>} />

            {/* Pitch Deck */}
            <Route path="/deck" element={<PitchDeck />} />

            {/* Legal & Info Pages */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            
            {/* Partner Pages */}
            <Route path="/partner-directory" element={<ProtectedRoute><PartnerDirectory /></ProtectedRoute>} />
            <Route path="/partner-submit" element={<PartnerSubmit />} />
            
            {/* Marketplace */}
            <Route path="/market" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="/market/:listingId" element={<ProtectedRoute><ListingDetail /></ProtectedRoute>} />
            
            {/* Opportunity Management */}
            <Route path="/opportunity/:id" element={<OpportunityDetail />} />
            <Route path="/opportunity-dashboard" element={<ProtectedRoute><OpportunityDashboard /></ProtectedRoute>} />
            <Route path="/manage-opportunities" element={<ProtectedRoute><ManageOpportunities /></ProtectedRoute>} />
            
            {/* Rewards */}
            <Route path="/rewards" element={<ProtectedRoute><RewardsShop /></ProtectedRoute>} />
            
            {/* Talent Manager */}
            <Route path="/talent-manager" element={<ProtectedRoute><TalentManager /></ProtectedRoute>} />
            
            {/* Credit Database & Discover */}
            <Route path="/credits" element={<ProtectedRoute><CreditDatabase /></ProtectedRoute>} />
            <Route path="/credits/hub" element={<ProtectedRoute><ICDBHub /></ProtectedRoute>} />
            <Route path="/credits/project/:projectId" element={<ProtectedRoute><ICDBProjectPage /></ProtectedRoute>} />
            <Route path="/credits/discover" element={<ProtectedRoute><ICDBDiscovery /></ProtectedRoute>} />
            <Route path="/verify-credit" element={<BrandVerify />} />
            <Route path="/directory" element={<Navigate to="/circle?tab=browse" replace />} />
            <Route path="/discover" element={<Navigate to="/credits/discover" replace />} />
            <Route path="/opportunities" element={<ProtectedRoute><Opportunities /></ProtectedRoute>} />
            
            {/* Check-in & Challenges */}
            <Route path="/checkin" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
            <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
            <Route path="/challenges/:id" element={<ProtectedRoute><ChallengeDetail /></ProtectedRoute>} />

            {/* Public Event Page */}
            <Route path="/event/:eventId" element={<EventPage />} />

            {/* Public Access Pages (No Auth Required) */}
            <Route path="/endorse" element={<EndorseSkill />} />
            <Route path="/submit-review" element={<SubmitReview />} />
            <Route path="/claim/:claimToken" element={<ClaimProfile />} />
            <Route path="/post-opportunity" element={<PostOpportunity />} />
            <Route path="/verify-opportunity" element={<VerifyOpportunity />} />
            
            {/* Search & Notifications */}
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            
            {/* Legacy redirects */}
            <Route path="/dashboard" element={<Navigate to="/my-analytics" replace />} />
            <Route path="/spark" element={<Navigate to="/circle" replace />} />
            <Route path="/cre8" element={<Navigate to="/circle" replace />} />
            
            <Route path="/marketplace" element={<Navigate to="/market" replace />} />
            
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
