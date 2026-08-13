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
import { MeetKretoSection } from "@/components/landing/kretopia/MeetKretoSection";
import { ClosingSection } from "@/components/landing/kretopia/ClosingSection";
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
            Every credit. <br />
            <span className="italic" style={{ color: "rgba(255,255,255,0.6)" }}>
              Co-signed by the
            </span>{" "}
            <br className="hidden sm:block" />
            people who were there
          </>
        }
        body="Your Creative Passport collects every project, every credit, every co-sign — verified by the collaborators who lived it with you. One link. Your whole career."
        caption="Passport"
        image={passportImg}
        accent="#FF2DA1"
        href="/auth?next=/profile"
        tutorialSteps={PASSPORT_TUTORIAL}
        tutorialVisual={PassportVisual}
      />

      {/* Verified Credits — the canonical tutorial reference */}
      <VerifiedCreditsChapterSection />

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
        body="Scout reads the web — gigs, briefs, calls, casting notices — and surfaces the ones that fit you. Kreto drafts the pitch. You decide if it goes."
        caption="Scout"
        image={scoutImg}
        accent="#FF2DA1"
        href="/auth?next=/scout"
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
        body="Match connects creators by skill, city, vibe, and the people you've already made things with. No cold DMs. Just collaborators who get it."
        caption="Match"
        image={matchImg}
        accent="#FF2DA1"
        href="/auth?next=/match"
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
        body="Every shoot, drop, release, or campaign in its own Studio. Brief, files, chat, video, deliverables, payments — held together by Kreto's quiet hand."
        caption="Studio"
        image={studioImg}
        accent="#FF2DA1"
        href="/auth?next=/desk"
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

      {/* Closing */}
      <ClosingSection />

      {/* Footer */}
      <EditorialFooter />
    </>
  );
};

export default LandingBelowFold;
