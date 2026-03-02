import { SEO } from "@/components/SEO";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";

const Opportunities = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO
        title="Opportunities - Find Creative Work"
        description="Browse and apply for creative opportunities, gigs, and collaborations"
      />
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <OpportunitiesFeed />
      </div>
    </div>
  );
};

export default Opportunities;
