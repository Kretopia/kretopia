import { SEO } from "@/components/SEO";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";

const Opportunities = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO
        title="Productions — Find Creative Work | ThriveIN"
        description="Browse and apply for creative productions, paid gigs, collaborations, and barter opportunities on ThriveIN"
      />
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <OpportunitiesFeed />
      </div>
    </div>
  );
};

export default Opportunities;
