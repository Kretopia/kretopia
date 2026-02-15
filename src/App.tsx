import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { ThirdwebProvider } from "thirdweb/react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { InteractiveOnboarding } from "./components/onboarding/InteractiveOnboarding";
import { SkipLink } from "./components/ui/skip-link";
import { analytics } from "@/lib/analytics";

// Lazy load active page components
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const EndorseSkill = lazy(() => import("./pages/EndorseSkill"));
const CreatorEPK = lazy(() => import("./pages/CreatorEPK"));
const SubmitReview = lazy(() => import("./pages/SubmitReview"));
const Profile = lazy(() => import("./pages/Profile"));
const ViewProfile = lazy(() => import("./pages/ViewProfile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Circle = lazy(() => import("./pages/Circle"));
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
const TestEmails = lazy(() => import("./pages/TestEmails"));
const PurchaseSuccess = lazy(() => import("./pages/PurchaseSuccess"));
const MyPurchases = lazy(() => import("./pages/MyPurchases"));
const ThrivePay = lazy(() => import("./pages/ThrivePay"));
const AIAgent = lazy(() => import("./pages/AIAgent"));
const ThriveAI = lazy(() => import("./pages/ThriveAI"));
const NearbyCreators = lazy(() => import("./pages/NearbyCreators"));
const Install = lazy(() => import("./pages/Install"));
const JoinWithCode = lazy(() => import("./pages/JoinWithCode"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const WaitlistAdmin = lazy(() => import("./pages/WaitlistAdmin"));
const Spark = lazy(() => import("./pages/Spark"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const OpportunityDetail = lazy(() => import("./pages/OpportunityDetail"));
const OpportunityDashboard = lazy(() => import("./pages/OpportunityDashboard"));
const ManageOpportunities = lazy(() => import("./pages/ManageOpportunities"));
const PostOpportunity = lazy(() => import("./pages/PostOpportunity"));
const VerifyOpportunity = lazy(() => import("./pages/VerifyOpportunity"));
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

// Redirect to Circle (Match) after login
const DefaultRoute = () => {
  const { user } = useAuth();
  return user ? <Navigate to="/circle" replace /> : <Landing />;
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
  
  // Check if on public EPK page (hide navbar/bottomnav for standalone link-in-bio experience)
  const isPublicEPK = /^\/epk\/[^/]+$/.test(location.pathname);
  
  // Don't add bottom padding when on individual project pages or desk list
  const shouldAddBottomPadding = user && !location.pathname.startsWith('/desk') && !isPublicEPK;
  
  return (
    <div className="h-full overflow-auto">
      <SkipLink />
      <PageViewTracker />
      {!isPublicEPK && <Navbar user={user} />}
      {user && !isPublicEPK && <BottomNav />}
      <main id="main-content" className={shouldAddBottomPadding ? "pb-20 lg:pb-0" : ""}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Active MVP Routes */}
            <Route path="/" element={<DefaultRoute />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            
            {/* Core Feature Pages - Only 4 Active */}
            <Route path="/circle" element={<ProtectedRoute><Circle /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            {/* View other user's profile - Auth users get in-app view, public gets EPK */}
            <Route path="/profile/:userId" element={<ViewProfile />} />
            <Route path="/epk/:userId" element={<CreatorEPK />} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/my-analytics" element={<ProtectedRoute><MyAnalytics /></ProtectedRoute>} />
            
            {/* ThriveDesk - Lightweight Project Workspace */}
            <Route path="/desk" element={<ProtectedRoute><ProjectsList /></ProtectedRoute>} />
            <Route path="/desk/:projectId" element={<ProtectedRoute><ThriveDesk /></ProtectedRoute>} />
            
            {/* Subscription & Payment Routes */}
            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/thrivepay" element={<ProtectedRoute><ThrivePay /></ProtectedRoute>} />
            <Route path="/wallet" element={<Navigate to="/thrivepay" replace />} />
            <Route path="/purchases" element={<ProtectedRoute><MyPurchases /></ProtectedRoute>} />
            <Route path="/purchase-success" element={<PurchaseSuccess />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            
            {/* AI Agent */}
            <Route path="/agent" element={<ProtectedRoute><AIAgent /></ProtectedRoute>} />
            <Route path="/thrive-ai" element={<ProtectedRoute><ThriveAI /></ProtectedRoute>} />
            
            {/* Nearby Creators */}
            <Route path="/nearby" element={<ProtectedRoute><NearbyCreators /></ProtectedRoute>} />
            
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

            {/* Legal & Info Pages */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            
            {/* Partner Pages */}
            <Route path="/partner-directory" element={<ProtectedRoute><PartnerDirectory /></ProtectedRoute>} />
            <Route path="/partner-submit" element={<ProtectedRoute><PartnerSubmit /></ProtectedRoute>} />
            
            {/* Public Access Pages (No Auth Required) */}
            <Route path="/endorse" element={<EndorseSkill />} />
            <Route path="/submit-review" element={<SubmitReview />} />
            <Route path="/claim/:claimToken" element={<ClaimProfile />} />
            <Route path="/post-opportunity" element={<PostOpportunity />} />
            <Route path="/verify-opportunity" element={<VerifyOpportunity />} />
            
            {/* Redirect old routes to Circle */}
            <Route path="/dashboard" element={<Navigate to="/circle" replace />} />
            <Route path="/spark" element={<ProtectedRoute><Spark /></ProtectedRoute>} />
            <Route path="/market" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="/opportunity/:id" element={<OpportunityDetail />} />
            <Route path="/opportunity-dashboard" element={<ProtectedRoute><OpportunityDashboard /></ProtectedRoute>} />
            <Route path="/manage-opportunities" element={<ProtectedRoute><ManageOpportunities /></ProtectedRoute>} />
            <Route path="/market/:listingId" element={<ProtectedRoute><ListingDetail /></ProtectedRoute>} />
            <Route path="/discover" element={<Navigate to="/circle" replace />} />
            <Route path="/community" element={<Navigate to="/circle" replace />} />
            <Route path="/cre8" element={<Navigate to="/circle" replace />} />
            <Route path="/connect" element={<Navigate to="/circle" replace />} />
            <Route path="/marketplace" element={<Navigate to="/market" replace />} />
            <Route path="/projects" element={<Navigate to="/circle" replace />} />
            <Route path="/leaderboard" element={<Navigate to="/circle" replace />} />
            <Route path="/membership" element={<Navigate to="/circle" replace />} />
            <Route path="/earn-credits" element={<Navigate to="/circle" replace />} />
            
            {/* 404 - Catch all */}
            <Route path="*" element={<NotFound />} />
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
          <ThirdwebProvider>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <VercelAnalytics />
                <BrowserRouter>
                  <InteractiveOnboarding />
                  <AppContent />
                </BrowserRouter>
              </TooltipProvider>
            </AuthProvider>
          </ThirdwebProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
