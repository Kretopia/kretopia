import { DECK_THEMES, type DeckTheme } from "@/lib/deckThemes";
import ReactMarkdown from "react-markdown";

export interface DeckSlide {
  heading: string;
  eyebrow?: string;
  body?: string;
  bullets?: string[];
  image_prompt?: string;
  callout?: string;
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

/**
 * Renders the entire deck as a stack of A4-ish slides.
 * Used both in the editor preview and on the public share page.
 * When `doc.brand_snapshot` is present we apply the user's brand: logo on
 * cover, palette accent stripe in every footer, brand name in metadata.
 */
export function DeckRenderer({ doc, theme, coverImageUrl, authorName }: Props) {
  const t = DECK_THEMES[theme] || DECK_THEMES.editorial;
  const brand = doc.brand_snapshot;
  const accent = brand?.palette?.[1] || brand?.palette?.[0] || null;
  const accentSecondary = brand?.palette?.[2] || brand?.palette?.[1] || null;
  const headingFont = brand?.fonts?.heading?.trim() || undefined;
  const bodyFont = brand?.fonts?.body?.trim() || undefined;
  const headingStyle = headingFont ? { fontFamily: headingFont } : undefined;
  const bodyStyle = bodyFont ? { fontFamily: bodyFont } : undefined;

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
          {s.eyebrow && <div className={t.eyebrow}>{s.eyebrow}</div>}
          <h2 className={t.heading} style={headingStyle}>{s.heading}</h2>
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

