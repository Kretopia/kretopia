import { useAuth } from "@/hooks/useAuth";
import { PortfolioAnalytics } from "@/components/profile/PortfolioAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const MyAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view analytics</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-6">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              My Analytics
            </h1>
            <p className="text-muted-foreground text-sm">
              Track your portfolio performance and engagement
            </p>
          </div>
        </div>

        {/* Portfolio Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioAnalytics userId={user.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyAnalytics;
