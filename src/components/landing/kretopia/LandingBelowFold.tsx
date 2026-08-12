/**
 * LandingBelowFold — everything on the landing page after the hero.
 *
 * Split into its own chunk and mounted only once the visitor approaches it
 * (or the browser goes idle), so the hero + search bar stay on the critical
 * path and become interactive as early as possible.
 */
import { ManifestoSection } from "@/components/landing/kretopia/ManifestoSection";
import { ChapterSection } from "@/components/landing/kretopia/ChapterSection";
import { AuditionRoadmapSection } from "@/components/landing/kretopia/AuditionRoadmapSection";
import { MeetKretoSection } from "@/components/landing/kretopia/MeetKretoSection";
import { ClosingSection } from "@/components/landing/kretopia/ClosingSection";
import { EditorialFooter } from "@/components/landing/kretopia/EditorialFooter";

import passportImg    from "@/assets/kretopia/chapter-passport.jpg";
import scoutImg       from "@/assets/kretopia/chapter-scout.jpg";
import matchImg       from "@/assets/kretopia/chapter-match.jpg";
import studioImg      from "@/assets/kretopia/chapter-studio.jpg";
import soundstagesImg from "@/assets/kretopia/chapter-soundstages.jpg";

export const LandingBelowFold = () => {
  return (
    <>
      {/* II. Manifesto */}
      <ManifestoSection />

      {/* III. Passport */}
      <ChapterSection
        index="III"
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
        caption="Passport · Chapter Three"
        image={passportImg}
        accent="#FF2DA1"
        href="/auth?next=/profile"
      />

      {/* IV. Scout */}
      <ChapterSection
        index="IV"
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
        caption="Scout · Chapter Four"
        image={scoutImg}
        accent="#FF2DA1"
        href="/auth?next=/scout"
        reverse
      />

      {/* V. Match */}
      <ChapterSection
        index="V"
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
        caption="Match · Chapter Five"
        image={matchImg}
        accent="#FF2DA1"
        href="/auth?next=/match"
      />

      {/* VI. Studio */}
      <ChapterSection
        index="VI"
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
        caption="Studio · Chapter Six"
        image={studioImg}
        accent="#FF2DA1"
        href="/auth?next=/desk"
        reverse
      />

      {/* VII. SoundStages */}
      <ChapterSection
        index="VII"
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
        caption="SoundStages · Chapter Seven"
        image={soundstagesImg}
        accent="#FF2DA1"
        href="/auth?next=/circle?tab=live"
      />

      {/* Auditions — how an open call actually runs */}
      <AuditionRoadmapSection />

      {/* VIII. Kreto — the sunset moment */}
      <MeetKretoSection />

      {/* IX. Closing */}
      <ClosingSection />

      {/* Footer */}
    </>
  );
};

export default LandingBelowFold;
