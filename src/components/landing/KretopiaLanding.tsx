/**
 * KretopiaLanding — the cinematic editorial spine.
 *
 * Each section is a chapter. No SaaS bloat — no comparison tables,
 * no pricing grids, no feature checklists. The user feels they've
 * walked into a film, not a product page.
 *
 *   I.    Hero            — "Welcome to Kretopia. Where creativity lives."
 *   II.   Manifesto       — "Talent is everywhere. Opportunity is not."
 *   III.  Passport        — teal accent
 *   IV.   Scout           — amber accent
 *   V.    Match           — magenta accent
 *   VI.   Studio          — warm tungsten accent
 *   VII.  SoundStages     — teal-spotlight accent
 *   VIII. Kreto           — sunset (the only full-gradient moment)
 *   IX.   Closing         — echo of the hero opener + single CTA
 *
 * All routes, auth and search wiring untouched.
 */
import { KretopiaHero } from "@/components/landing/KretopiaHero";
import { ManifestoSection } from "@/components/landing/kretopia/ManifestoSection";
import { ChapterSection } from "@/components/landing/kretopia/ChapterSection";
import { MeetKretoSection } from "@/components/landing/kretopia/MeetKretoSection";
import { ClosingSection } from "@/components/landing/kretopia/ClosingSection";
import { EditorialFooter } from "@/components/landing/kretopia/EditorialFooter";

import passportImg    from "@/assets/kretopia/chapter-passport.jpg";
import scoutImg       from "@/assets/kretopia/chapter-scout.jpg";
import matchImg       from "@/assets/kretopia/chapter-match.jpg";
import studioImg      from "@/assets/kretopia/chapter-studio.jpg";
import soundstagesImg from "@/assets/kretopia/chapter-soundstages.jpg";

interface KretopiaLandingProps {
  onSearchSubmit: (query: string) => void;
}

export const KretopiaLanding = ({ onSearchSubmit }: KretopiaLandingProps) => {
  return (
    <div className="relative" style={{ backgroundColor: "#05070D" }}>
      {/* I. Hero (already cinematic — left intact) */}
      <KretopiaHero onSearchSubmit={onSearchSubmit} />

      {/* II. Manifesto */}
      <ManifestoSection />

      {/* III. Passport — teal */}
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
        accent="#17D9D4"
        href="/auth?next=/profile"
      />

      {/* IV. Scout — amber */}
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
        accent="#FFC72C"
        href="/auth?next=/scout"
        reverse
      />

      {/* V. Match — magenta */}
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
        accent="#FF0A78"
        href="/auth?next=/match"
      />

      {/* VI. Studio — tungsten warmth */}
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
        accent="#FF8C42"
        href="/auth?next=/desk"
        reverse
      />

      {/* VII. SoundStages — teal spotlight */}
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
        accent="#17D9D4"
        href="/auth?next=/circle?tab=live"
      />

      {/* VIII. Kreto — the sunset moment */}
      <MeetKretoSection />

      {/* IX. Closing */}
      <ClosingSection />

      {/* Footer */}
      <EditorialFooter />
    </div>
  );
};

export default KretopiaLanding;
