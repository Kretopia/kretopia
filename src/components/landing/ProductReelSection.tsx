import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, FolderKanban, MessageSquare, DollarSign, ArrowRight, type LucideIcon } from "lucide-react";
import shotMatch from "@/assets/mockup-circle-swipe.png";
import shotDesk from "@/assets/mockup-projects.png";
import shotCopilot from "@/assets/mockup-messages.png";
import shotPay from "@/assets/mockup-wallet.png";

interface Tile {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  chip: string;
  href: string;
  accent: string;
  image: string;
}

const TILES: Tile[] = [
  {
    icon: Users,
    eyebrow: "Smart Match",
    title: "Find collaborators in your city — in 30 seconds.",
    body: "Swipe through real creators ranked by skills, location, and the work you've done together.",
    chip: "Free",
    href: "/auth?tab=signup&intent=match",
    accent: "from-primary/30 via-primary/10 to-transparent",
    image: shotMatch,
  },
  {
    icon: FolderKanban,
    eyebrow: "Studios",
    title: "Brief → tasks → invoice. One workspace per project.",
    body: "Every shoot, drop, or campaign in its own studio room. Files, chat, and money in one place.",
    chip: "Free",
    href: "/auth?tab=signup&intent=desk",
    accent: "from-accent/30 via-accent/10 to-transparent",
    image: shotDesk,
  },
  {
    icon: MessageSquare,
    eyebrow: "Thrive Copilot",
    title: "Drafts intros, quotes, and gig replies — while you sleep.",
    body: "Tell Thrive what you want to make. It plans the project, finds the people, and writes the first draft.",
    chip: "Pro",
    href: "/auth?tab=signup&intent=copilot",
    accent: "from-energy/30 via-energy/10 to-transparent",
    image: shotCopilot,
  },
  {
    icon: DollarSign,
    eyebrow: "ThrivePay",
    title: "Quotes, invoices, milestone payments — get paid in your currency.",
    body: "Send a quote in two taps. Track expenses with a photo. Get paid in USD, TTD, or your local currency.",
    chip: "Free + Pro",
    href: "/auth?tab=signup&intent=pay",
    accent: "from-success/30 via-success/10 to-transparent",
    image: shotPay,
  },
];

/**
 * THE PRODUCT REEL — replaces WhyCreatorsChooseSection + CreatorDashboardSection.
 * Four stacked tiles, one per pillar, alternating layout on desktop.
 * Each tile: eyebrow + headline + body + chip + CTA + visual placeholder.
 */
export const ProductReelSection = () => {
  return (
    <section className="px-4 sm:px-6 py-16 sm:py-24">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[-0.03em] leading-[1.05] text-foreground mb-3">
            Everything you need to{" "}
            <span className="text-primary">run the work.</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Four pillars. One login. Built so you can stop juggling and start booking.
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {TILES.map((tile, i) => {
            const Icon = tile.icon;
            const reverse = i % 2 === 1;
            return (
              <motion.article
                key={tile.eyebrow}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden rounded-3xl border border-border/60 bg-card"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${tile.accent} pointer-events-none`}
                />
                <div
                  className={`relative grid sm:grid-cols-[1.1fr_1fr] gap-6 sm:gap-8 p-6 sm:p-8 lg:p-10 ${
                    reverse ? "sm:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  {/* Copy */}
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-9 w-9 rounded-xl bg-card border border-border flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                        {tile.eyebrow}
                      </p>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">
                        {tile.chip}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-[-0.02em] leading-[1.15] text-foreground mb-3">
                      {tile.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {tile.body}
                    </p>
                    <Link
                      to={tile.href}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-energy transition-colors w-fit"
                    >
                      Try {tile.eyebrow} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {/* Real product screenshot — frameless, lets the device mockup breathe */}
                  <div className="relative flex items-end sm:items-center justify-center min-h-[280px] sm:min-h-[340px]">
                    <img
                      src={tile.image}
                      alt={`${tile.eyebrow} product screenshot`}
                      loading="lazy"
                      className="max-h-[340px] sm:max-h-[400px] w-auto object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
