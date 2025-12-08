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

// Lazy load active page components
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Profile = lazy(() => import("./pages/Profile"));
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
            <Route path="/my-analytics" element={<ProtectedRoute><MyAnalytics /></ProtectedRoute>} />
            
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
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            
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
