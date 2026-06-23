import { DECK_THEMES, type DeckTheme } from "@/lib/deckThemes";
import ReactMarkdown from "react-markdown";

export type SlideLayout =
  | "standard"
  | "hero"
  | "stats"
  | "two_column"
  | "quote"
  | "pricing"
  | "roll_call"
  | "letterhead_cover"
  | "letterhead_body";

export interface DeckStat { value: string; label: string; sub?: string }
export interface DeckColumn { heading: string; body?: string; bullets?: string[] }
export interface DeckQuote { text: string; attribution?: string }
export interface DeckPackage { name: string; price: string; includes: string[]; highlighted?: boolean }
export interface DeckPerson { name: string; role: string; note?: string }

export interface DeckSlide {
  heading: string;
  eyebrow?: string;
  body?: string;
  bullets?: string[];
  image_prompt?: string;
  callout?: string;
  /** Layout variant — defaults to "standard". */
  layout?: SlideLayout;
  stats?: DeckStat[];
  columns?: DeckColumn[];
  quote?: DeckQuote;
  pricing?: DeckPackage[];
  roll_call?: DeckPerson[];
  /** Recipient block for letterhead_cover */
  recipient?: { name?: string; org?: string; address?: string; date?: string; subject?: string };
}

export interface DeckBrandSnapshot {
  name?: string;
  tagline?: string | null;
  logo_url?: string | null;
  palette?: string[];
  fonts?: { heading?: string; body?: string };
}

export interface DeckContent {
  title: string;
  subtitle?: string;
  cover_prompt?: string;
  slides: DeckSlide[];
  next_steps?: string[];
  brand_snapshot?: DeckBrandSnapshot;
}

interface Props {
  doc: DeckContent;
  theme: DeckTheme;
  coverImageUrl?: string | null;
  authorName?: string | null;
}

export function DeckRenderer({ doc, theme, coverImageUrl, authorName }: Props) {
  const t = DECK_THEMES[theme] || DECK_THEMES.editorial;
  const brand = doc.brand_snapshot;
  const accent = brand?.palette?.[1] || brand?.palette?.[0] || null;
  const accentSecondary = brand?.palette?.[2] || brand?.palette?.[1] || null;
  const headingFont = brand?.fonts?.heading?.trim() || undefined;
  const bodyFont = brand?.fonts?.body?.trim() || undefined;
  const headingStyle = headingFont ? { fontFamily: headingFont } : undefined;
  const bodyStyle = bodyFont ? { fontFamily: bodyFont } : undefined;
  const accentStyle = accent ? { color: accent } : undefined;

  return (
    <div id="thrive-deck-root" className={`flex flex-col gap-6 ${t.font}`} style={bodyStyle}>
      {/* Cover */}
      <Slide className={`${t.page} ${t.cover}`} aspect>
        <div className="flex flex-col h-full justify-between relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={t.eyebrow}>{doc.subtitle || (brand?.name ? `Prepared by ${brand.name}` : "Prepared by Thrive")}</div>
              <h1 className={t.heading} style={headingStyle}>{doc.title}</h1>
              {brand?.tagline && (
                <p className="text-sm opacity-70 mt-2 italic">{brand.tagline}</p>
              )}
            </div>
            {brand?.logo_url && (
              <img src={brand.logo_url} alt={brand.name || "logo"} className="h-12 w-12 object-contain flex-shrink-0" />
            )}
          </div>
          {coverImageUrl && (
            <img src={coverImageUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none -z-10" />
          )}
          <div className="text-xs opacity-60 mt-auto">{authorName || ""}</div>
        </div>
        {accent && (
          <div className="absolute bottom-0 left-0 right-0 h-2 flex">
            <div className="flex-1" style={{ backgroundColor: accent }} />
            {accentSecondary && <div className="flex-1" style={{ backgroundColor: accentSecondary }} />}
          </div>
        )}
      </Slide>

      {doc.slides.map((s, i) => (
        <Slide key={i} className={t.page} aspect>
          <SlideBody slide={s} theme={t} brand={brand} headingStyle={headingStyle} accent={accent} accentStyle={accentStyle} />

          <div className="mt-auto pt-6 flex items-center justify-between text-[10px] opacity-50 uppercase tracking-widest">
            <span className="flex items-center gap-2">
              {brand?.logo_url && <img src={brand.logo_url} alt="" className="h-3 w-3 object-contain opacity-80" />}
              {brand?.name || ""}
            </span>
            <span>{i + 1} / {doc.slides.length}</span>
          </div>
          {accent && (
            <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: accent }} />
          )}
        </Slide>
      ))}
    </div>
  );
}

interface BodyProps {
  slide: DeckSlide;
  theme: typeof DECK_THEMES[DeckTheme];
  brand?: DeckBrandSnapshot;
  headingStyle?: React.CSSProperties;
  accent: string | null;
  accentStyle?: React.CSSProperties;
}

function SlideBody({ slide: s, theme: t, brand, headingStyle, accent, accentStyle }: BodyProps) {
  const layout = s.layout || "standard";

  // Shared header (eyebrow + heading)
  const Header = (
    <>
      {s.eyebrow && <div className={t.eyebrow}>{s.eyebrow}</div>}
      <h2 className={t.heading} style={headingStyle}>{s.heading}</h2>
    </>
  );

  switch (layout) {
    case "hero":
      return (
        <div className="flex flex-col h-full">
          {Header}
          {s.image_prompt && (
            <div className="my-4 aspect-[16/9] bg-muted rounded-md overflow-hidden flex items-center justify-center text-[10px] uppercase tracking-widest opacity-40">
              Hero image
            </div>
          )}
          {s.body && (
            <div className={`prose prose-sm dark:prose-invert max-w-none ${t.body}`}>
              <ReactMarkdown>{s.body}</ReactMarkdown>
            </div>
          )}
          {s.callout && <div className={`mt-6 ${t.callout}`}>{s.callout}</div>}
        </div>
      );

    case "stats": {
      const stats = s.stats || [];
      return (
        <div>
          {Header}
          {s.body && (
            <div className={`prose prose-sm dark:prose-invert max-w-none mb-6 ${t.body}`}>
              <ReactMarkdown>{s.body}</ReactMarkdown>
            </div>
          )}
          <div className={`grid gap-4 ${stats.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            {stats.map((st, i) => (
              <div key={i} className={`p-5 rounded-md border ${t.divider}`}>
                <div className="text-4xl md:text-5xl font-bold tracking-tight" style={accentStyle}>{st.value}</div>
                <div className="text-sm font-semibold mt-1">{st.label}</div>
                {st.sub && <div className="text-xs opacity-60 mt-1">{st.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "two_column": {
      const cols = s.columns || [];
      return (
        <div>
          {Header}
          <div className="grid md:grid-cols-2 gap-6 mt-2">
            {cols.map((c, i) => (
              <div key={i}>
                <h3 className="font-semibold text-base mb-2" style={accentStyle}>{c.heading}</h3>
                {c.body && (
                  <div className={`prose prose-sm dark:prose-invert max-w-none ${t.body}`}>
                    <ReactMarkdown>{c.body}</ReactMarkdown>
                  </div>
                )}
                {c.bullets && (
                  <ul className="mt-2 space-y-1.5">
                    {c.bullets.map((b, j) => (
                      <li key={j} className={`flex gap-2 ${t.bullet}`}><span style={accentStyle}>—</span><span>{b}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "quote": {
      const q = s.quote;
      return (
        <div className="flex flex-col h-full justify-center items-start">
          {s.eyebrow && <div className={t.eyebrow}>{s.eyebrow}</div>}
          <blockquote className="font-serif text-3xl md:text-4xl leading-snug italic max-w-3xl">
            <span className="text-5xl leading-none mr-2 align-top" style={accentStyle}>“</span>
            {q?.text || s.heading}
          </blockquote>
          {q?.attribution && (
            <div className="mt-6 text-sm uppercase tracking-[0.2em] opacity-70">— {q.attribution}</div>
          )}
        </div>
      );
    }

    case "pricing": {
      const pkgs = s.pricing || [];
      return (
        <div>
          {Header}
          <div className={`grid gap-4 mt-2 ${pkgs.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            {pkgs.map((p, i) => (
              <div
                key={i}
                className={`p-5 rounded-md border flex flex-col ${p.highlighted ? "border-2 shadow-md" : ""} ${t.divider}`}
                style={p.highlighted && accent ? { borderColor: accent } : undefined}
              >
                <div className="text-xs uppercase tracking-widest opacity-60">{p.name}</div>
                <div className="text-3xl font-bold mt-2 tracking-tight" style={accentStyle}>{p.price}</div>
                <ul className="mt-4 space-y-1.5 flex-1">
                  {p.includes.map((inc, j) => (
                    <li key={j} className={`text-sm flex gap-2 ${t.bullet}`}><span style={accentStyle}>✓</span><span>{inc}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "roll_call": {
      const people = s.roll_call || [];
      return (
        <div>
          {Header}
          <div className="grid md:grid-cols-2 gap-3 mt-2">
            {people.map((p, i) => (
              <div key={i} className={`flex items-baseline gap-3 py-2 border-b ${t.divider}`}>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs uppercase tracking-widest opacity-60">{p.role}</div>
                {p.note && <div className="text-xs opacity-70 ml-auto">{p.note}</div>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "letterhead_cover": {
      const r = s.recipient || {};
      return (
        <div className="flex flex-col h-full">
          {brand?.logo_url && (
            <div className="flex items-center gap-3 pb-6 border-b border-border">
              <img src={brand.logo_url} alt="" className="h-10 w-10 object-contain" />
              <div>
                <div className="font-semibold">{brand?.name}</div>
                {brand?.tagline && <div className="text-xs opacity-60">{brand.tagline}</div>}
              </div>
            </div>
          )}
          <div className="mt-10 space-y-1 text-sm">
            {r.date && <div className="opacity-70">{r.date}</div>}
            {r.name && <div className="font-semibold pt-4">{r.name}</div>}
            {r.org && <div>{r.org}</div>}
            {r.address && <div className="whitespace-pre-line opacity-80">{r.address}</div>}
          </div>
          {(r.subject || s.heading) && (
            <div className="mt-10 font-semibold">
              <span className="uppercase tracking-widest text-xs opacity-60 mr-2">Re:</span>
              {r.subject || s.heading}
            </div>
          )}
        </div>
      );
    }

    case "letterhead_body":
      return (
        <div>
          {Header}
          {s.body && (
            <div className={`prose prose-base dark:prose-invert max-w-none ${t.body}`}>
              <ReactMarkdown>{s.body}</ReactMarkdown>
            </div>
          )}
          {s.callout && <div className={`mt-6 ${t.callout}`}>{s.callout}</div>}
        </div>
      );

    case "standard":
    default:
      return (
        <>
          {Header}
          {s.body && (
            <div className={`prose prose-sm dark:prose-invert max-w-none ${t.body}`}>
              <ReactMarkdown>{s.body}</ReactMarkdown>
            </div>
          )}
          {s.bullets && s.bullets.length > 0 && (
            <ul className="mt-4 space-y-2">
              {s.bullets.map((b, j) => (
                <li key={j} className={`flex gap-3 ${t.bullet}`}>
                  <span className="opacity-50 mt-1" style={accent ? { color: accent, opacity: 1 } : undefined}>—</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {s.callout && <div className={`mt-6 ${t.callout}`}>{s.callout}</div>}
        </>
      );
  }
}

function Slide({ children, className, aspect }: { children: React.ReactNode; className?: string; aspect?: boolean }) {
  return (
    <div
      className={`relative w-full p-8 md:p-12 flex flex-col ${aspect ? "min-h-[80vh] md:min-h-[600px]" : ""} ${className || ""}`}
      style={{ pageBreakAfter: "always" }}
    >
      {children}
    </div>
  );
}
