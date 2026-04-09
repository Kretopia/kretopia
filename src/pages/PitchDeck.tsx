import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const TOTAL_SLIDES = 12;

// Slide components
const Slide1 = () => (
  <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-[#0d0d1a] via-[#1a1030] to-[#0d0d1a] text-white px-20">
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full bg-indigo-700/10 blur-[120px]" />
      <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-fuchsia-500/8 blur-[100px]" />
    </div>
    <div className="relative z-10 text-center space-y-12">
      <div className="space-y-4">
        <h1 className="text-[120px] font-black tracking-tight leading-none bg-gradient-to-r from-primary via-fuchsia-400 to-purple-300 bg-clip-text text-transparent">
          ThriveIN
        </h1>
        <div className="w-32 h-1 bg-gradient-to-r from-primary to-fuchsia-500 mx-auto rounded-full" />
      </div>
      <p className="text-[42px] font-light text-white/90 max-w-[1200px] leading-tight">
        The Operating System for the Creative Economy
      </p>
      <div className="flex items-center gap-6 justify-center mt-8">
        <span className="px-8 py-3 rounded-full border border-primary/40 text-[24px] text-purple-300 font-medium">
          Pre-Seed · Raising $500K
        </span>
      </div>
      <div className="mt-16 space-y-2">
        <p className="text-[28px] font-semibold text-white/80">Ethan Auguste</p>
        <p className="text-[22px] text-purple-300/80">Founder & CEO</p>
        <p className="text-[20px] text-white/50">thrivein.io</p>
      </div>
    </div>
  </div>
);

const Slide2 = () => (
  <div className="flex flex-col justify-center h-full bg-[#0d0d1a] text-white px-28 py-20">
    <div className="space-y-16">
      <div className="space-y-6">
        <p className="text-[20px] uppercase tracking-[6px] text-primary font-semibold">The Thesis</p>
        <h2 className="text-[64px] font-bold leading-[1.1] max-w-[1400px]">
          Creative work is global.<br />
          <span className="text-primary">Its infrastructure is broken.</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-12 max-w-[1500px]">
        <div className="space-y-8">
          <div className="flex items-start gap-5">
            <div className="w-3 h-3 rounded-full bg-primary mt-3 shrink-0" />
            <p className="text-[28px] text-white/80 leading-relaxed">The creator economy exceeds <span className="text-purple-300 font-semibold">$235B</span> globally — and is professionalizing.</p>
          </div>
          <div className="flex items-start gap-5">
            <div className="w-3 h-3 rounded-full bg-fuchsia-500 mt-3 shrink-0" />
            <p className="text-[28px] text-white/80 leading-relaxed"><span className="text-fuchsia-300 font-semibold">200M+</span> creators now collaborate remotely.</p>
          </div>
          <div className="flex items-start gap-5">
            <div className="w-3 h-3 rounded-full bg-primary mt-3 shrink-0" />
            <p className="text-[28px] text-white/80 leading-relaxed">Creative labor is shifting from "influence" to <span className="text-purple-300 font-semibold">enterprise</span>.</p>
          </div>
        </div>
        <div className="flex items-center">
          <div className="p-10 rounded-3xl border border-primary/20 bg-primary/5 backdrop-blur">
            <p className="text-[30px] text-white/90 leading-relaxed">
              As this market matures, <span className="font-bold text-purple-300">infrastructure platforms win</span>.
            </p>
            <p className="text-[26px] text-white/60 mt-6">
              ThriveIN is building the identity, workflow, and payment layer for the creative economy.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Slide3 = () => (
  <div className="flex flex-col justify-center h-full bg-[#0d0d1a] text-white px-28 py-20">
    <div className="space-y-14">
      <div className="space-y-6">
        <p className="text-[20px] uppercase tracking-[6px] text-primary font-semibold">The Problem</p>
        <h2 className="text-[56px] font-bold leading-tight">
          Creators rely on a <span className="text-red-400">fragmented stack</span> to survive.
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-16">
        <div className="space-y-6">
          {[
            { label: "Discovery", tools: "Instagram / WhatsApp" },
            { label: "Workflow", tools: "Google Drive / Trello" },
            { label: "Payments", tools: "PayPal / Bank transfer" },
            { label: "Reputation", tools: "Scattered across platforms" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[24px] font-semibold text-white/90 w-[200px]">{item.label}</span>
              <span className="text-[22px] text-red-300/80">→ {item.tools}</span>
            </div>
          ))}
        </div>
        <div className="space-y-8">
          <p className="text-[26px] text-white/70 font-medium">There is no unified system for:</p>
          <div className="space-y-5">
            {["Verified identity", "Structured collaboration", "Milestone-based escrow", "Portable reputation"].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 text-[18px]">✕</div>
                <span className="text-[26px] text-white/80">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 p-8 rounded-2xl bg-red-500/10 border border-red-500/20">
            <p className="text-[28px] text-red-300 font-semibold">The result: friction, mistrust, and lost income.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Slide4 = () => (
  <div className="flex flex-col justify-center h-full bg-[#0d0d1a] text-white px-28 py-20">
    <div className="space-y-14">
      <div className="space-y-6">
        <p className="text-[20px] uppercase tracking-[6px] text-primary font-semibold">The Solution</p>
        <h2 className="text-[56px] font-bold">One Vertical <span className="text-primary">Operating System</span></h2>
        <p className="text-[26px] text-white/60">ThriveIN integrates the full creative lifecycle</p>
      </div>
      <div className="grid grid-cols-4 gap-8">
        {[
          { title: "Connect", desc: "AI-powered matching + verified profiles", icon: "", color: "from-primary/20 to-indigo-700/10" },
          { title: "Collaborate", desc: "Project workspaces with milestones and deliverables", icon: "", color: "from-fuchsia-500/20 to-fuchsia-600/10" },
          { title: "Transact", desc: "Secure milestone-based escrow payments", icon: "", color: "from-green-500/20 to-green-600/10" },
          { title: "Reputation", desc: "A portable, verified track record", icon: "", color: "from-amber-500/20 to-amber-600/10" },
        ].map((item, i) => (
          <div key={i} className={`p-10 rounded-3xl bg-gradient-to-b ${item.color} border border-white/10 flex flex-col items-center text-center space-y-6`}>
            <span className="text-[64px]">{item.icon}</span>
            <h3 className="text-[32px] font-bold">{item.title}</h3>
            <p className="text-[22px] text-white/70 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-8">
        <p className="text-[36px] font-bold">
          <span className="text-primary">Connect.</span>{" "}
          <span className="text-fuchsia-400">Work.</span>{" "}
          <span className="text-green-400">Get Paid.</span>
        </p>
      </div>
    </div>
  </div>
);

const Slide5 = () => (
  <div className="flex flex-col justify-center h-full bg-[#0d0d1a] text-white px-28 py-20">
    <div className="space-y-14">
      <div className="space-y-6">
        <p className="text-[20px] uppercase tracking-[6px] text-green-400 font-semibold">Product Status</p>
        <h2 className="text-[64px] font-bold">
          ThriveIN is <span className="text-green-400">live</span>.
        </h2>
        <p className="text-[28px] text-white/60">We are raising on a deployed product — not a concept.</p>
      </div>
      <div className="grid grid-cols-2 gap-8">
        {[
          { label: "Mobile-first platform", detail: "Android beta launching", status: "live" },
          { label: "Escrow payments", detail: "Stripe Connect", status: "live" },
          { label: "AI matching & scouting", detail: "Smart creator discovery", status: "live" },
          { label: "Project management", detail: "ThriveDesk workspaces", status: "live" },
          { label: "Opportunity board", detail: "Gigs, jobs & collabs", status: "live" },
          { label: "Accounting tools", detail: "P&L, expenses, invoicing", status: "live" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-6 p-7 rounded-2xl bg-white/5 border border-green-500/20">
            <div className="w-4 h-4 rounded-full bg-green-500 shrink-0 shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
            <div>
              <p className="text-[26px] font-semibold">{item.label}</p>
              <p className="text-[20px] text-white/50">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 text-center">
        <p className="text-[24px] text-purple-300">Built capital-efficiently using <span className="font-semibold">AI-augmented development</span></p>
      </div>
    </div>
  </div>
);

const Slide6 = () => (
  <div className="flex flex-col justify-center h-full bg-[#0d0d1a] text-white px-28 py-20">
    <div className="space-y-14">
      <div className="space-y-6">
        <p className="text-[20px] uppercase tracking-[6px] text-primary font-semibold">Unfair Advantage</p>
        <h2 className="text-[52px] font-bold leading-tight">
          Most marketplaces die from cold start.<br />
          <span className="text-primary">We launch into density.</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-16">
        <div className="space-y-6">
          <p className="text-[24px] text-white/60 font-medium">Over 13 years, Thrive Collective has built:</p>
          {[
            "500+ creative events across multiple countries",
            "18,000+ cumulative community contacts",
            "Magazine distribution in 400+ physical locations",
            "Podcast and live media visibility",
            "Active creator communities",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0" />
              <p className="text-[24px] text-white/80">{item}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[22px] text-white/50 mb-6 font-medium">Our growth engine:</p>
          <div className="space-y-4">
            {[
              { from: "Events", to: "Signups", color: "purple" },
              { from: "Community", to: "Activation", color: "fuchsia" },
              { from: "Platform", to: "Transactions", color: "green" },
              { from: "Reputation", to: "Retention", color: "amber" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-xl bg-white/5">
                <span className="text-[24px] font-semibold text-white/90 w-[200px]">{item.from}</span>
                <span className="text-primary text-[24px]">→</span>
                <span className="text-[24px] text-purple-300">{item.to}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 p-6 rounded-2xl bg-primary/10 border border-primary/20">
            <p className="text-[22px] text-purple-300 font-medium">Embedded distribution materially lowers early acquisition risk.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Slide7 = () => (
  <div className="flex flex-col justify-center h-full bg-[#0d0d1a] text-white px-28 py-20">
    <div className="space-y-14">
      <div className="space-y-6">
        <p className="text-[20px] uppercase tracking-[6px] text-primary font-semibold">Strategy</p>
        <h2 className="text-[56px] font-bold">
          Dominate hubs. <span className="text-primary">Then expand.</span>
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-10">
        {[
          { phase: "Phase 1", region: "Trinidad & Tobago", desc: "High creative density. Deep founder network.", status: "active", emoji: "🇹🇹" },
          { phase: "Phase 2", region: "Bali", desc: "Global nomad capital. Existing media distribution.", status: "next", emoji: "🇮🇩" },
          { phase: "Phase 3", region: "Global Creative Hubs", desc: "Caribbean → UK → US → Africa", status: "future", emoji: "" },
        ].map((item, i) => (
          <div key={i} className={`p-10 rounded-3xl border ${item.status === 'active' ? 'border-primary/40 bg-primary/10' : 'border-white/10 bg-white/5'} space-y-6`}>
            <span className="text-[64px]">{item.emoji}</span>
            <div>
              <p className="text-[20px] text-primary font-semibold uppercase tracking-wider">{item.phase}</p>
              <h3 className="text-[36px] font-bold mt-2">{item.region}</h3>
            </div>
            <p className="text-[24px] text-white/70 leading-relaxed">{item.desc}</p>
            {item.status === 'active' && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[18px] text-green-400 font-medium">Active</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-[28px] text-white/60">We prove liquidity in contained markets. <span className="text-purple-300 font-semibold">Then replicate globally.</span></p>
      </div>
    </div>
  </div>
);

const Slide8 = () => (
  <div className="flex flex-col justify-center h-full bg-[#0d0d1a] text-white px-28 py-20">
    <div className="space-y-14">
      <div className="space-y-6">
        <p className="text-[20px] uppercase tracking-[6px] text-primary font-semibold">Business Model</p>
        <h2 className="text-[56px] font-bold">
          We monetize <span className="text-green-400">transaction velocity</span>.
        </h2>
      </div>
      <div className="grid grid-cols-4 gap-8">
        {[
          { title: "Transaction Fees", items: ["Free Tier: 15%", "Pro Tier: 8%"], icon: "" },
          { title: "Subscription", items: ["Pro: $12/month", ""], icon: "" },
          { title: "Founder Circle", items: ["$199 Lifetime", ""], icon: "👑" },
          { title: "Future Expansion", items: ["Financial tools", "Creator credit layer"], icon: "" },
        ].map((item, i) => (
          <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6">
            <span className="text-[48px]">{item.icon}</span>
            <h3 className="text-[28px] font-bold">{item.title}</h3>
            {item.items.filter(Boolean).map((sub, j) => (
              <p key={j} className="text-[22px] text-white/70">{sub}</p>
            ))}
          </div>
        ))}
      </div>
      <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20 text-center">
        <p className="text-[26px] text-green-300 font-medium">As project volume scales, revenue compounds.</p>
      </div>
    </div>
  </div>
);

const Slide9 = () => (
  <div className="flex flex-col justify-center h-full bg-[#0d0d1a] text-white px-28 py-20">
    <div className="space-y-14">
      <div className="space-y-6">
        <p className="text-[20px] uppercase tracking-[6px] text-primary font-semibold">Go-to-Market</p>
        <h2 className="text-[56px] font-bold">
          <span className="text-primary">Event-Led</span> Growth
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-16">
        <div className="space-y-10">
          <div className="p-10 rounded-3xl bg-gradient-to-br from-primary/20 to-fuchsia-500/10 border border-primary/30">
            <p className="text-[22px] text-purple-300 font-medium uppercase tracking-wider">Catalyst</p>
            <h3 className="text-[44px] font-bold mt-3">ThriveX Festival</h3>
            <p className="text-[28px] text-white/70 mt-2">Bali · September 2026</p>
          </div>
        </div>
        <div className="space-y-8">
          <p className="text-[24px] text-white/60 font-medium">Strategy:</p>
          {[
            "Sponsor-funded activation",
            "Ticket purchase = App onboarding",
            "Concentrated user acquisition in 48 hours",
            "Immediate transaction opportunities on platform",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-5">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-[18px] shrink-0">{i + 1}</div>
              <p className="text-[26px] text-white/80">{item}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 text-center">
        <p className="text-[28px] text-purple-300 font-semibold">We convert offline density into digital liquidity.</p>
      </div>
    </div>
  </div>
);

const Slide10 = () => (
  <div className="flex flex-col justify-center h-full bg-[#0d0d1a] text-white px-28 py-20">
    <div className="space-y-14">
      <div className="space-y-6">
        <p className="text-[20px] uppercase tracking-[6px] text-primary font-semibold">Traction & Projections</p>
        <h2 className="text-[56px] font-bold">
          Path to <span className="text-green-400">$1.5M ARR</span>
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-10">
        {[
          { period: "Month 6", users: "500", gmv: "$25K", arr: "—", highlight: false },
          { period: "Month 12", users: "2,500", gmv: "$250K", arr: "$200K", highlight: false },
          { period: "Month 24", users: "25,000", gmv: "$5M", arr: "$1.5M", highlight: true },
        ].map((item, i) => (
          <div key={i} className={`p-10 rounded-3xl border ${item.highlight ? 'border-green-500/40 bg-green-500/10' : 'border-white/10 bg-white/5'} space-y-8`}>
            <p className="text-[22px] text-primary font-semibold uppercase tracking-wider">{item.period}</p>
            <div className="space-y-6">
              <div>
                <p className="text-[18px] text-white/50 uppercase tracking-wider">Active Users</p>
                <p className="text-[44px] font-bold">{item.users}</p>
              </div>
              <div>
                <p className="text-[18px] text-white/50 uppercase tracking-wider">GMV</p>
                <p className="text-[44px] font-bold text-green-400">{item.gmv}</p>
              </div>
              <div>
                <p className="text-[18px] text-white/50 uppercase tracking-wider">ARR</p>
                <p className={`text-[44px] font-bold ${item.arr !== '—' ? 'text-green-400' : 'text-white/30'}`}>{item.arr}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-8 text-[20px] text-white/40 justify-center">
        <span>Assumes 5% monthly transaction rate</span>
        <span>·</span>
        <span>Assumes $200 average project size</span>
        <span>·</span>
        <span className="text-purple-300">Upside increases with network density</span>
      </div>
    </div>
  </div>
);

const Slide11 = () => (
  <div className="flex flex-col justify-center h-full bg-[#0d0d1a] text-white px-28 py-20">
    <div className="space-y-14">
      <div className="space-y-6">
        <p className="text-[20px] uppercase tracking-[6px] text-primary font-semibold">Founder</p>
        <h2 className="text-[56px] font-bold">
          Founder-Market <span className="text-primary">Fit</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-16">
        <div className="space-y-8">
          <div className="flex items-center gap-8">
            <div className="w-[180px] h-[180px] rounded-3xl bg-gradient-to-br from-primary/30 to-fuchsia-500/20 flex items-center justify-center text-[72px]">
              EA
            </div>
            <div>
              <h3 className="text-[40px] font-bold">Ethan Auguste</h3>
              <p className="text-[24px] text-purple-300">Founder & CEO</p>
            </div>
          </div>
          <div className="space-y-5 mt-8">
            {[
              "13 years building global creative ecosystems",
              "500+ events produced internationally",
              "Built revenue-generating creative brands",
              "Secured prior grant funding for earlier iteration",
              "Rebuilt V3 leveraging AI-augmented development",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0" />
                <p className="text-[24px] text-white/80">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-between">
          <div className="p-10 rounded-3xl bg-primary/10 border border-primary/20 space-y-6">
            <p className="text-[32px] font-bold text-white/90">Iteration three.</p>
            <p className="text-[28px] text-purple-300">Faster execution.</p>
            <p className="text-[28px] text-purple-300">Full-stack integration.</p>
          </div>
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 mt-8">
            <p className="text-[22px] text-white/60">First hire post-close:</p>
            <p className="text-[26px] text-white/90 font-semibold mt-2">Senior Engineering Lead to accelerate scale</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Slide12 = () => (
  <div className="flex flex-col justify-center h-full bg-gradient-to-br from-[#0d0d1a] via-[#1a1030] to-[#0d0d1a] text-white px-28 py-20">
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div className="absolute top-[20%] right-[15%] w-[600px] h-[600px] rounded-full bg-indigo-700/10 blur-[120px]" />
    </div>
    <div className="relative z-10 grid grid-cols-2 gap-20">
      <div className="space-y-10">
        <div className="space-y-6">
          <p className="text-[20px] uppercase tracking-[6px] text-primary font-semibold">Vision & The Ask</p>
          <h2 className="text-[52px] font-bold leading-tight">
            The Identity Layer for the <span className="text-primary">Creative World</span>
          </h2>
        </div>
        <div className="space-y-6 text-[24px] text-white/70 leading-relaxed">
          <p>ThriveIN is not a gig app.</p>
          <p>It is the <span className="text-white font-semibold">verified record of creative work</span>.</p>
          <p>Every completed project builds:</p>
        </div>
        <div className="flex gap-6">
          {["Trust", "Transaction history", "Reputation score"].map((item, i) => (
            <div key={i} className="px-6 py-3 rounded-full bg-primary/20 border border-primary/30 text-[20px] text-purple-300 font-medium">
              {item}
            </div>
          ))}
        </div>
        <div className="space-y-3 text-[26px] text-white/80 mt-4">
          <p>Creative labor is global.</p>
          <p className="text-purple-300 font-semibold">Professional infrastructure will define the winners.</p>
          <p>We are building that layer.</p>
        </div>
      </div>
      <div className="flex flex-col justify-center">
        <div className="p-12 rounded-3xl bg-gradient-to-br from-primary/20 to-fuchsia-500/10 border border-primary/30 space-y-10">
          <div className="space-y-4">
            <p className="text-[22px] text-purple-300 uppercase tracking-wider font-medium">Raising</p>
            <p className="text-[64px] font-black text-white">$500K</p>
            <p className="text-[22px] text-white/50">via SAFE · 18-month runway</p>
          </div>
          <div className="w-full h-px bg-primary/30" />
          <div className="space-y-5">
            <p className="text-[20px] text-white/50 uppercase tracking-wider font-medium">Focus</p>
            {["Engineering scale", "Mobile optimization", "Community activation", "Transaction velocity"].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[24px] text-white/80">{item}</span>
              </div>
            ))}
          </div>
          <div className="w-full h-px bg-primary/30" />
          <div className="space-y-3 text-[24px]">
            <p className="text-white/90">The product exists.</p>
            <p className="text-white/90">The ecosystem exists.</p>
            <p className="text-white/90">The market exists.</p>
            <p className="text-purple-300 font-bold text-[28px] mt-4">Now we scale.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SLIDES = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7, Slide8, Slide9, Slide10, Slide11, Slide12];

const SLIDE_TITLES = [
  "Title", "The Thesis", "The Problem", "The Solution", "Product Status", "Unfair Advantage",
  "Strategy", "Business Model", "Go-to-Market", "Traction", "Founder", "Vision & The Ask"
];

export default function PitchDeck() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const offscreenRef = useRef<HTMLDivElement>(null);

  const exportToPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1920, 1080] });

      // Create offscreen container
      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:0;width:1920px;height:1080px;overflow:hidden;";
      document.body.appendChild(container);

      for (let i = 0; i < SLIDES.length; i++) {
        if (i > 0) pdf.addPage([1920, 1080], "landscape");

        // Render slide into offscreen container
        const { createRoot } = await import("react-dom/client");
        const SlideComp = SLIDES[i];
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "width:1920px;height:1080px;position:relative;";
        container.innerHTML = "";
        container.appendChild(wrapper);

        const root = createRoot(wrapper);
        await new Promise<void>((resolve) => {
          root.render(<SlideComp />);
          setTimeout(resolve, 200);
        });

        const canvas = await html2canvas(wrapper, {
          width: 1920,
          height: 1080,
          scale: 2,
          backgroundColor: "#0d0d1a",
          useCORS: true,
        });

        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 1920, 1080);
        root.unmount();
      }

      document.body.removeChild(container);
      pdf.save("ThriveIN-Pitch-Deck.pdf");
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const goNext = useCallback(() => setCurrent(c => Math.min(c + 1, TOTAL_SLIDES - 1)), []);
  const goPrev = useCallback(() => setCurrent(c => Math.max(c - 1, 0)), []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "Escape") exitFullscreen();
      if (e.key === "f" || e.key === "F5") { e.preventDefault(); enterFullscreen(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  // Calculate scale
  useEffect(() => {
    const updateScale = () => {
      const container = document.getElementById("slide-container");
      if (!container) return;
      const { width, height } = container.getBoundingClientRect();
      setScale(Math.min(width / 1920, height / 1080));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [isFullscreen]);

  // Fullscreen events
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.();
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
  };

  const SlideComponent = SLIDES[current];

  return (
    <div className={`flex flex-col h-screen bg-[#08080f] ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      {/* Toolbar */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-6 py-3 bg-[#0d0d1a] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-white font-bold text-lg">ThriveIN Pitch Deck</h1>
            <span className="text-white/40 text-sm">{current + 1} / {TOTAL_SLIDES}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? "Exporting..." : "PDF"}
            </button>
            <button
              onClick={enterFullscreen}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-700 hover:bg-primary text-white text-sm font-medium transition-colors"
            >
              <Maximize className="w-4 h-4" />
              Present
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail sidebar */}
        {!isFullscreen && (
          <div className="w-48 bg-[#0a0a15] border-r border-white/10 overflow-y-auto shrink-0 p-3 space-y-2">
            {SLIDE_TITLES.map((title, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
                  i === current
                    ? 'bg-indigo-700/30 border border-primary/50 text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/70 border border-transparent'
                }`}
              >
                <span className="text-white/30 mr-1">{i + 1}.</span> {title}
              </button>
            ))}
          </div>
        )}

        {/* Slide canvas */}
        <div id="slide-container" className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#08080f]" onClick={isFullscreen ? goNext : undefined}>
          <div
            className="absolute"
            style={{
              width: 1920,
              height: 1080,
              left: "50%",
              top: "50%",
              marginLeft: -960,
              marginTop: -540,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl">
              <SlideComponent />
            </div>
          </div>

          {/* Navigation arrows */}
          {!isFullscreen && (
            <>
              {current > 0 && (
                <button onClick={goPrev} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {current < TOTAL_SLIDES - 1 && (
                <button onClick={goNext} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      {!isFullscreen && (
        <div className="flex items-center justify-center gap-2 py-3 bg-[#0d0d1a] border-t border-white/10 shrink-0">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === current ? 'bg-primary' : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
