import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, XCircle, Briefcase, UserPlus } from "lucide-react";
import { Helmet } from "react-helmet-async";

const VerifyOpportunity = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [result, setResult] = useState<{ opportunityId?: string; companyName?: string; claimToken?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token found.");
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-guest-opportunity", {
          body: { action: "verify", token },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setResult(data);
        setStatus("success");
      } catch (err: any) {
        console.error("Verification error:", err);
        setErrorMessage(err.message || "Verification failed. The link may have expired.");
        setStatus("error");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Helmet>
        <title>Verify Opportunity | ThriveIN</title>
      </Helmet>

      <Card className="max-w-md w-full text-center">
        {status === "verifying" && (
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl">Verifying...</CardTitle>
            <CardDescription>Hang tight while we activate your listing.</CardDescription>
          </CardHeader>
        )}

        {status === "success" && (
          <>
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">You're live! 🎉</CardTitle>
              <CardDescription className="text-base">
                Your opportunity is now published on ThriveIN's Discover page. Creatives can start applying immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full gap-2">
                <Link to={`/opportunity/${result?.opportunityId}`}>
                  <Briefcase className="h-4 w-4" />
                  View Your Listing
                </Link>
              </Button>

              {result?.claimToken && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2 justify-center">
                    <UserPlus className="h-4 w-4 text-primary" />
                    Claim your Brand profile
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sign up to manage applications, message talent, and post more opportunities.
                  </p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to={`/auth?claim=${result.claimToken}`}>
                      Create Free Account
                    </Link>
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                We've created a brand profile for {result?.companyName}. Sign up anytime to claim it.
              </p>
            </CardContent>
          </>
        )}

        {status === "error" && (
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Verification failed</CardTitle>
            <CardDescription className="text-base">{errorMessage}</CardDescription>
            <Button variant="outline" asChild className="mt-4">
              <Link to="/post-opportunity">Try posting again</Link>
            </Button>
          </CardHeader>
        )}
      </Card>
    </div>
  );
};

export default VerifyOpportunity;
