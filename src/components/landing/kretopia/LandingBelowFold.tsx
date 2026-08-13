/**
 * LandingBelowFold — everything on the landing page after the hero.
 *
 * Split into its own chunk and mounted only once the visitor approaches it
 * (or the browser goes idle), so the hero + search bar stay on the critical
 * path and become interactive as early as possible.
 *
 * Every chapter is a full FeatureTutorialSection: identity → headline →
 * plain-language explanation → an interactive tutorial whose active step
 * drives a step-reactive visual preview alongside it → CTA → next-step
 * guidance. Numbers come from chapterRegistry.ts — the single source of
 * truth also used by ChapterProgressNav.
 */
import { SearchTutorialSection } from "@/components/landing/kretopia/SearchTutorialSection";
import { FeatureTutorialSection } from "@/components/landing/kretopia/FeatureTutorialSection";
import { VerifiedCreditsChapterSection } from "@/components/landing/kretopia/VerifiedCreditsChapterSection";
import { MeetKretoSection } from "@/components/landing/kretopia/MeetKretoSection";
import { ClosingSection } from "@/components/landing/kretopia/ClosingSection";
import { EditorialFooter } from "@/components/landing/kretopia/EditorialFooter";
import {
  PassportVisual, ScoutVisual, MatchVisual, StudioVisual, SoundStagesVisual,
} from "@/components/landing/kretopia/featureVisuals";
import {
  PASSPORT_TUTORIAL, SCOUT_TUTORIAL, MATCH_TUTORIAL,
  STUDIO_TUTORIAL, SOUNDSTAGES_TUTORIAL,
} from "@/components/landing/kretopia/tutorialContent";

export const LandingBelowFold = () => {
  return (
    <>
      {/* Search — the Hero above already IS the live feature; this is just its tutorial */}
      <SearchTutorialSection />

      {/* Passport */}
      <FeatureTutorialSection
        id="chapter-passport"
        kicker="Passport"
        categoryLabel="Creative Identity"
        title={
          <>
            Every credit,{" "}
            <span className="italic" style={{ color: "rgba(255,255,255,0.6)" }}>co-signed by</span>{" "}
            the people who were there.
          </>
        }
        description="Your Creative Passport collects every project, every credit, every co-sign — verified by the collaborators who lived it with you. It's the one link that represents your whole career."
        steps={PASSPORT_TUTORIAL}
        renderVisual={(activeStep) => <PassportVisual activeStep={activeStep} />}
        primaryCTA={{ label: "Explore the Passport", href: "/auth?next=/profile" }}
        nextStepNote="Sign in to claim your own Passport — Kretopia pre-fills it from anything public it can already find."
      />

      {/* Verified Credits — the canonical tutorial reference */}
      <VerifiedCreditsChapterSection />

      {/* Scout */}
      <FeatureTutorialSection
        id="chapter-scout"
        kicker="Scout"
        categoryLabel="Opportunities"
        title={
          <>
            The opportunity finds{" "}
            <span className="italic" style={{ color: "rgba(255,255,255,0.6)" }}>you</span>.
          </>
        }
        description="Scout reads real gigs, briefs, and casting calls from across the web and surfaces the ones that fit your Passport. Kreto can draft the pitch — you always decide if it goes."
        steps={SCOUT_TUTORIAL}
        renderVisual={(activeStep) => <ScoutVisual activeStep={activeStep} />}
        primaryCTA={{ label: "Explore Scout", href: "/auth?next=/scout" }}
        nextStepNote="Sign in to see opportunities matched to your own record, not a generic feed."
        reverse
      />

      {/* Match */}
      <FeatureTutorialSection
        id="chapter-match"
        kicker="Match"
        categoryLabel="Collaborators"
        title={
          <>
            The right person{" "}
            <span className="italic" style={{ color: "rgba(255,255,255,0.6)" }}>for the work</span>.
          </>
        }
        description="Match connects creators by skill, city, vibe, and the people you've already made things with. No cold DMs — every suggestion comes with the shared context that makes the intro make sense."
        steps={MATCH_TUTORIAL}
        renderVisual={(activeStep) => <MatchVisual activeStep={activeStep} />}
        primaryCTA={{ label: "Explore Match", href: "/auth?next=/match" }}
        nextStepNote="Sign in to see who Match suggests from your own network and history."
      />

      {/* Studio */}
      <FeatureTutorialSection
        id="chapter-studio"
        kicker="Studio"
        categoryLabel="Production"
        title={
          <>
            From idea to invoice,{" "}
            <span className="italic" style={{ color: "rgba(255,255,255,0.6)" }}>in one room</span>.
          </>
        }
        description="Every shoot, drop, release, or campaign gets its own Studio — brief, files, chat, milestones, and payments held together in one place. Kreto keeps it organized quietly in the background."
        steps={STUDIO_TUTORIAL}
        renderVisual={(activeStep) => <StudioVisual activeStep={activeStep} />}
        primaryCTA={{ label: "Create a project", href: "/auth?next=/desk" }}
        nextStepNote="Sign in to open your first Studio room — Kreto helps turn a brief into starter tasks."
        reverse
      />

      {/* SoundStages */}
      <FeatureTutorialSection
        id="chapter-soundstages"
        kicker="SoundStages"
        categoryLabel="Live Rooms"
        title={
          <>
            Live rooms.{" "}
            <span className="italic" style={{ color: "rgba(255,255,255,0.6)" }}>Real conversations</span>.
          </>
        }
        description="Speed Sessions are live, rotating conversations — drop in and meet someone new every few minutes. Auditions are submission-first: send your work, and the host reviews it before inviting you live."
        steps={SOUNDSTAGES_TUTORIAL}
        renderVisual={(activeStep) => <SoundStagesVisual activeStep={activeStep} />}
        primaryCTA={{ label: "Explore SoundStages", href: "/auth?next=/circle?tab=live" }}
        nextStepNote="Sign in to join a live room or submit to an open audition."
      />

      {/* Kreto — the sunset moment */}
      <MeetKretoSection />

      {/* Closing */}
      <ClosingSection />

      {/* Footer */}
      <EditorialFooter />
    </>
  );
};

export default LandingBelowFold;
