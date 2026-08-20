import { ShieldCheck, Compass, Wallet, Users2, Zap } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { KretoAvatar } from "@/components/brand/KretoAvatar";

const FEATURES = [
  { icon: ShieldCheck, label: "Creative Passport", desc: "The verified record — every Stamp co-signed by people who were there." },
  { icon: Compass,    label: "Scout",              desc: "Kreto surfaces real gigs across the web — drafts your pitch in your voice." },
  { icon: Users2,     label: "Match",              desc: "Find collaborators who actually fit the brief, not random profiles." },
  { icon: Wallet,     label: "KrePay",             desc: "Contracts, invoices, escrow — paid like the pros without leaving the room." },
];

export const AuthBrandingPanel = () => (
  <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[hsl(var(--k-midnight))]">
    {/* Sunset wash behind */}
    <div
      className="pointer-events-none absolute -top-32 -left-32 h-[560px] w-[560px] rounded-full opacity-50 blur-[140px]"
      style={{ background: "var(--kretopia-sunset, hsl(327 100% 59%))" }}
    />
    <div className="pointer-events-none absolute -bottom-40 -right-20 h-[420px] w-[420px] rounded-full opacity-30 blur-[120px]"
         style={{ background: "hsl(327 100% 59%)" }} />
    <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />

    <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full">
      <div className="mb-9">
        <BrandLogo size="lg" showBeta />
      </div>

    <p
      className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border w-fit"
      style={{ borderColor: "rgba(255,45,161,0.3)", backgroundColor: "rgba(255,45,161,0.06)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full ai-ambient-breathe" style={{ backgroundColor: "#FF2DA1" }} />
      <span className="landing-eyebrow" style={{ color: "#FF2DA1" }}>The Creative Economy OS</span>
    </p>

    <h2 className="landing-h2 landing-glow mb-5">
      Where creativity<br />
      <span className="landing-accent">lives.</span>
    </h2>
      <p className="text-white/65 mb-8 max-w-md leading-relaxed">
        One Passport. Every credit. Every opportunity. Kretopia is the professional
        home for creators — and Kreto, your AI Executive Producer, runs point.
      </p>

      {/* Kreto whisper card — the avatar's own halo already breathes, so the
          card wrapper doesn't need a second, uncoordinated pulse. */}
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-3.5 max-w-md">
        <KretoAvatar size="sm" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF2DA1] mb-0.5">Kreto</p>
          <p className="text-sm text-white/90 leading-snug">
            "I'll line up your first three opportunities the moment you sign in."
          </p>
        </div>
      </div>

      <div className="space-y-2.5 max-w-md">
        {FEATURES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 transition-all hover:border-white/15 hover:bg-white/[0.04]"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white mt-0.5"
                   style={{ background: "var(--kretopia-sunset, hsl(327 100% 59%))" }}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-sm text-white">{item.label}</div>
                <div className="text-xs text-white/60">{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-7">
        <p className="flex items-center gap-1.5 text-xs text-white/55">
          <Zap className="h-3 w-3 text-[#FF2DA1]" />
          60-second setup · No credit card · Free forever to start
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-white/35">
          Kretopia · by Thrive Collective
        </p>
      </div>
    </div>
  </div>
);
