/**
 * Spotlight — same cinematic language as the landing / About pages:
 * #05070D plate, magenta aurora, grain, serif chapter titles, scroll reveals.
 * Chapters: the desk (magazine + podcast), why it matters, invitation.
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Mic, BookOpen, Quote, Radio } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { MagazineWall } from "@/components/scene/MagazineWall";
import { PodcastPlayer } from "@/components/scene/PodcastPlayer";
import { APP_URL } from "@/lib/constants";
import { EditorialPageHero } from "@/components/kretopia/EditorialPageHero";
import { EditorialChapter } from "@/components/kretopia/EditorialChapter";
import { Reveal } from "@/components/kretopia/Reveal";
import { SpotlightBoard, type SpotlightTab } from "@/components/kretopia/SpotlightBoard";

const ACCENT = "#FF2DA1";

const NOTES = [
  { icon: BookOpen, title: "The Magazine", body: "Long-form features and interviews with the people behind the work." },
  { icon: Mic, title: "The Podcast", body: "Conversations in their own words — process, setbacks, the real numbers." },
  { icon: Quote, title: "Straight from the source", body: "No press releases. Creatives telling their own story, unfiltered." },
  { icon: Radio, title: "Always on", body: "New stories and episodes drop as the community makes them." },
];

const Spotlight = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<SpotlightTab>(tabParam === "podcast" ? "podcast" : "magazine");
  const canonicalUrl = `${APP_URL}/spotlight`;

  return (
    <PageTransition>
      <Helmet>
        <title>Spotlight — Stories, Features & Sounds | Kretopia</title>
        <meta name="description" content="Creative stories, interviews, features and podcast episodes to inspire and motivate. Explore the Kretopia Spotlight." />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Spotlight — Stories, Features & Sounds | Kretopia" />
        <meta property="og:description" content="Creative stories, interviews, features and podcast episodes to inspire and motivate." />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Kretopia" />
        <meta property="og:image" content="https://www.kretopia.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Spotlight — Stories, Features & Sounds | Kretopia" />
        <meta name="twitter:description" content="Creative stories, interviews, features and podcast episodes to inspire and motivate." />
        <meta name="twitter:image" content="https://www.kretopia.com/og-image.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Kretopia Spotlight",
            "description": "Creative stories, interviews, features and podcast episodes to inspire and motivate.",
            "url": canonicalUrl,
            "publisher": {
              "@type": "Organization",
              "name": "Kretopia",
              "url": APP_URL,
            },
          })}
        </script>
      </Helmet>

      <div className="dark min-h-screen" style={{ backgroundColor: "#05070D" }}>
        <EditorialPageHero
          kicker="The Spotlight"
          oneLine
          title="Spotlight."
          accentTitle="Stories worth playing."
          subtitle="Interviews, features and podcast episodes from across the creative universe — the people behind the work, in their own words."
        />

        {/* I — The desk */}
        <EditorialChapter index="I" kicker="The desk" title="Read it, or" accentWord="hear it.">
          <Reveal>
            <SpotlightBoard
              value={activeTab}
              onValueChange={setActiveTab}
              magazine={<MagazineWall />}
              podcast={<PodcastPlayer />}
            />
          </Reveal>
        </EditorialChapter>

        {/* II — Why it matters */}
        <EditorialChapter index="II" kicker="Why it matters" title="Proof is the record." accentWord="Story is the reason.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {NOTES.map((n, i) => (
              <Reveal key={n.title} delayIndex={i}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-[rgba(255,45,161,0.35)]">
                  <span
                    className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "rgba(255,45,161,0.1)" }}
                  >
                    <n.icon className="h-4 w-4" style={{ color: ACCENT }} />
                  </span>
                  <p className="text-white font-semibold text-sm mb-1.5">{n.title}</p>
                  <p className="text-sm leading-relaxed text-white/55">{n.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delayIndex={2}>
            <p className="mt-10 max-w-2xl font-serif italic text-lg leading-relaxed text-white/80">
              "Credits show what you did. Spotlight shows how you did it — and why the next person should call you."
            </p>
          </Reveal>
        </EditorialChapter>

        {/* III — Invitation */}
        <section className="relative overflow-hidden" style={{ backgroundColor: "#05070D" }}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 ai-ambient-breathe"
            style={{ background: "radial-gradient(60% 60% at 50% 100%, rgba(255,45,161,0.16), transparent 65%)" }}
          />
          <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8 py-24 text-center">
            <Reveal>
              <h2 className="landing-h1 landing-glow mx-auto max-w-3xl">
                Your story is next.<br />
                <span className="landing-accent">Put it on the record.</span>
              </h2>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link to="/credits" className="cta-primary inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold">
                  Search the Creative Record
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link to="/auth" className="group inline-flex items-center gap-2 text-sm text-white/85">
                  <span className="border-b border-white/30 pb-0.5 transition-colors group-hover:border-white">Join Kretopia</span>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: ACCENT }} />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </div>
    </PageTransition>
  );
};

export default Spotlight;
