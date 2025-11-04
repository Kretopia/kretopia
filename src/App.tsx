import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { OnboardingTour } from "./components/OnboardingTour";
import { analytics } from "@/lib/analytics";

// Lazy load all page components for better performance
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const CompanyOnboarding = lazy(() => import("./pages/CompanyOnboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Discover = lazy(() => import("./pages/Discover"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Spark = lazy(() => import("./pages/Spark"));
const Circle = lazy(() => import("./pages/Circle"));
const Connect = lazy(() => import("./pages/Connect"));
const Messages = lazy(() => import("./pages/Messages"));
const ThriveDesk = lazy(() => import("./pages/ThriveDesk"));
const Projects = lazy(() => import("./pages/Projects"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Subscription = lazy(() => import("./pages/Subscription"));
const EarnCredits = lazy(() => import("./pages/EarnCredits"));
const Membership = lazy(() => import("./pages/Membership"));
const Admin = lazy(() => import("./pages/Admin"));
const CheckIn = lazy(() => import("./pages/CheckIn"));
const OpportunityDetail = lazy(() => import("./pages/OpportunityDetail"));
const ManageOpportunities = lazy(() => import("./pages/ManageOpportunities"));
const OpportunityDashboard = lazy(() => import("./pages/OpportunityDashboard"));
const StorageManagement = lazy(() => import("./pages/StorageManagement"));
const SupportDashboard = lazy(() => import("./pages/SupportDashboard"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const Settings = lazy(() => import("./pages/Settings"));
const PartnerSubmit = lazy(() => import("./pages/PartnerSubmit"));
const PartnerDirectory = lazy(() => import("./pages/PartnerDirectory"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));
const ProjectTemplates = lazy(() => import("./pages/ProjectTemplates"));
const ThrivePay = lazy(() => import("./pages/ThrivePay"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));
const TestEmails = lazy(() => import("./pages/TestEmails"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const SubmitReview = lazy(() => import("./pages/SubmitReview"));
const EndorseSkill = lazy(() => import("./pages/EndorseSkill"));

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

// Redirect to Spark after login instead of Dashboard
const DefaultRoute = () => {
  const { user } = useAuth();
  return user ? <Navigate to="/spark" replace /> : <Landing />;
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
  
  // Don't add bottom padding when on individual project pages
  const shouldAddBottomPadding = user && !location.pathname.startsWith('/desk/');
  
  return (
    <div className="h-full overflow-auto">
      <PageViewTracker />
      <Navbar user={user} />
      {user && <BottomNav />}
      <div className={shouldAddBottomPadding ? "pb-20 lg:pb-0" : ""}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<DefaultRoute />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/accept-invite/:projectId" element={<AcceptInvite />} />
            <Route path="/opportunity/:id" element={<OpportunityDetail />} />
            <Route path="/review" element={<SubmitReview />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/company-onboarding" element={<ProtectedRoute><CompanyOnboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/spark" element={<ProtectedRoute><Spark /></ProtectedRoute>} />
            <Route path="/circle" element={<ProtectedRoute><Circle /></ProtectedRoute>} />
            <Route path="/connect" element={<ProtectedRoute><Connect /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/desk/:projectId" element={<ProtectedRoute><ThriveDesk /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/storage" element={<ProtectedRoute><StorageManagement /></ProtectedRoute>} />
            <Route path="/earn-credits" element={<ProtectedRoute><EarnCredits /></ProtectedRoute>} />
            <Route path="/membership" element={<ProtectedRoute><Membership /></ProtectedRoute>} />
            <Route path="/check-in" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/manage-opportunities" element={<ProtectedRoute><ManageOpportunities /></ProtectedRoute>} />
            <Route path="/opportunity-dashboard" element={<ProtectedRoute><OpportunityDashboard /></ProtectedRoute>} />
            <Route path="/support-dashboard" element={<ProtectedRoute><SupportDashboard /></ProtectedRoute>} />
            <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/partner-directory" element={<ProtectedRoute><PartnerDirectory /></ProtectedRoute>} />
            <Route path="/partner-submit" element={<PartnerSubmit />} />
            <Route path="/endorse" element={<EndorseSkill />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route path="/payment-history" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
            <Route path="/project-templates" element={<ProtectedRoute><ProjectTemplates /></ProtectedRoute>} />
            <Route path="/thrivepay" element={<ProtectedRoute><ThrivePay /></ProtectedRoute>} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/test-emails" element={<ProtectedRoute><TestEmails /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
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
                <OnboardingTour />
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
