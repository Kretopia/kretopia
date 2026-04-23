import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { PageTransition } from "@/components/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Headphones, Sparkles } from "lucide-react";
import { MagazineWall } from "@/components/scene/MagazineWall";
import { PodcastPlayer } from "@/components/scene/PodcastPlayer";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { APP_URL } from "@/lib/constants";

const Spotlight = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "magazine");
  const canonicalUrl = `${APP_URL}/spotlight`;

  return (
    <PageTransition>
      <Helmet>
        <title>Spotlight — Stories, Features & Sounds | ThriveIN</title>
        <meta name="description" content="Creative stories, interviews, features and podcast episodes to inspire and motivate. Explore the ThriveIN Spotlight." />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Spotlight — Stories, Features & Sounds | ThriveIN" />
        <meta property="og:description" content="Creative stories, interviews, features and podcast episodes to inspire and motivate." />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="ThriveIN" />
        <meta property="og:image" content="https://www.thrivein.io/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Spotlight — Stories, Features & Sounds | ThriveIN" />
        <meta name="twitter:description" content="Creative stories, interviews, features and podcast episodes to inspire and motivate." />
        <meta name="twitter:image" content="https://www.thrivein.io/og-image.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "ThriveIN Spotlight",
            "description": "Creative stories, interviews, features and podcast episodes to inspire and motivate.",
            "url": canonicalUrl,
            "publisher": {
              "@type": "Organization",
              "name": "ThriveIN",
                "url": APP_URL
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
          <PageHeader
            eyebrow="The Spotlight"
            title="Stories worth pressing play on"
            subtitle="Articles and podcast episodes from the Thriver universe."
            icon={Sparkles}
            size="sm"
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4 grid grid-cols-2 h-10 rounded-xl bg-muted/60 p-1">
              <TabsTrigger value="magazine" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <BookOpen className="h-3.5 w-3.5" />
                Magazine
              </TabsTrigger>
              <TabsTrigger value="podcast" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Headphones className="h-3.5 w-3.5" />
                Podcast
              </TabsTrigger>
            </TabsList>

            <TabsContent value="magazine" className="mt-0">
              <MagazineWall />
            </TabsContent>

            <TabsContent value="podcast" className="mt-0">
              <PodcastPlayer />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
};

export default Spotlight;
