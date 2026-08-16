import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { PageTransition } from "@/components/PageTransition";
import { MagazineWall } from "@/components/scene/MagazineWall";
import { PodcastPlayer } from "@/components/scene/PodcastPlayer";
import { useLocation } from "react-router-dom";
import { APP_URL } from "@/lib/constants";
import { EditorialPageHero } from "@/components/kretopia/EditorialPageHero";
import { SpotlightBoard, type SpotlightTab } from "@/components/kretopia/SpotlightBoard";

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
                "url": APP_URL
            }
          })}
        </script>
      </Helmet>

      <div className="dark min-h-screen relative overflow-hidden" style={{ backgroundColor: "#05070D" }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(60% 40% at 50% 0%, rgba(255,45,161,0.10), transparent 60%)",
          }}
        />

        <EditorialPageHero
          kicker="The Spotlight"
          oneLine
          title="Spotlight."
          accentTitle="Stories worth playing."
          subtitle="Interviews, features and podcast episodes from across the creative universe — the people behind the work, in their own words."
        />

        <div className="relative max-w-2xl mx-auto px-4 pt-10 sm:pt-14 pb-24">
          <SpotlightBoard
            value={activeTab}
            onValueChange={setActiveTab}
            magazine={<MagazineWall />}
            podcast={<PodcastPlayer />}
          />
        </div>
      </div>
    </PageTransition>
  );
};

export default Spotlight;
