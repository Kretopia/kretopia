import { SEO } from "@/components/SEO";
import { Briefcase } from "lucide-react";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";

const Opportunities = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO
        title="Opportunities - Find Creative Work"
        description="Browse and apply for creative opportunities, gigs, and collaborations"
      />
      <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <Briefcase className="h-7 w-7 sm:h-8 sm:w-8" />
            Opportunities
          </h1>
          <p className="text-sm text-muted-foreground">
            Find gigs, jobs, and creative collaborations
          </p>
        </div>
        <OpportunitiesFeed />
      </div>
    </div>
  );
};

export default Opportunities;
