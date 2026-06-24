/**
 * PillarMockups — stylized UI teasers for each Kretopia surface.
 * Each mockup mixes real creator/event photography (Unsplash CDN) with
 * brand-gradient UI chrome so the landing previews feel like real product.
 */
import {
  BadgeCheck, MapPin, Search, Heart, X, Check, Mic, Video,
  FileText, ArrowUpRight, Sparkles, Calendar as CalIcon, Send,
} from "lucide-react";

const grad = { background: "var(--kretopia-sunset)" } as const;

// Curated Unsplash photos — diverse creators, on-brand moody lighting.
const IMG = {
  passportPortrait: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80&auto=format&fit=crop",
  passportCover:    "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=600&q=80&auto=format&fit=crop",
  work1:            "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&q=80&auto=format&fit=crop",
  work2:            "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=300&q=80&auto=format&fit=crop",
  work3:            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80&auto=format&fit=crop",
  matchA:           "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&q=80&auto=format&fit=crop",
  matchB:           "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80&auto=format&fit=crop",
  matchC:           "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&q=80&auto=format&fit=crop",
  studio:           "https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=80&auto=format&fit=crop",
  sound1:           "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&q=80&auto=format&fit=crop",
  sound2:           "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80&auto=format&fit=crop",
  sound3:           "https://images.unsplash.com/photo-1521133573892-e44906baee46?w=300&q=80&auto=format&fit=crop",
  sound4:           "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80&auto=format&fit=crop",
  sound5:           "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&q=80&auto=format&fit=crop",
  sound6:           "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&q=80&auto=format&fit=crop",
  event1:           "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80&auto=format&fit=crop",
  event2:           "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80&auto=format&fit=crop",
  event3:           "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80&auto=format&fit=crop",
  brand1:           "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=200&q=80&auto=format&fit=crop",
  brand2:           "https://images.unsplash.com/photo-1542744095-291d1f67b221?w=200&q=80&auto=format&fit=crop",
  brand3:           "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=200&q=80&auto=format&fit=crop",
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full aspect-[16/10] rounded-xl bg-[#07070C] border border-white/[0.06] overflow-hidden shadow-inner">
      <div className="absolute top-0 inset-x-0 h-5 flex items-center gap-1 px-2 border-b border-white/[0.04] bg-white/[0.015] z-10">
        <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
      </div>
      <div className="absolute inset-0 pt-5">{children}</div>
    </div>
  );
}

/* ───────── PASSPORT ─────────
   Profile hero: cover photo + portrait + 3 work thumbnails. */
function PassportMockup() {
  return (
    <Frame>
      {/* cover */}
      <div className="relative h-10 w-full overflow-hidden">
        <img src={IMG.passportCover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent, #07070C)" }} />
      </div>
      <div className="px-3 -mt-4 flex gap-2">
        <img src={IMG.passportPortrait} alt="" className="h-9 w-9 rounded-full ring-2 ring-[#07070C] object-cover shrink-0" />
        <div className="flex-1 min-w-0 pt-3.5">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-16 rounded-full bg-white/85" />
            <BadgeCheck className="h-2.5 w-2.5 text-[#FF3D7A]" />
          </div>
          <div className="flex gap-1 mt-1">
            <span className="text-[6.5px] px-1 py-px rounded-full border border-white/15 text-white/70">Director</span>
            <span className="text-[6.5px] px-1 py-px rounded-full border border-white/15 text-white/70">Editor</span>
          </div>
        </div>
      </div>
      <div className="px-3 mt-1.5 grid grid-cols-3 gap-1">
        {[IMG.work1, IMG.work2, IMG.work3].map((src, i) => (
          <div key={i} className="aspect-square rounded-md overflow-hidden">
            <img src={src} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ───────── SCOUT ─────────
   Inbox of real brand gigs with brand thumbnails. */
function ScoutMockup() {
  const gigs = [
    { logo: IMG.brand1, brand: "Netflix",     title: "Series DOP — Trinidad" },
    { logo: IMG.brand2, brand: "Apple Music", title: "Cover artwork" },
    { logo: IMG.brand3, brand: "Vogue",       title: "Editorial stylist" },
  ];
  return (
    <Frame>
      <div className="p-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-1">
          <Search className="h-2.5 w-2.5 text-white/40" />
          <span className="text-[7.5px] text-white/40">Scout · live now</span>
          <span className="ml-auto h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        {gigs.map((g, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md bg-white/[0.03] border border-white/[0.05] p-1.5">
            <img src={g.logo} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold text-white truncate leading-tight">{g.title}</p>
              <p className="text-[7px] text-white/45 truncate">{g.brand}</p>
            </div>
            <ArrowUpRight className="h-2.5 w-2.5 text-white/40" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ───────── MATCH ─────────
   Tinder-style swipe stack with real portraits. */
function MatchMockup() {
  return (
    <Frame>
      <div className="relative h-full p-2.5 flex items-center justify-center">
        <div
          className="absolute top-2 left-8 right-8 bottom-9 rounded-lg overflow-hidden border border-white/10 rotate-[-5deg] opacity-60"
        >
          <img src={IMG.matchC} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute top-1.5 left-6 right-6 bottom-8 rounded-lg overflow-hidden border border-white/15 rotate-[3deg]">
          <img src={IMG.matchB} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="relative w-[62%] rounded-lg overflow-hidden border border-white/20 shadow-2xl">
          <div className="relative aspect-[4/5]">
            <img src={IMG.matchA} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-1.5 left-1.5 right-1.5">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-12 rounded-full bg-white/95" />
                <BadgeCheck className="h-2 w-2 text-[#FF3D7A]" />
              </div>
              <div className="flex items-center gap-0.5 mt-0.5">
                <MapPin className="h-1.5 w-1.5 text-white/70" />
                <span className="text-[6px] text-white/70">Port of Spain</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-1.5 inset-x-0 flex items-center justify-center gap-2">
          <div className="h-5 w-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center"><X className="h-2.5 w-2.5 text-white/60" /></div>
          <div className="h-5 w-5 rounded-full flex items-center justify-center shadow-lg" style={grad}><Heart className="h-2.5 w-2.5 text-white" /></div>
        </div>
      </div>
    </Frame>
  );
}

/* ───────── STUDIO ─────────
   Workspace photo with kanban overlay. */
function StudioMockup() {
  return (
    <Frame>
      <div className="relative h-full">
        <img src={IMG.studio} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,7,12,0.4), rgba(7,7,12,0.95))" }} />
        <div className="relative p-2.5 grid grid-cols-3 gap-1.5 h-full">
          {[
            { h: "Todo",  n: 3 },
            { h: "Doing", n: 2 },
            { h: "Done",  n: 4 },
          ].map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[7px] uppercase tracking-wider text-white/60 font-bold">{col.h}</span>
                <span className="text-[7px] text-white/40">{col.n}</span>
              </div>
              {Array.from({ length: 2 }).map((_, ti) => (
                <div key={ti} className="rounded-sm bg-white/[0.08] backdrop-blur-sm border border-white/[0.08] p-1">
                  <div className="h-0.5 w-full rounded-full bg-white/50 mb-0.5" />
                  <div className="h-0.5 w-2/3 rounded-full bg-white/25" />
                  {ci === 2 && <Check className="h-1.5 w-1.5 text-emerald-400 mt-0.5" />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ───────── SOUNDSTAGES ─────────
   Live grid of speaker tiles with real portraits. */
function SoundStagesMockup() {
  const tiles = [IMG.sound1, IMG.sound2, IMG.sound3, IMG.sound4, IMG.sound5, IMG.sound6];
  return (
    <Frame>
      <div className="relative h-full p-2.5">
        <div className="absolute top-1 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 z-10">
          <span className="h-1 w-1 rounded-full bg-red-400 animate-pulse" />
          <span className="text-[7px] font-bold text-red-300 uppercase tracking-wider">Live</span>
        </div>
        <div className="grid grid-cols-3 gap-1 mt-2">
          {tiles.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-md overflow-hidden ring-1 ring-white/10">
              <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
              {i === 0 && (
                <div className="absolute inset-0 ring-2 ring-[#FF3D7A] rounded-md" />
              )}
            </div>
          ))}
        </div>
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <div className="h-4 w-4 rounded-full flex items-center justify-center shadow-lg" style={grad}><Mic className="h-2 w-2 text-white" /></div>
          <div className="h-4 w-4 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center"><Video className="h-2 w-2 text-white/70" /></div>
        </div>
      </div>
    </Frame>
  );
}

/* ───────── KREPAY ─────────
   Invoice + pending contract row. */
function KrePayMockup() {
  return (
    <Frame>
      <div className="p-2.5 space-y-1.5">
        <div className="relative rounded-md border border-white/[0.08] p-2 overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={grad} />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[7px] font-bold uppercase tracking-wider text-white/70">Invoice #024</span>
              <span className="text-[7px] px-1 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">PAID</span>
            </div>
            <p className="text-base font-black leading-none" style={{ backgroundImage: "var(--kretopia-sunset)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>$4,200</p>
            <p className="text-[7px] text-white/60 mt-0.5">Apple Music · Cover art</p>
          </div>
        </div>
        <div className="rounded-md bg-white/[0.03] border border-white/[0.05] p-1.5 flex items-center gap-1.5">
          <FileText className="h-3 w-3 text-white/50" />
          <div className="flex-1 min-w-0">
            <p className="text-[7.5px] font-bold text-white leading-tight truncate">Contract — Netflix series</p>
            <div className="h-0.5 w-10 rounded-full bg-white/20 mt-0.5" />
          </div>
          <span className="text-[7px] text-amber-300/80 font-bold">Sign</span>
        </div>
      </div>
    </Frame>
  );
}

/* ───────── KRETO ─────────
   Chat with avatar + suggested replies. */
function KretoMockup() {
  return (
    <Frame>
      <div className="p-2.5 space-y-1.5">
        <div className="flex items-start gap-1.5">
          <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 shadow-lg" style={grad}>
            <Sparkles className="h-2 w-2 text-white" />
          </div>
          <div className="rounded-md rounded-tl-none bg-white/[0.06] border border-white/[0.08] p-1.5 flex-1">
            <p className="text-[7.5px] text-white/85 leading-tight">I found <span className="font-bold text-white">3 gigs</span> matching your rate this week.</p>
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 shadow-lg" style={grad}>
            <Sparkles className="h-2 w-2 text-white" />
          </div>
          <div className="rounded-md rounded-tl-none bg-white/[0.06] border border-white/[0.08] p-1.5 flex-1">
            <p className="text-[7.5px] text-white/85 leading-tight">Draft proposal ready for the Netflix one — review?</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 pt-0.5">
          <span className="text-[7px] px-1.5 py-0.5 rounded-full text-white font-bold" style={grad}>Yes, send</span>
          <span className="text-[7px] px-1.5 py-0.5 rounded-full border border-white/15 text-white/60">Edit first</span>
          <Send className="h-2.5 w-2.5 text-white/40 ml-0.5" />
        </div>
      </div>
    </Frame>
  );
}

/* ───────── THRIVEIN ─────────
   Upcoming events list with cover thumbnails. */
function ThriveINMockup() {
  const events = [
    { img: IMG.event1, d: "FRI", n: "21", t: "Creator Mixer · POS" },
    { img: IMG.event2, d: "SAT", n: "22", t: "Producer Beat Battle" },
    { img: IMG.event3, d: "SUN", n: "23", t: "Director Q&A — live" },
  ];
  return (
    <Frame>
      <div className="p-2.5 space-y-1">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md bg-white/[0.03] border border-white/[0.05] p-1 overflow-hidden">
            <div className="relative h-7 w-8 rounded-md overflow-hidden shrink-0">
              <img src={e.img} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[5.5px] font-bold text-white/90 leading-none">{e.d}</span>
                <span className="text-[9px] font-black text-white leading-none">{e.n}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold text-white truncate leading-tight">{e.t}</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <CalIcon className="h-2 w-2 text-white/40" />
                <span className="text-[6.5px] text-white/50">8 going</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export const PILLAR_MOCKUPS: Record<string, React.FC> = {
  Passport: PassportMockup,
  Scout: ScoutMockup,
  Match: MatchMockup,
  Studio: StudioMockup,
  SoundStages: SoundStagesMockup,
  KrePay: KrePayMockup,
  Kreto: KretoMockup,
  ThriveIN: ThriveINMockup,
};
