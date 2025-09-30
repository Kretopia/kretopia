import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import Spark from "./pages/Spark";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Leaderboard from "./pages/Leaderboard";
import Circle from "./pages/Circle";
import ThriveDesk from "./pages/ThriveDesk";
import Projects from "./pages/Projects";
import ThriveStudio from "./pages/ThriveStudio";
import OpportunityDetail from "./pages/OpportunityDetail";
import ManageOpportunities from "./pages/ManageOpportunities";
import NotFound from "./pages/NotFound";
import Navbar from "./components/Navbar";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const App = () => {
  const { user } = useAuth();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar user={user} />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/opportunity/:id" element={<OpportunityDetail />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
            <Route path="/spark" element={<ProtectedRoute><Spark /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/circle" element={<ProtectedRoute><Circle /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/desk/:projectId" element={<ProtectedRoute><ThriveDesk /></ProtectedRoute>} />
            <Route path="/studio" element={<ProtectedRoute><ThriveStudio /></ProtectedRoute>} />
            <Route path="/manage-opportunities" element={<ProtectedRoute><ManageOpportunities /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
