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
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Spark = lazy(() => import("./pages/Spark"));
const Cre8 = lazy(() => import("./pages/Cre8"));
const Circle = lazy(() => import("./pages/Circle"));
const Community = lazy(() => import("./pages/Community"));
const Connect = lazy(() => import("./pages/Connect"));
const Messages = lazy(() => import("./pages/Messages"));
const ThriveDesk = lazy(() => import("./pages/ThriveDesk"));
const ProjectsList = lazy(() => import("./pages/ProjectsList"));
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
const AdminBroadcast = lazy(() => import("./pages/AdminBroadcast"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const SubmitReview = lazy(() => import("./pages/SubmitReview"));
const EndorseSkill = lazy(() => import("./pages/EndorseSkill"));
const TestRunner = lazy(() => import("./pages/TestRunner"));
const WaitlistAdmin = lazy(() => import("./pages/WaitlistAdmin"));

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
  
  // Don't add bottom padding when on individual project pages or desk list
  const shouldAddBottomPadding = user && !location.pathname.startsWith('/desk');
  
  return (
    <div className="h-full overflow-auto">
      <PageViewTracker />
      <Navbar user={user} />
      {user && <BottomNav />}
      <div className={shouldAddBottomPadding ? "pb-20 lg:pb-0" : ""}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Active MVP Routes */}
            <Route path="/" element={<DefaultRoute />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            
            {/* Core Feature Pages - Only 4 Active */}
            <Route path="/circle" element={<ProtectedRoute><Circle /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            
            {/* ThriveDesk - Lightweight Project Workspace */}
            <Route path="/desk" element={<ProtectedRoute><ProjectsList /></ProtectedRoute>} />
            <Route path="/desk/:projectId" element={<ProtectedRoute><ThriveDesk /></ProtectedRoute>} />
            
            {/* Subscription & Payment Routes */}
            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/admin-broadcast" element={<ProtectedRoute><AdminBroadcast /></ProtectedRoute>} />

            {/* Legal & Info Pages */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            
            {/* Redirect old routes to Circle */}
            <Route path="/dashboard" element={<Navigate to="/circle" replace />} />
            <Route path="/spark" element={<Navigate to="/circle" replace />} />
            <Route path="/discover" element={<Navigate to="/circle" replace />} />
            <Route path="/community" element={<Navigate to="/circle" replace />} />
            <Route path="/cre8" element={<Navigate to="/circle" replace />} />
            <Route path="/connect" element={<Navigate to="/circle" replace />} />
            <Route path="/marketplace" element={<Navigate to="/circle" replace />} />
            <Route path="/projects" element={<Navigate to="/circle" replace />} />
            <Route path="/leaderboard" element={<Navigate to="/circle" replace />} />
            <Route path="/membership" element={<Navigate to="/circle" replace />} />
            <Route path="/earn-credits" element={<Navigate to="/circle" replace />} />
            
            {/* 404 - Catch all */}
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
