/**
 * LandingBelowFold — everything on the landing page after the hero.
 *
 * Split into its own chunk and mounted only once the visitor approaches it
 * (or the browser goes idle), so the hero + search bar stay on the critical
 * path and become interactive as early as possible.
 *
 * Every chapter follows one structural pattern: image (or illustrative
 * visual) → numbered title → explanation → an interactive tutorial
 * immediately below it. Numbers come from chapterRegistry.ts — the single
 * source of truth also used by ChapterProgressNav — so removing, adding,
 * or reordering a chapter here never requires hand-patching a number
 * anywhere else.
 */
import { SearchTutorialSection } from "@/components/landing/kretopia/SearchTutorialSection";
import { ChapterSection } from "@/components/landing/kretopia/ChapterSection";
import { VerifiedCreditsChapterSection } from "@/components/landing/kretopia/VerifiedCreditsChapterSection";
import { TrustSection } from "@/components/landing/kretopia/TrustSection";
import { ProductLoopSection } from "@/components/landing/kretopia/ProductLoopSection";
import { MeetKretoSection } from "@/components/landing/kretopia/MeetKretoSection";
import { EditorialFooter } from "@/components/landing/kretopia/EditorialFooter";
import { chapterRoman } from "@/components/landing/kretopia/chapterRegistry";
import {
  PASSPORT_TUTORIAL, SCOUT_TUTORIAL, MATCH_TUTORIAL,
  STUDIO_TUTORIAL, SOUNDSTAGES_TUTORIAL,
} from "@/components/landing/kretopia/tutorialContent";
import {
  PassportVisual, ScoutVisual, MatchVisual,
  StudioVisual, SoundStagesVisual,
} from "@/components/landing/kretopia/featureVisuals";

import passportImg    from "@/assets/kretopia/chapter-passport.jpg";
import scoutImg       from "@/assets/kretopia/chapter-scout.jpg";
import matchImg       from "@/assets/kretopia/chapter-match.jpg";
import studioImg      from "@/assets/kretopia/chapter-studio.jpg";
import soundstagesImg from "@/assets/kretopia/chapter-soundstages.jpg";

export const LandingBelowFold = () => {
  return (
    <>
      {/* Search — the Hero above already IS the live feature; this is just its tutorial */}
      <SearchTutorialSection />

      {/* Passport */}
      <ChapterSection
        id="chapter-passport"
        index={chapterRoman("chapter-passport")}
        kicker="Passport"
        title={
          <>
            One place for <br />
            <span className="italic" style={{ color: "rgba(255,255,255,0.6)" }}>
              the work
            </span>{" "}
            <br className="hidden sm:block" />
            that made you
          </>
        }
        body="Your Creative Passport brings your projects, credits, skills, collaborators and professional history together in one living record. Not just what you say you can do — what you've actually done."
        caption="Passport"
        image={passportImg}
        accent="#FF2DA1"
        href="/auth?next=/profile"
        ctaLabel="Build Your Passport"
        closingLine="One link. Your creative career."
        concepts={[
          { label: "Credits", body: "The role you played." },
          { label: "Projects", body: "The work you contributed to." },
          { label: "Co-Signs", body: "People who can confirm your contribution." },
          { label: "Evidence", body: "Proof that strengthens the record." },
        ]}
        tutorialSteps={PASSPORT_TUTORIAL}
        tutorialVisual={PassportVisual}
      />

      {/* Verified Credits — the canonical tutorial reference */}
      <VerifiedCreditsChapterSection />

      {/* Trust — the general Co-Sign principle, real evidence states */}
      <TrustSection />

      {/* Product Loop — Passport -> Scout -> Match -> Studio -> stronger Passport */}
      <ProductLoopSection />

      {/* Scout */}
      <ChapterSection
        id="chapter-scout"
        index={chapterRoman("chapter-scout")}
        kicker="Scout"
        title={
          <>
            The opportunity finds<br />
            <span className="italic" style={{ color: "rgba(255,255,255,0.6)" }}>
              you
            </span>
          </>
        }
        body="Scout searches gigs, briefs, castings, commissions and opportunities across the web, then surfaces the ones that fit your Passport. Kreto can help you prepare the next move. You stay in control."
        caption="Scout"
        image={scoutImg}
        accent="#FF2DA1"
        href="/auth?next=/scout"
        ctaLabel="Explore Opportunities"
        reverse
        tutorialSteps={SCOUT_TUTORIAL}
        tutorialVisual={ScoutVisual}
      />

      {/* Match */}
      <ChapterSection
        id="chapter-match"
        index={chapterRoman("chapter-match")}
        kicker="Match"
        title={
          <>
            The right person<br />
            <span className="italic" style={{ color: "rgba(255,255,255,0.6)" }}>
              for the work
            </span>
          </>
        }
        body="Discover creatives through what they actually do, where they are, the projects they've worked on and the people who can confirm it. Less cold searching. More creative context."
        caption="Match"
        image={matchImg}
        accent="#FF2DA1"
        href="/auth?next=/match"
        ctaLabel="Find Collaborators"
        tutorialSteps={MATCH_TUTORIAL}
        tutorialVisual={MatchVisual}
      />

      {/* Studio */}
      <ChapterSection
        id="chapter-studio"
        index={chapterRoman("chapter-studio")}
        kicker="Studio"
        title={
          <>
            From idea to invoice<br />
            <span className="italic" style={{ color: "rgba(255,255,255,0.6)" }}>
              in one room
            </span>
          </>
        }
        body="Bring the brief, collaborators, tasks, files, milestones, communication and payments together around the work."
        caption="Studio"
        image={studioImg}
        accent="#FF2DA1"
        href="/auth?next=/desk"
        ctaLabel="Create a Project"
        closingLine="When the project is finished, the outcome strengthens the Creative Passports of the people who made it happen."
        reverse
        tutorialSteps={STUDIO_TUTORIAL}
        tutorialVisual={StudioVisual}
      />

      {/* SoundStages */}
      <ChapterSection
        id="chapter-soundstages"
        index={chapterRoman("chapter-soundstages")}
        kicker="SoundStages"
        title={
          <>
            Live rooms.<br />
            <span className="italic" style={{ color: "rgba(255,255,255,0.6)" }}>
              Real conversations
            </span>
          </>
        }
        body="Open mics, speed sessions, listening parties. Drop into a SoundStage to be seen — by an audience that came for exactly what you do."
        caption="SoundStages"
        image={soundstagesImg}
        accent="#FF2DA1"
        href="/auth?next=/circle?tab=live"
        tutorialSteps={SOUNDSTAGES_TUTORIAL}
        tutorialVisual={SoundStagesVisual}
      />

      {/* Kreto — the sunset moment */}
      <MeetKretoSection />

      {/* Footer */}
      <EditorialFooter />
    </>
  );
};

export default LandingBelowFold;
