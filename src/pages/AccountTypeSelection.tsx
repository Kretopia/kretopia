import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, User, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

export default function AccountTypeSelection() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<"individual" | "company" | null>(null);

  const handleContinue = () => {
    if (selectedType === "individual") {
      navigate("/auth?type=individual");
    } else if (selectedType === "company") {
      navigate("/auth?type=company");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <SEO 
        title="Join ThriveIN - Choose Your Account Type"
        description="Sign up as a creator or company on ThriveIN"
      />
      
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Join ThriveIN</h1>
          <p className="text-muted-foreground text-lg">
            Choose the account type that best describes you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedType === "individual" 
                ? "ring-2 ring-primary shadow-lg" 
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedType("individual")}
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Creator / Creative</h2>
              <p className="text-muted-foreground mb-6">
                I'm an individual looking to showcase my work, find opportunities, 
                and collaborate with others
              </p>
              <ul className="text-left space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Build your portfolio</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Find collaborations & gigs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Connect with brands</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Get discovered</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedType === "company" 
                ? "ring-2 ring-primary shadow-lg" 
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedType("company")}
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Brand / Venue / Company</h2>
              <p className="text-muted-foreground mb-6">
                I represent a business looking to hire talent, post opportunities, 
                and build partnerships
              </p>
              <ul className="text-left space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Post job opportunities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Find top talent</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Build company reputation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Get reviewed by creatives</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button 
            size="lg"
            onClick={handleContinue}
            disabled={!selectedType}
            className="min-w-[200px]"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
