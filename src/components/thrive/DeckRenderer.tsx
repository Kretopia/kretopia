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

export interface DeckContent {
  title: string;
  subtitle?: string;
  cover_prompt?: string;
  slides: DeckSlide[];
  next_steps?: string[];
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
 */
export function DeckRenderer({ doc, theme, coverImageUrl, authorName }: Props) {
  const t = DECK_THEMES[theme] || DECK_THEMES.editorial;

  return (
    <div id="thrive-deck-root" className={`flex flex-col gap-6 ${t.font}`}>
      {/* Cover */}
      <Slide className={`${t.page} ${t.cover}`} aspect>
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className={t.eyebrow}>{doc.subtitle || "Prepared by Thrive"}</div>
            <h1 className={t.heading}>{doc.title}</h1>
          </div>
          {coverImageUrl && (
            <img src={coverImageUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
          )}
          <div className="text-xs opacity-60 mt-auto relative z-10">{authorName || ""}</div>
        </div>
      </Slide>

      {doc.slides.map((s, i) => (
        <Slide key={i} className={t.page} aspect>
          {s.eyebrow && <div className={t.eyebrow}>{s.eyebrow}</div>}
          <h2 className={t.heading}>{s.heading}</h2>
          {s.body && (
            <div className={`prose prose-sm dark:prose-invert max-w-none ${t.body}`}>
              <ReactMarkdown>{s.body}</ReactMarkdown>
            </div>
          )}
          {s.bullets && s.bullets.length > 0 && (
            <ul className="mt-4 space-y-2">
              {s.bullets.map((b, j) => (
                <li key={j} className={`flex gap-3 ${t.bullet}`}>
                  <span className="opacity-50 mt-1">—</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {s.callout && <div className={`mt-6 ${t.callout}`}>{s.callout}</div>}
          <div className="mt-auto pt-6 text-[10px] opacity-50 uppercase tracking-widest">
            {i + 1} / {doc.slides.length}
          </div>
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
