import { Briefcase, Sparkles } from "lucide-react";
import { PostOpportunityDialog } from "@/components/PostOpportunityDialog";

interface PostOpportunitySectionProps {
  opportunitiesCount: number;
}

export const PostOpportunitySection = ({ opportunitiesCount }: PostOpportunitySectionProps) => {
  return (
    <section className="px-6 py-16 bg-muted/30">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="mb-6">
          <Briefcase className="mx-auto h-12 w-12 text-primary mb-4" />
          <h2 className="text-3xl font-bold mb-3 md:text-4xl">
            Looking to Hire Creators?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            Post your job, collaboration, or barter opportunity in seconds. 
            No account needed to get started.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
            <Sparkles className="h-4 w-4" />
            <span>{opportunitiesCount} Active Opportunities Available</span>
          </div>
        </div>
        <PostOpportunityDialog variant="hero" size="xl" />
        <p className="mt-4 text-sm text-muted-foreground">
          AI-moderated to keep our community safe
        </p>
      </div>
    </section>
  );
};
