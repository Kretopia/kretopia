/**
 * PillarMockups — stylized UI teasers for each Kretopia surface.
 * Pure HTML/CSS, brand-gradient on dark. No real data, no auth required.
 * Each mockup is ~aspect-[16/10] and sits inside the pillar tile.
 */
import {
  BadgeCheck, MapPin, Search, Heart, X, Plus, Check, Mic, Video,
  FileText, ArrowUpRight, Sparkles, Calendar as CalIcon,
} from "lucide-react";

const grad = { background: "var(--kretopia-sunset)" } as const;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full aspect-[16/10] rounded-xl bg-[#07070C] border border-white/[0.06] overflow-hidden shadow-inner">
      {/* top chrome */}
      <div className="absolute top-0 inset-x-0 h-5 flex items-center gap-1 px-2 border-b border-white/[0.04] bg-white/[0.015]">
        <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
      </div>
      <div className="absolute inset-0 pt-5">{children}</div>
    </div>
  );
}

function PassportMockup() {
  return (
    <Frame>
      <div className="p-3 flex gap-3">
        <div className="h-14 w-14 rounded-full shrink-0 ring-2 ring-white/10" style={grad} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <div className="h-2 w-20 rounded-full bg-white/80" />
            <BadgeCheck className="h-3 w-3 text-[#FF3D7A]" />
          </div>
          <div className="h-1.5 w-28 rounded-full bg-white/20 mt-1.5" />
          <div className="flex gap-1 mt-2">
            <span className="text-[7px] px-1.5 py-0.5 rounded-full border border-white/15 text-white/70">Director</span>
            <span className="text-[7px] px-1.5 py-0.5 rounded-full border border-white/15 text-white/70">Editor</span>
          </div>
        </div>
      </div>
      <div className="px-3 grid grid-cols-3 gap-1">
        <div className="aspect-square rounded-md" style={{ background: "linear-gradient(135deg, #4812F5, #9413D2)" }} />
        <div className="aspect-square rounded-md" style={{ background: "linear-gradient(135deg, #9413D2, #E0179C)" }} />
        <div className="aspect-square rounded-md" style={{ background: "linear-gradient(135deg, #E0179C, #FEA61A)" }} />
      </div>
    </Frame>
  );
}

function ScoutMockup() {
  return (
    <Frame>
      <div className="p-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-1">
          <Search className="h-2.5 w-2.5 text-white/40" />
          <div className="h-1 w-16 rounded-full bg-white/25" />
        </div>
        {[
          { c: "Netflix", t: "Series DOP — Trinidad" },
          { c: "Apple Music", t: "Cover artwork" },
          { c: "Vogue", t: "Stylist for editorial" },
        ].map((g, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md bg-white/[0.03] border border-white/[0.05] p-1.5">
            <div className="h-5 w-5 rounded shrink-0" style={grad} />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold text-white truncate leading-tight">{g.t}</p>
              <p className="text-[7px] text-white/45 truncate">{g.c}</p>
            </div>
            <ArrowUpRight className="h-2.5 w-2.5 text-white/40" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

function MatchMockup() {
  return (
    <Frame>
      <div className="relative h-full p-3 flex items-center justify-center">
        {/* back card */}
        <div className="absolute inset-x-6 top-3 bottom-9 rounded-lg bg-white/[0.04] border border-white/[0.06] rotate-[-4deg]" />
        <div className="absolute inset-x-5 top-2 bottom-8 rounded-lg bg-white/[0.06] border border-white/[0.08] rotate-[2deg]" />
        {/* front card */}
        <div className="relative w-full max-w-[70%] rounded-lg overflow-hidden border border-white/15" style={grad}>
          <div className="aspect-[4/5] flex flex-col justify-end p-2 bg-gradient-to-t from-black/70 via-transparent to-transparent">
            <div className="h-2 w-14 rounded-full bg-white/90" />
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-2 w-2 text-white/70" />
              <div className="h-1 w-10 rounded-full bg-white/50" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-2">
          <div className="h-5 w-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center"><X className="h-2.5 w-2.5 text-white/60" /></div>
          <div className="h-5 w-5 rounded-full flex items-center justify-center" style={grad}><Heart className="h-2.5 w-2.5 text-white" /></div>
        </div>
      </div>
    </Frame>
  );
}

function StudioMockup() {
  return (
    <Frame>
      <div className="p-2.5 grid grid-cols-3 gap-1.5 h-full">
        {[
          { h: "Todo", n: 3, c: "bg-white/[0.06]" },
          { h: "Doing", n: 2, c: "bg-white/[0.09]" },
          { h: "Done", n: 4, c: "bg-white/[0.05]" },
        ].map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[7px] uppercase tracking-wider text-white/50 font-bold">{col.h}</span>
              <span className="text-[7px] text-white/40">{col.n}</span>
            </div>
            {Array.from({ length: col.n > 2 ? 2 : col.n }).map((_, ti) => (
              <div key={ti} className={`rounded-sm ${col.c} border border-white/[0.05] p-1`}>
                <div className="h-0.5 w-full rounded-full bg-white/40 mb-0.5" />
                <div className="h-0.5 w-2/3 rounded-full bg-white/20" />
                {ci === 2 && <Check className="h-1.5 w-1.5 text-emerald-400 mt-0.5" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Frame>
  );
}

function SoundStagesMockup() {
  return (
    <Frame>
      <div className="relative h-full p-3 flex flex-col items-center justify-center">
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40">
          <span className="h-1 w-1 rounded-full bg-red-400 animate-pulse" />
          <span className="text-[7px] font-bold text-red-300 uppercase tracking-wider">Live</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-7 w-7 rounded-full ring-1 ring-white/15"
              style={{
                background: i % 2 === 0
                  ? "linear-gradient(135deg, #4812F5, #E0179C)"
                  : "linear-gradient(135deg, #9413D2, #FEA61A)",
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-4 w-4 rounded-full flex items-center justify-center" style={grad}><Mic className="h-2 w-2 text-white" /></div>
          <div className="h-4 w-4 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><Video className="h-2 w-2 text-white/60" /></div>
        </div>
      </div>
    </Frame>
  );
}

function KrePayMockup() {
  return (
    <Frame>
      <div className="p-2.5 space-y-1.5">
        <div className="rounded-md bg-white/[0.04] border border-white/[0.06] p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[7px] font-bold uppercase tracking-wider text-white/50">Invoice #024</span>
            <span className="text-[7px] px-1 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">PAID</span>
          </div>
          <p className="text-sm font-bold text-white leading-none" style={{ backgroundImage: "var(--kretopia-sunset)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>$4,200</p>
          <div className="h-1 w-16 rounded-full bg-white/15 mt-1" />
        </div>
        <div className="rounded-md bg-white/[0.03] border border-white/[0.05] p-1.5 flex items-center gap-1.5">
          <FileText className="h-3 w-3 text-white/50" />
          <div className="flex-1">
            <div className="h-1 w-14 rounded-full bg-white/50" />
            <div className="h-0.5 w-10 rounded-full bg-white/20 mt-0.5" />
          </div>
          <span className="text-[7px] text-white/40">Pending</span>
        </div>
      </div>
    </Frame>
  );
}

function KretoMockup() {
  return (
    <Frame>
      <div className="p-2.5 space-y-1.5">
        <div className="flex items-start gap-1.5">
          <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0" style={grad}>
            <Sparkles className="h-2 w-2 text-white" />
          </div>
          <div className="rounded-md bg-white/[0.05] border border-white/[0.06] p-1.5 flex-1">
            <p className="text-[7.5px] text-white/80 leading-tight">I found 3 gigs matching your rate.</p>
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0" style={grad}>
            <Sparkles className="h-2 w-2 text-white" />
          </div>
          <div className="rounded-md bg-white/[0.05] border border-white/[0.06] p-1.5 flex-1">
            <p className="text-[7.5px] text-white/80 leading-tight">Draft proposal ready — review?</p>
          </div>
        </div>
        <div className="ml-auto flex gap-1 w-fit">
          <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/80">Yes, send</span>
          <span className="text-[7px] px-1.5 py-0.5 rounded-full border border-white/10 text-white/50">Edit</span>
        </div>
      </div>
    </Frame>
  );
}

function ThriveINMockup() {
  return (
    <Frame>
      <div className="p-2.5 space-y-1">
        {[
          { d: "FRI", n: "21", t: "Creator Mixer · Port of Spain" },
          { d: "SAT", n: "22", t: "Producer Beat Battle" },
          { d: "SUN", n: "23", t: "Director Q&A — live" },
        ].map((e, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md bg-white/[0.03] border border-white/[0.05] p-1.5">
            <div className="h-7 w-7 rounded-md flex flex-col items-center justify-center shrink-0" style={grad}>
              <span className="text-[6px] font-bold text-white/90 leading-none">{e.d}</span>
              <span className="text-[10px] font-bold text-white leading-none">{e.n}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold text-white truncate leading-tight">{e.t}</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <CalIcon className="h-2 w-2 text-white/40" />
                <div className="h-0.5 w-8 rounded-full bg-white/20" />
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
