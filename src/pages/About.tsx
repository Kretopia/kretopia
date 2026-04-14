import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, Calendar, Users, Globe, ArrowRight, Quote, 
  Rocket, Music, Film, Palette, Camera, Mic, Sparkles,
  Building2, Plane, Heart, Wifi, RefreshCw, Zap
} from "lucide-react";
import { Link } from "react-router-dom";

const timeline = [
  { year: "2013", location: "Dubai", icon: Building2, title: "The Beginning", desc: "ThriveIN begins as Industry Night, a weekly after-work gathering for creatives at Holiday Inn Internet City. A space designed for connection, collaboration, and community." },
  { year: "2014", location: "Los Angeles", icon: Plane, title: "International Expansion", desc: "The community expands into Los Angeles, connecting creatives internationally and building bridges between industries and markets." },
  { year: "2015", location: "Trinidad & Tobago", icon: Music, title: "Caribbean Launch", desc: "ThriveIN launches in Trinidad, creating a platform for Caribbean creatives to connect, showcase their work, and access new opportunities." },
  { year: "2016", location: "Global", icon: Globe, title: "Global Impact", desc: "Real opportunities begin to emerge — including facilitating a global distribution pathway for Caribbean artist Kalpee with Sony Music." },
  { year: "2017", location: "Geneva", icon: MapPin, title: "European Expansion", desc: "ThriveIN expands into Europe, continuing its mission of connecting creatives across borders and cultures." },
  { year: "2018", location: "Worldwide", icon: Users, title: "Community Growth", desc: "The network grows across regions, hosting showcases, fashion shows, live art, music performances, and creative networking experiences." },
  { year: "2019", location: "Bali", icon: Sparkles, title: "ThriveXchange", desc: "ThriveIN launches in Bali and introduces ThriveXchange, a 12-day creative experience bringing together global creatives for collaboration and cultural exchange." },
  { year: "2020", location: "Digital", icon: Wifi, title: "First Digital Step", desc: "ThriveIN begins its transition into the digital space with the first version of the platform, extending the community beyond physical events." },
  { year: "2022", location: "Platform", icon: RefreshCw, title: "Rebuild & Evolution", desc: "The platform is reimagined and rebuilt, supported by early-stage funding and experimentation, setting the foundation for a more powerful ecosystem." },
  { year: "2026", location: "ThriveIN.io", icon: Zap, title: "The Platform Era", desc: "ThriveIN evolves into a global creative platform — bringing together community, collaboration, verified credits, and real opportunities in one place." },
];

const communityMembers = [
  { icon: Palette, label: "Artists, designers, filmmakers, and musicians" },
  { icon: Camera, label: "Content creators and creative entrepreneurs" },
  { icon: Film, label: "Producers, stylists, and industry professionals" },
  { icon: Mic, label: "Cultural leaders, brands, and institutions" },
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
        title="About ThriveIN — A Global Creative Community Since 2013"
        description="From a weekly gathering in Dubai to a global creative platform — ThriveIN connects creatives across music, film, fashion, art, content, and culture worldwide."
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_10%,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,hsl(var(--accent)/0.06),transparent_50%)]" />
        <div className="container relative mx-auto max-w-4xl px-4 py-16 sm:py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary mb-5">About ThriveIN</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.15]">
            A Global Community{" "}
            <span className="text-primary">Built for Creatives</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            What started in 2013 as a weekly after-work gathering in Dubai has grown into an international network
            connecting creatives across music, film, fashion, art, content, and culture.
          </p>
        </div>
      </section>

      {/* Global Footprint */}
      <section className="container mx-auto max-w-4xl px-4 pb-12">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {cities.map((city) => (
            <div key={city.name} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 transition-colors hover:border-primary/30">
              <span className="text-lg">{city.flag}</span>
              <span className="text-sm font-medium text-foreground">{city.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="container mx-auto max-w-4xl px-4 pb-16">
        <Card className="border-primary/15 overflow-hidden">
          <CardContent className="p-6 sm:p-10">
            <div className="flex items-start gap-4 mb-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Our Story</h2>
                <p className="text-sm text-muted-foreground">From intimate meetups to a global ecosystem</p>
              </div>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                From intimate meetups to large-scale showcases, ThriveIN has brought together thousands of creatives
                across <strong className="text-foreground">Los Angeles, Geneva, Trinidad, and Bali</strong> — creating
                spaces where real relationships, collaborations, and opportunities are formed.
              </p>
              <p className="text-foreground font-medium border-l-2 border-primary pl-4 my-6">
                At its core, ThriveIN has always been about one thing: bringing the right people into the same room
                and creating the environment for them to connect, create, and grow.
              </p>
              <p>
                Over the years, the community has expanded beyond events into a wider ecosystem including talks, media,
                creative exchanges, and industry collaborations. Through this network, creatives have found collaborators,
                launched projects, secured opportunities, and built lasting careers.
              </p>
              <p>
                Today, ThriveIN continues to evolve — bringing the same community-driven energy into a new era where
                creatives can not only connect, but also <strong className="text-foreground">build, showcase, and grow</strong> their
                work in a more structured and visible way.
              </p>
              <p className="text-foreground font-semibold text-base sm:text-lg pt-2">
                This is not just a platform. It's a community built on shared ambition, creativity, and collaboration.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Community Section */}
      <section className="border-y border-border bg-card/40">
        <div className="container mx-auto max-w-4xl px-4 py-14">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Our Community</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Home to a Global Network of Creatives
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              From emerging talent to established professionals — individuals actively shaping culture across industries and regions.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {communityMembers.map((member) => {
              const Icon = member.icon;
              return (
                <div key={member.label} className="flex items-center gap-3 rounded-xl bg-background border border-border p-4 transition-all hover:border-primary/25">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{member.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="container mx-auto max-w-4xl px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-primary/15">
            <CardContent className="p-6 sm:p-8">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">Mission</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To build a global creative community where people can connect with purpose, collaborate with intention,
                and access real opportunities to grow.
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/15">
            <CardContent className="p-6 sm:p-8">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">Vision</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A world where every creative is visible, connected, and supported — where talent is not limited by
                geography, access, or lack of opportunity, and where community becomes the foundation for sustainable creative careers.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Founder's Note */}
      <section className="container mx-auto max-w-4xl px-4 pb-16">
        <Card className="border-primary/10 bg-gradient-to-br from-primary/[0.03] via-background to-accent/[0.03]">
          <CardContent className="p-6 sm:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Quote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Founder's Note</p>
              </div>
            </div>
            <blockquote className="text-base sm:text-lg text-foreground leading-relaxed italic mb-6">
              "ThriveIN started as a simple idea — bringing creatives into the same space and seeing what could happen.
              Over time, it became clear that the real value wasn't just the events, it was the relationships, the collaborations,
              and the opportunities that came from them. Everything we're building today is about scaling that experience
              and making it accessible to creatives everywhere."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <p className="text-sm font-semibold text-foreground whitespace-nowrap">— Ethan Auguste</p>
              <div className="h-px flex-1 bg-border" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Timeline */}
      <section className="border-t border-border bg-card/30">
        <div className="container mx-auto max-w-3xl px-4 py-16">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Our Journey</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              From a Room in Dubai to a Global Creative Community
            </h2>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] sm:left-[23px] top-0 bottom-0 w-px bg-border" />

            <div className="space-y-8">
              {timeline.map((item, i) => {
                const Icon = item.icon;
                const isLast = i === timeline.length - 1;
                return (
                  <div key={item.year} className="relative flex items-start gap-4 sm:gap-6">
                    {/* Dot / Icon */}
                    <div className={`relative z-10 shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center border-2 ${
                      isLast 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : 'bg-card border-primary/30 text-primary'
                    }`}>
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <div className="flex items-baseline gap-2 flex-wrap mb-1">
                        <span className="text-lg sm:text-xl font-extrabold text-foreground">{item.year}</span>
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{item.location}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="border-y border-border bg-card/50">
        <div className="container mx-auto max-w-4xl px-4 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "13+", label: "Years", icon: Calendar },
              { value: "1000+", label: "Creatives Connected", icon: Users },
              { value: "6+", label: "Countries", icon: MapPin },
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

      {/* CTA */}
      <section className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-4">
          Ready to Join the <span className="text-primary">Community</span>?
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
          Whether you're an emerging creative or an industry veteran — there's a place for you here.
          Your credits. Your connections. Your career — all in one place.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg"
        >
          Join ThriveIN <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
};

export default About;
