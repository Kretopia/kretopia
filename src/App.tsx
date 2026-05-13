import { Suspense, lazy as _reactLazy, useEffect, useMemo } from "react";
import { lazyWithRetry as lazy } from "./lib/lazyWithRetry";
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
import QuickActionFab from "./components/QuickActionFab";

import { ModeThemeSync } from "./components/ModeThemeSync";
import { VibeThemeSync } from "./components/VibeThemeSync";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { InteractiveOnboarding } from "./components/onboarding/InteractiveOnboarding";
import { SkipLink } from "./components/ui/skip-link";
import { FeedbackWidget } from "./components/FeedbackWidget";
import { analytics } from "@/lib/analytics";
import { trackPlatformPageview, attachPlatformAnalyticsListeners } from "@/lib/platformAnalytics";
import { NetworkStatus } from "./components/NetworkStatus";
import { useNativeCapacitor } from "./hooks/useNativeCapacitor";
import { useActivityPing } from "./hooks/useActivityPing";
import { GuestBanner } from "./components/GuestBanner";
import { AuthGate } from "./components/AuthGate";
import { OnboardingTour } from "./components/OnboardingTour";
import { NewsletterPopup } from "./components/NewsletterPopup";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import UnifiedHome from "./components/home/UnifiedHome";
import { GlobalIncomingCall } from "./components/calls/GlobalIncomingCall";
import { ThriveAgentFab } from "./components/desk/ThriveAgentFab";
import { DesktopCopilotRail } from "./components/desk/DesktopCopilotRail";
import { ThriveBar } from "./components/agent/ThriveBar";

// Lazy load active page components
const Auth = lazy(() => import("./pages/Auth"));
const CopilotMemory = lazy(() => import("./pages/CopilotMemory"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const CompanyOnboarding = lazy(() => import("./pages/CompanyOnboarding"));
const TalentFinder = lazy(() => import("./pages/TalentFinder"));
const TalentManager = lazy(() => import("./pages/TalentManager"));
const EndorseSkill = lazy(() => import("./pages/EndorseSkill"));
const CreatorEPK = lazy(() => import("./pages/CreatorEPK"));
const SubmitReview = lazy(() => import("./pages/SubmitReview"));
const Profile = lazy(() => import("./pages/Profile"));
const ViewProfile = lazy(() => import("./pages/ViewProfile"));
const DisputeCredit = lazy(() => import("./pages/DisputeCredit"));
const DisputeManage = lazy(() => import("./pages/DisputeManage"));

const Circle = lazy(() => import("./pages/Circle"));
const CircleDetailPage = lazy(() => import("./pages/CircleDetail"));
const CircleChatView = lazy(() => import("./pages/CircleChatView"));
const Circles = lazy(() => import("./pages/Circles"));
const Messages = lazy(() => import("./pages/Messages"));
const ThriveDesk = lazy(() => import("./pages/ThriveDesk"));
const ProjectsList = lazy(() => import("./pages/ProjectsList"));
const Shortlists = lazy(() => import("./pages/Shortlists"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminWeeklyNote = lazy(() => import("./pages/AdminWeeklyNote"));
const AdminDisputes = lazy(() => import("./pages/AdminDisputes"));
const Settings = lazy(() => import("./pages/Settings"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const EmailUnsubscribe = lazy(() => import("./pages/EmailUnsubscribe"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));
const About = lazy(() => import("./pages/About"));
const ClaimProfile = lazy(() => import("./pages/ClaimProfile"));
const Claim = lazy(() => import("./pages/Claim"));

const Search = lazy(() => import("./pages/Search"));
const NearbyCreators = lazy(() => import("./pages/NearbyCreators"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const InboxPage = lazy(() => import("./pages/Inbox"));
const Intel = lazy(() => import("./pages/Intel"));
const ThrivePay = lazy(() => import("./pages/ThrivePay"));

const Install = lazy(() => import("./pages/Install"));
const GuestCall = lazy(() => import("./pages/GuestCall"));
const GuestStudio = lazy(() => import("./pages/GuestStudio"));
const GuestPay = lazy(() => import("./pages/GuestPay"));
const ProjectReview = lazy(() => import("./pages/ProjectReview"));
const FoundingMember = lazy(() => import("./pages/FoundingMember"));
const JoinWithCode = lazy(() => import("./pages/JoinWithCode"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const JoinGuestStudio = lazy(() => import("./pages/JoinGuestStudio"));
const CallPage = lazy(() => import("./pages/CallPage"));

const OpportunityDetail = lazy(() => import("./pages/OpportunityDetail"));
const PostOpportunity = lazy(() => import("./pages/PostOpportunity"));
const VerifyOpportunity = lazy(() => import("./pages/VerifyOpportunity"));
const ProductionPage = lazy(() => import("./pages/ProductionPage"));
const CreditVerify = lazy(() => import("./pages/CreditVerify"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const ClaimGig = lazy(() => import("./pages/ClaimGig"));
const ManageOpportunities = lazy(() => import("./pages/ManageOpportunities"));
const OpportunityDashboard = lazy(() => import("./pages/OpportunityDashboard"));

const EventPage = lazy(() => import("./pages/EventPage"));
const ClaimEvent = lazy(() => import("./pages/ClaimEvent"));
const EventConfirmed = lazy(() => import("./pages/EventConfirmed"));
const GuestPass = lazy(() => import("./pages/GuestPass"));
const Meetup = lazy(() => import("./pages/Meetup"));
const MeetupManage = lazy(() => import("./pages/MeetupManage"));

const Scene = lazy(() => import("./pages/Scene"));
const EventBackstage = lazy(() => import("./pages/EventBackstage"));
const EventCrewMode = lazy(() => import("./pages/EventCrewMode"));
const Podcast = lazy(() => import("./pages/Podcast"));
const Magazine = lazy(() => import("./pages/Magazine"));
const Spotlight = lazy(() => import("./pages/Spotlight"));
const MagazineArticlePage = lazy(() => import("./pages/MagazineArticlePage"));
const CreditDatabase = lazy(() => import("./pages/CreditDatabase"));
const ICDBProjectPage = lazy(() => import("./pages/ICDBProjectPage"));
const BrandVerify = lazy(() => import("./pages/BrandVerify"));
const WorkHome = lazy(() => import("./pages/WorkHome"));
const Explore = lazy(() => import("./pages/Explore"));
const CreativeCircle = lazy(() => import("./pages/CreativeCircle"));
const Ambassadors = lazy(() => import("./pages/Ambassadors"));
const Ambassador = lazy(() => import("./pages/Ambassador"));
const CreatorSite = lazy(() => import("./pages/CreatorSite"));
const CreatorSiteByUsername = lazy(() => import("./pages/CreatorSiteByUsername"));
const WebsiteBuilder = lazy(() => import("./pages/WebsiteBuilder"));
const ShareGigRedirect = lazy(() => import("./pages/ShareRedirects").then(m => ({ default: m.ShareGigRedirect })));
const ShareProfileRedirect = lazy(() => import("./pages/ShareRedirects").then(m => ({ default: m.ShareProfileRedirect })));
const Fund = lazy(() => import("./pages/Fund"));
const FundNew = lazy(() => import("./pages/FundNew"));
const FundCampaign = lazy(() => import("./pages/FundCampaign"));
const FundManage = lazy(() => import("./pages/FundManage"));
const ManageHub = lazy(() => import("./pages/ManageHub"));
const ShareEventRedirect = lazy(() => import("./pages/ShareRedirects").then(m => ({ default: m.ShareEventRedirect })));
const ShareMagazineRedirect = lazy(() => import("./pages/ShareRedirects").then(m => ({ default: m.ShareMagazineRedirect })));
const ShareCampaignRedirect = lazy(() => import("./pages/ShareRedirects").then(m => ({ default: m.ShareCampaignRedirect })));
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
  const { user, loading, session } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  // Only show the auth gate after auth hydration is complete and there is truly no session
  if (!session || !user) {
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
  if (!user) return <Navigate to="/" replace />;
  let mode = "create";
  try { mode = localStorage.getItem("thrivein-nav-mode") || "create"; } catch {}
  return <Navigate to={mode === "work" ? "/desk" : "/"} replace />;
};

// Track page views
const PageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    attachPlatformAnalyticsListeners();
    // Capture ?amb=CODE referral attribution on first arrival
    import('@/lib/ambassadorAttribution').then(m => m.captureAmbassadorCodeFromUrl());
  }, []);

  useEffect(() => {
    analytics.pageView(location.pathname);
    void trackPlatformPageview(location.pathname);
  }, [location.pathname]);

  return null;
};

// Content wrapper that conditionally applies padding
const AppContent = () => {
  const location = useLocation();
  const { user } = useAuth();
  useNativeCapacitor();
  useActivityPing();
  
  // Check if on public EPK page (hide navbar/bottomnav for standalone link-in-bio experience)
  const isPublicEPK = /^\/epk\/[^/]+$/.test(location.pathname);
  const isCreatorSite = /^\/site\/[^/]+$/.test(location.pathname) || location.pathname === '/website-builder';
  const isPublicEvent = /^\/event\/[^/]+$/.test(location.pathname);
  const isAuthPage = location.pathname === '/auth';
  const isOnboardingPage = location.pathname === '/onboarding' || location.pathname === '/company-onboarding';
  const isDeckPage = location.pathname === '/deck';
  const isLandingPage = location.pathname === '/';
  
  // Public browsable routes where guests see nav — expanded to show platform value
  const publicBrowseRoutes = ['/scene', '/opportunities', '/credits', '/circle', '/search', '/event', '/profile'];
  const isPublicBrowse = publicBrowseRoutes.some(r => location.pathname.startsWith(r));
  
  // Show bottom nav for authenticated users OR guests on public browse routes (+ landing)
  // Hide everything during onboarding so users focus on setup
  const showBottomNav = !isPublicEPK && !isCreatorSite && !isAuthPage && !isOnboardingPage && !isDeckPage && !!user;
  const showNavbar = !isPublicEPK && !isCreatorSite && !isAuthPage && !isOnboardingPage && !isDeckPage;
  const showGuestBanner = !user && (isPublicBrowse || isLandingPage) && !isAuthPage;
  
  // Don't add bottom padding when on individual project pages or desk list
  const shouldAddBottomPadding = showBottomNav && !location.pathname.startsWith('/desk');
  
  return (
    <div className="h-full overflow-auto">
      <ModeThemeSync />
      <VibeThemeSync />
      <NetworkStatus />
      <SkipLink />
      <PageViewTracker />
      {showNavbar && <Navbar user={user} />}
      {showBottomNav && <BottomNav />}
      {/* QuickActionFab removed — bottom nav + hamburger cover create flows */}
      <ThriveAgentFab />
      <DesktopCopilotRail />
      {showBottomNav && <ThriveBar />}
      
      {user && !isAuthPage && !isOnboardingPage && <OnboardingTour />}
      {user && <GlobalIncomingCall />}
      {!user && <NewsletterPopup />}
      <PWAInstallPrompt />
      {showGuestBanner && <GuestBanner />}
      <main
        id="main-content"
        className={shouldAddBottomPadding ? "pb-36 lg:pb-0" : ""}
        style={{ paddingRight: "var(--copilot-rail-w, 0px)" }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Active MVP Routes */}
            <Route path="/" element={<DefaultRoute />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/claim" element={<Claim />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/founding-member" element={<ProtectedRoute><FoundingMember /></ProtectedRoute>} />
            <Route path="/company-onboarding" element={<ProtectedRoute><CompanyOnboarding /></ProtectedRoute>} />
            
            {/* Core Feature Pages - Public browsable, actions gated */}
            <Route path="/circle" element={<Circle />} />
            <Route path="/circle/:circleId" element={<ProtectedRoute><CircleDetailPage /></ProtectedRoute>} />
            <Route path="/circle/:circleId/chat" element={<ProtectedRoute><CircleChatView /></ProtectedRoute>} />
            <Route path="/circles" element={<Circles />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            {/* View other user's profile - Auth users get in-app view, public gets EPK */}
            <Route path="/profile/:userId" element={<ViewProfile />} />
            <Route path="/dispute/:creditId" element={<ProtectedRoute><DisputeCredit /></ProtectedRoute>} />
            <Route path="/dispute-manage/:disputeId" element={<ProtectedRoute><DisputeManage /></ProtectedRoute>} />
            <Route path="/epk/:userId" element={<CreatorEPK />} />
            <Route path="/site/:userId" element={<CreatorSite />} />
            <Route path="/website-builder" element={<ProtectedRoute><WebsiteBuilder /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/settings/copilot-memory" element={<ProtectedRoute><CopilotMemory /></ProtectedRoute>} />
            <Route path="/my-analytics" element={<Navigate to="/profile" replace />} />
            <Route path="/guide" element={<Navigate to="/" replace />} />
            
            {/* ThriveDesk - Lightweight Project Workspace */}
            <Route path="/desk" element={<ProtectedRoute><WorkHome /></ProtectedRoute>} />
            <Route path="/desk/projects" element={<Navigate to="/desk" replace />} />
            <Route path="/shortlists" element={<ProtectedRoute><Shortlists /></ProtectedRoute>} />
            <Route path="/desk/:projectId" element={<ProtectedRoute><ThriveDesk /></ProtectedRoute>} />

            {/* Client Hub — group projects per client */}
            <Route path="/manage" element={<ProtectedRoute><ManageHub /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/clients/:clientId" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />

            {/* ThriveFund — Crowdfunding */}
            <Route path="/fund" element={<Fund />} />
            <Route path="/fund/new" element={<ProtectedRoute><FundNew /></ProtectedRoute>} />
            <Route path="/fund/manage" element={<ProtectedRoute><FundManage /></ProtectedRoute>} />
            <Route path="/fund/:slug" element={<FundCampaign />} />
            
            {/* Subscription & Payment Routes */}
            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/thrivepay" element={<ProtectedRoute><ThrivePay /></ProtectedRoute>} />
            <Route path="/guest-pay" element={<GuestPay />} />
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
            <Route path="/talent-manager" element={<ProtectedRoute><TalentManager /></ProtectedRoute>} />
            <Route path="/creative-circle" element={<ProtectedRoute><CreativeCircle /></ProtectedRoute>} />
            <Route path="/ambassadors" element={<Ambassadors />} />
            <Route path="/ambassador" element={<ProtectedRoute><Ambassador /></ProtectedRoute>} />
            <Route path="/checkin" element={<Navigate to="/" replace />} />
            
            {/* Public Browsable Routes */}
            <Route path="/nearby" element={<NearbyCreators />} />
            <Route path="/events/backstage" element={<EventBackstage />} />
            <Route path="/events" element={<Navigate to="/meetup" replace />} />
            <Route path="/desk/:projectId/crew" element={<EventCrewMode />} />
            <Route path="/scene" element={<Scene />} />
            <Route path="/explore" element={<Navigate to="/nearby" replace />} />
            
            {/* Public Magazine Article - SEO accessible */}
            <Route path="/magazine/:slug" element={<MagazineArticlePage />} />
            <Route path="/magazine" element={<Navigate to="/spotlight?tab=magazine" replace />} />
            <Route path="/podcast" element={<Navigate to="/spotlight?tab=podcast" replace />} />
            <Route path="/spotlight" element={<Spotlight />} />
            
            {/* PWA Install Page */}
            <Route path="/install" element={<Install />} />

            {/* Public guest video call join */}
            <Route path="/call/:token" element={<GuestCall />} />
            <Route path="/meet/:meetingId" element={<CallPage />} />
            <Route path="/guest/:token" element={<GuestStudio />} />
            <Route path="/review/:token" element={<ProjectReview />} />
            
            {/* Invite Link with Code */}
            <Route path="/join/:code" element={<JoinWithCode />} />
            
            {/* Project Invitation Accept */}
            <Route path="/accept-invite/:projectId" element={<AcceptInvite />} />
            <Route path="/desk/join/:token" element={<JoinGuestStudio />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/admin/weekly-note" element={<ProtectedRoute><AdminWeeklyNote /></ProtectedRoute>} />
            <Route path="/admin/disputes" element={<ProtectedRoute><AdminDisputes /></ProtectedRoute>} />
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
            <Route path="/about" element={<About />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/email-unsubscribe" element={<Suspense fallback={null}><EmailUnsubscribe /></Suspense>} />
            
            {/* Share page SPA fallbacks (static HTML may not be served by SPA hosting) */}
            <Route path="/share/gig/:id" element={<ShareGigRedirect />} />
            <Route path="/share/profile/:id" element={<ShareProfileRedirect />} />
            <Route path="/share/event/:id" element={<ShareEventRedirect />} />
            <Route path="/share/magazine/:slug" element={<ShareMagazineRedirect />} />
            <Route path="/share/fund/:slug" element={<ShareCampaignRedirect />} />

            {/* Partner Pages — redirected */}
            <Route path="/partner-directory" element={<Navigate to="/" replace />} />
            <Route path="/partner-submit" element={<Navigate to="/" replace />} />
            
            {/* Opportunity Management */}
            <Route path="/opportunity/:id" element={<OpportunityDetail />} />
            <Route path="/opportunity-dashboard" element={<ProtectedRoute><OpportunityDashboard /></ProtectedRoute>} />
            <Route path="/manage-opportunities" element={<ProtectedRoute><ManageOpportunities /></ProtectedRoute>} />
            <Route path="/talent-finder" element={<ProtectedRoute><TalentFinder /></ProtectedRoute>} />

            {/* Rewards - hidden for now */}
            <Route path="/rewards" element={<Navigate to="/" replace />} />
            <Route path="/rewards-shop" element={<Navigate to="/" replace />} />
            
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
            <Route path="/event/:eventId/confirmed" element={<EventConfirmed />} />
            <Route path="/event/:eventId/pass" element={<GuestPass />} />

            {/* Meetup Hub — dedicated events discovery */}
            <Route path="/meetup" element={<Meetup />} />
            <Route path="/meetup/manage" element={<MeetupManage />} />
            <Route path="/meetups" element={<Navigate to="/meetup" replace />} />

            {/* Public Access Pages (No Auth Required) */}
            <Route path="/endorse" element={<EndorseSkill />} />
            <Route path="/submit-review" element={<SubmitReview />} />
            <Route path="/claim/:claimToken" element={<ClaimProfile />} />
            <Route path="/post-opportunity" element={<PostOpportunity />} />
            <Route path="/claim-gig/:token" element={<ClaimGig />} />
            <Route path="/claim-event/:token" element={<ClaimEvent />} />
            <Route path="/verify-opportunity" element={<VerifyOpportunity />} />
            <Route path="/credit-verify" element={<CreditVerify />} />
            
            {/* Search & Notifications */}
            <Route path="/search" element={<Search />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
            <Route path="/intel" element={<ProtectedRoute><Intel /></ProtectedRoute>} />
            
            {/* Legacy redirects — consolidated */}
            <Route path="/dashboard" element={<Navigate to="/desk" replace />} />
            <Route path="/spark" element={<Navigate to="/" replace />} />
            <Route path="/cre8" element={<Navigate to="/" replace />} />
            <Route path="/marketplace" element={<Navigate to="/opportunities" replace />} />
            
            {/* Vanity URL for creator sites — must be before catch-all */}
            <Route path="/:username" element={<CreatorSiteByUsername />} />
            
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
