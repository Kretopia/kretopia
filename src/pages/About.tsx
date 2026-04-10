import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Users, Globe, Music, Camera, Clapperboard, Palette, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const milestones = [
  { year: "2013", title: "Thrive Collective Founded", desc: "Launched in Dubai as a creative community, connecting designers, DJs, photographers, filmmakers, and more across the UAE." },
  { year: "2014", title: "First Major Win", desc: "Helped artist Kalpee secure a signed distribution deal with Sony Middle East through the Thrive network." },
  { year: "2015–18", title: "Global Expansion", desc: "Produced events and showcases across Dubai, Los Angeles, Geneva, Trinidad & Tobago, and Bali — featuring 500+ creative talents." },
  { year: "2019", title: "ThriveIN Bali", desc: "Landmark event uniting fashion designers, models, influencers, photographers, filmmakers, DJs, digital nomads, and entrepreneurs in Bali." },
  { year: "2020", title: "The Pivot", desc: "During global lockdowns, the vision crystallized: build the platform that connects all the dots — profiles, credits, collaboration, and payments." },
  { year: "2024–Now", title: "ThriveIN Platform", desc: "13 years of community building distilled into one platform — the Creative OS for every discipline, everywhere." },
];

const cities = [
  { name: "Dubai", flag: "🇦🇪" },
  { name: "Los Angeles", flag: "🇺🇸" },
  { name: "Geneva", flag: "🇨🇭" },
  { name: "Trinidad", flag: "🇹🇹" },
  { name: "Bali", flag: "🇮🇩" },
  { name: "London", flag: "🇬🇧" },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="About ThriveIN — 13 Years of Building Creative Community"
        description="From a creative collective founded in Dubai in 2013 to a global platform — ThriveIN's story of connecting 500+ creatives across Dubai, LA, Geneva, Trinidad, and Bali."
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_10%,hsl(var(--primary)/0.1),transparent_60%)]" />
        <div className="container relative mx-auto max-w-4xl px-4 py-16 sm:py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">Our Story</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
            13 Years of Building{" "}
            <span className="text-primary">Creative Community</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            ThriveIN didn't start as an app. It started as a movement — connecting creatives face-to-face
            across continents, one event at a time. Now we're bringing it all into one platform.
          </p>
        </div>
      </section>

      {/* Global Footprint */}
      <section className="container mx-auto max-w-4xl px-4 pb-12">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {cities.map((city) => (
            <div key={city.name} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
              <span className="text-lg">{city.flag}</span>
              <span className="text-sm font-medium text-foreground">{city.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Origin Story */}
      <section className="container mx-auto max-w-4xl px-4 pb-16">
        <Card className="border-primary/20">
          <CardContent className="p-6 sm:p-10">
            <div className="flex items-start gap-4 mb-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Where It All Started</h2>
                <p className="text-sm text-muted-foreground">Dubai, 2013</p>
              </div>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                Thrive Collective was born in Dubai as a creative community that gave designers, DJs, photographers,
                filmmakers, models, and entrepreneurs a space to connect, showcase, and collaborate.
                Through the <strong className="text-foreground">"Discover a Thriver"</strong> series and networking events,
                over <strong className="text-foreground">500 creative individuals</strong> were featured and connected with opportunities.
              </p>
              <p>
                From securing a <strong className="text-foreground">Sony Middle East distribution deal</strong> for
                Trinidad-born artist Kalpee, to producing events that brought together creatives from five
                continents — the mission was always the same: <em>make it easier for talented people to find each other and thrive.</em>
              </p>
              <p>
                After 13 years of hosting events across Dubai, Los Angeles, Geneva, Trinidad & Tobago, and Bali,
                the next step became clear: build the platform that connects all the dots —
                verified credits, discovery, collaboration, and payments — in one place.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Timeline */}
      <section className="container mx-auto max-w-4xl px-4 pb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-10">The Journey</h2>
        <div className="relative">
          <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-border sm:-translate-x-px" />
          <div className="space-y-8">
            {milestones.map((m, i) => (
              <div key={m.year} className={`relative flex items-start gap-4 sm:gap-8 ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"}`}>
                <div className={`hidden sm:block flex-1 ${i % 2 === 0 ? "text-right" : "text-left"}`}>
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">{m.year}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{m.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
                </div>
                <div className="relative z-10 shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 sm:hidden">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">{m.year}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{m.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
                </div>
                <div className="hidden sm:block flex-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="border-y border-border bg-card/50">
        <div className="container mx-auto max-w-4xl px-4 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "13+", label: "Years", icon: Calendar },
              { value: "500+", label: "Creatives Featured", icon: Users },
              { value: "6", label: "Countries", icon: MapPin },
              { value: "∞", label: "Connections Made", icon: Globe },
            ].map((s) => (
              <div key={s.label}>
                <s.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission / CTA */}
      <section className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-4">
          From Community to <span className="text-primary">Platform</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
          Everything we learned producing events, connecting creatives, and building networks across six countries
          is now built into ThriveIN. Your credits. Your connections. Your career — all in one place.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg"
        >
          Join the Movement <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
};

export default About;
