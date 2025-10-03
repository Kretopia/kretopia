import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { useAuth } from "./hooks/useAuth";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";

// Lazy load all page components for better performance
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Discover = lazy(() => import("./pages/Discover"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
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
const StorageManagement = lazy(() => import("./pages/StorageManagement"));
const SupportDashboard = lazy(() => import("./pages/SupportDashboard"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const WaitlistAdmin = lazy(() => import("./pages/WaitlistAdmin"));
const TestRunner = lazy(() => import("./pages/TestRunner"));
const SubmitReview = lazy(() => import("./pages/SubmitReview"));
const PartnerDiscounts = lazy(() => import("./pages/PartnerDiscounts"));
const PartnerSubmit = lazy(() => import("./pages/PartnerSubmit"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));
const ProjectTemplates = lazy(() => import("./pages/ProjectTemplates"));

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
    <div className="animate-pulse text-primary">Loading...</div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingFallback />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const App = () => {
  const { user } = useAuth();
  
  return (
    <GlobalErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Navbar user={user} />
              {user && <BottomNav />}
              <div className={user ? "pb-20 lg:pb-0" : ""}>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/opportunity/:id" element={<OpportunityDetail />} />
                    <Route path="/review" element={<SubmitReview />} />
                    <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/profile/:userId" element={<PublicProfile />} />
                    <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
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
                    <Route path="/support-dashboard" element={<ProtectedRoute><SupportDashboard /></ProtectedRoute>} />
                    <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
                    <Route path="/admin/waitlist" element={<ProtectedRoute><WaitlistAdmin /></ProtectedRoute>} />
                    <Route path="/test-runner" element={<ProtectedRoute><TestRunner /></ProtectedRoute>} />
                    <Route path="/partner-discounts" element={<ProtectedRoute><PartnerDiscounts /></ProtectedRoute>} />
                    <Route path="/partner-submit" element={<PartnerSubmit />} />
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                    <Route path="/payment-canceled" element={<PaymentCanceled />} />
                    <Route path="/payment-history" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
                    <Route path="/project-templates" element={<ProtectedRoute><ProjectTemplates /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
