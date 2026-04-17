/**
 * EPK (Electronic Press Kit) PDF Generator — Cinematic 16:9 Landscape Deck
 * Generates a visually stunning, branded pitch-deck from a creator's profile data.
 * Gated to Creator / Creator+ subscribers.
 */

interface EPKProfileData {
  full_name: string;
  role?: string;
  job_title?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
  website?: string;
  calendly_url?: string;
  linkedin_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  spotify_url?: string;
  behance_url?: string;
  imdb_url?: string;
  soundcloud_url?: string;
  average_rating?: number;
  total_reviews?: number;
  professional_skills?: any;
  passion_skills?: any;
  collab_intent?: string;
  rate_range?: string;
  cover_image_url?: string;
  verification_tier?: string;
  verification_status?: string;
}

interface EPKCredit {
  project_name?: string;
  title?: string;
  role: string;
  year?: number;
  platform?: string;
  isVerified?: boolean;
  verificationTier?: string;
  credit_category?: string;
  thumbnail_url?: string;
}

interface EPKAward {
  title: string;
  organization: string;
  year?: number;
  category?: string;
}

interface EPKPressLink {
  title: string;
  publication?: string;
  url?: string;
}

interface EPKIndustryStat {
  title: string;
  value?: string;
  issuer?: string;
}

interface EPKReview {
  reviewer_name?: string;
  rating: number;
  review_text?: string;
}

export interface EPKPdfInput {
  profile: EPKProfileData;
  credits: EPKCredit[];
  awards: EPKAward[];
  pressLinks: EPKPressLink[];
  industryStats: EPKIndustryStat[];
  reviews: EPKReview[];
}

export interface EPKBrandingOptions {
  primaryColor?: [number, number, number];
  accentColor?: [number, number, number];
  darkColor?: [number, number, number];
  logoUrl?: string;
  tagline?: string;
  templateId?: string;
}

// EPK PDF Template definitions
export type EPKTemplateId = 'cinematic-dark' | 'clean-light' | 'bold-minimal';

export interface EPKTemplate {
  id: EPKTemplateId;
  name: string;
  description: string;
  previewBg: string;
  previewAccent: string;
  previewText: string;
  palette: {
    bg: [number, number, number];
    surface: [number, number, number];
    card: [number, number, number];
    primary: [number, number, number];
    accent: [number, number, number];
    gold: [number, number, number];
    white: [number, number, number];
    muted: [number, number, number];
    dimmed: [number, number, number];
    light: [number, number, number];
  };
}

export const EPK_TEMPLATES: EPKTemplate[] = [
  {
    id: 'cinematic-dark',
    name: 'Cinematic Dark',
    description: 'Night canvas with electric violet & lime accents — bold & creator-first',
    previewBg: 'bg-[#0B0A14]',
    previewAccent: 'bg-[#7B5CFF]',
    previewText: 'text-white',
    palette: {
      bg: [11, 10, 20],
      surface: [21, 19, 42],
      card: [28, 25, 52],
      primary: [123, 92, 255],   // electric violet #7B5CFF
      accent: [212, 255, 77],    // lime energy #D4FF4D
      gold: [212, 255, 77],
      white: [255, 255, 255],
      muted: [150, 145, 180],
      dimmed: [85, 80, 115],
      light: [225, 220, 245],
    },
  },
  {
    id: 'clean-light',
    name: 'Clean Light',
    description: 'Warm white with sage green accents — editorial & elegant',
    previewBg: 'bg-[#FAFAF8]',
    previewAccent: 'bg-[#5A7A64]',
    previewText: 'text-[#1a1a1a]',
    palette: {
      bg: [250, 250, 248],
      surface: [245, 244, 240],
      card: [255, 255, 255],
      primary: [90, 122, 100],
      accent: [70, 100, 80],
      gold: [180, 140, 60],
      white: [26, 26, 26],       // inverted: text is dark
      muted: [120, 120, 115],
      dimmed: [180, 178, 172],
      light: [60, 58, 55],
    },
  },
  {
    id: 'bold-minimal',
    name: 'Bold Minimal',
    description: 'Pure black with electric red accents — striking & modern',
    previewBg: 'bg-black',
    previewAccent: 'bg-[#FF2D2D]',
    previewText: 'text-white',
    palette: {
      bg: [0, 0, 0],
      surface: [15, 15, 15],
      card: [24, 24, 24],
      primary: [255, 45, 45],
      accent: [255, 80, 80],
      gold: [255, 200, 60],
      white: [255, 255, 255],
      muted: [130, 130, 130],
      dimmed: [70, 70, 70],
      light: [210, 210, 210],
    },
  },
];

export function getEPKTemplate(id?: string): EPKTemplate {
  return EPK_TEMPLATES.find(t => t.id === id) || EPK_TEMPLATES[0];
}

// 16:9 landscape dimensions in mm
const PAGE_W = 338;
const PAGE_H = 190;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Brand palette — Electric Violet + Lime (ThriveIN 2026)
const BRAND = {
  bg: [11, 10, 20] as [number, number, number],
  surface: [21, 19, 42] as [number, number, number],
  card: [28, 25, 52] as [number, number, number],
  primary: [123, 92, 255] as [number, number, number],   // electric violet #7B5CFF
  accent: [212, 255, 77] as [number, number, number],    // lime #D4FF4D
  gold: [212, 255, 77] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  muted: [150, 145, 180] as [number, number, number],
  dimmed: [85, 80, 115] as [number, number, number],
  light: [225, 220, 245] as [number, number, number],
};

function decodeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawRoundedRect(doc: any, x: number, y: number, w: number, h: number, r: number) {
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

function truncateText(doc: any, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  while (text.length > 0 && doc.getTextWidth(text + '...') > maxWidth) {
    text = text.slice(0, -1);
  }
  return text + '...';
}

export async function generateEPKPdf(input: EPKPdfInput, brandingOptions?: EPKBrandingOptions): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [PAGE_W, PAGE_H] });

  // Resolve template palette first, then allow branding overrides
  const tpl = getEPKTemplate(brandingOptions?.templateId);

  const C = {
    bg: brandingOptions?.darkColor || tpl.palette.bg,
    surface: tpl.palette.surface,
    card: tpl.palette.card,
    primary: brandingOptions?.primaryColor || tpl.palette.primary,
    accent: brandingOptions?.accentColor || tpl.palette.accent,
    gold: tpl.palette.gold,
    white: tpl.palette.white,
    muted: tpl.palette.muted,
    dimmed: BRAND.dimmed,
    light: BRAND.light,
  };

  const { profile, credits, awards, pressLinks, industryStats, reviews } = input;
  let pageNum = 0;

  // ── Helpers ──────────────────────────────────────────────
  const fillPage = () => {
    doc.setFillColor(...C.bg);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  };

  const drawFooter = (num: number, total: number) => {
    // Thin accent line
    doc.setFillColor(...C.primary);
    doc.rect(0, PAGE_H - 8, PAGE_W, 0.4, 'F');
    // Brand name
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.dimmed);
    doc.text('thrivein.io', MARGIN, PAGE_H - 3.5);
    // Page number
    doc.text(`${num} / ${total}`, PAGE_W - MARGIN, PAGE_H - 3.5, { align: 'right' });
  };

  const newPage = () => {
    doc.addPage([PAGE_W, PAGE_H], 'landscape');
    pageNum++;
    fillPage();
  };

  const drawSectionTitle = (title: string, x: number, y: number) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.primary);
    doc.text(title.toUpperCase(), x, y);
    // Underline
    const tw = doc.getTextWidth(title.toUpperCase());
    doc.setFillColor(...C.primary);
    doc.rect(x, y + 1.2, tw, 0.4, 'F');
  };

  // Pre-load avatar
  let avatarData: string | null = null;
  if (profile.avatar_url) {
    avatarData = await loadImageAsDataUrl(profile.avatar_url);
  }

  // Pre-load cover image
  let coverData: string | null = null;
  if (profile.cover_image_url) {
    coverData = await loadImageAsDataUrl(profile.cover_image_url);
  }

  // ════════════════════════════════════════════════════════════
  // SLIDE 1: COVER / HERO
  // ════════════════════════════════════════════════════════════
  pageNum = 1;
  fillPage();

  // Full background cover image with overlay
  if (coverData) {
    doc.addImage(coverData, 'JPEG', 0, 0, PAGE_W, PAGE_H);
    // Dark overlay for readability
    doc.setGState(new (doc as any).GState({ opacity: 0.75 }));
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  }

  // Gradient accent bar at top
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, PAGE_W, 1.5, 'F');

  // Left column: Avatar + Info
  const heroLeftX = MARGIN + 10;
  const heroCenterY = PAGE_H / 2;

  // Avatar
  const avatarSize = 44;
  const avatarY = heroCenterY - 30;
  if (avatarData) {
    // Background ring
    doc.setFillColor(...C.primary);
    drawRoundedRect(doc, heroLeftX - 1.5, avatarY - 1.5, avatarSize + 3, avatarSize + 3, 6);
    doc.addImage(avatarData, 'JPEG', heroLeftX, avatarY, avatarSize, avatarSize);
  }

  // Name
  const nameY = avatarY + avatarSize + 14;
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text(profile.full_name || 'Creator', heroLeftX, nameY);

  // Role
  const displayRole = profile.job_title || profile.role || 'Creative Professional';
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.primary);
  doc.text(displayRole, heroLeftX, nameY + 10);

  // Location + Verification
  let metaY = nameY + 19;
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  if (profile.location) {
    doc.text(profile.location, heroLeftX, metaY);
    metaY += 6;
  }
  if (profile.verification_tier || profile.verification_status === 'verified') {
    doc.setTextColor(...C.gold);
    doc.setFont("helvetica", "bold");
    const badge = profile.verification_tier === 'elite' ? 'Elite Verified'
                : profile.verification_tier === 'industry' ? 'Industry Verified'
                : 'Verified Creator';
    doc.text(badge, heroLeftX, metaY);
  }

  // Right side: Quick stats cards
  const statsX = PAGE_W / 2 + 30;
  const statsY = heroCenterY - 15;
  const statItems: { label: string; value: string }[] = [];
  if (credits.length > 0) statItems.push({ label: 'Credits', value: String(credits.length) });
  const verifiedCount = credits.filter(c => c.isVerified).length;
  if (verifiedCount > 0) statItems.push({ label: 'Verified', value: String(verifiedCount) });
  if (awards.length > 0) statItems.push({ label: 'Awards', value: String(awards.length) });
  if (profile.average_rating) statItems.push({ label: 'Rating', value: profile.average_rating.toFixed(1) });

  statItems.slice(0, 4).forEach((stat, i) => {
    const sx = statsX + i * 36;
    doc.setFillColor(...C.card);
    drawRoundedRect(doc, sx, statsY, 32, 30, 4);
    // Value
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.primary);
    doc.text(stat.value, sx + 16, statsY + 14, { align: 'center' });
    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(stat.label, sx + 16, statsY + 22, { align: 'center' });
  });

  // ════════════════════════════════════════════════════════════
  // SLIDE 2: ABOUT + SKILLS
  // ════════════════════════════════════════════════════════════
  newPage();

  // Left half: About
  const aboutX = MARGIN;
  let aboutY = MARGIN + 5;
  drawSectionTitle('About', aboutX, aboutY);
  aboutY += 10;

  if (profile.bio) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.light);
    const bioLines = doc.splitTextToSize(profile.bio, CONTENT_W / 2 - 10);
    doc.text(bioLines.slice(0, 12), aboutX, aboutY);
    aboutY += Math.min(bioLines.length, 12) * 5 + 8;
  }

  // Availability
  if (profile.collab_intent || profile.rate_range) {
    drawSectionTitle('Availability', aboutX, aboutY);
    aboutY += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.light);
    if (profile.collab_intent) {
      doc.text(`Open to: ${profile.collab_intent.replace(/_/g, ' ')}`, aboutX, aboutY);
      aboutY += 5.5;
    }
    if (profile.rate_range) {
      doc.text(`Rate: ${profile.rate_range}`, aboutX, aboutY);
      aboutY += 5.5;
    }
  }

  // Right half: Skills
  const skillsX = PAGE_W / 2 + 10;
  let skillsY = MARGIN + 5;
  
  const allSkills: string[] = [
    ...(Array.isArray(profile.professional_skills)
      ? profile.professional_skills.map((s: any) => typeof s === 'string' ? s : s?.skill || s?.name).filter(Boolean)
      : []),
    ...(Array.isArray(profile.passion_skills)
      ? profile.passion_skills.map((s: any) => typeof s === 'string' ? s : s?.skill || s?.name).filter(Boolean)
      : [])
  ];

  if (allSkills.length > 0) {
    drawSectionTitle('Skills & Expertise', skillsX, skillsY);
    skillsY += 10;

    // Skill chips in a grid
    let chipX = skillsX;
    let chipY = skillsY;
    const chipMaxX = PAGE_W - MARGIN;
    const chipH = 8;
    const chipPadX = 4;
    const chipGap = 3;

    allSkills.slice(0, 18).forEach((skill) => {
      doc.setFontSize(7.5);
      const tw = doc.getTextWidth(skill);
      const chipW = tw + chipPadX * 2;

      if (chipX + chipW > chipMaxX) {
        chipX = skillsX;
        chipY += chipH + chipGap;
      }

      doc.setFillColor(...C.card);
      drawRoundedRect(doc, chipX, chipY, chipW, chipH, 3);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.light);
      doc.text(skill, chipX + chipPadX, chipY + 5.5);

      chipX += chipW + chipGap;
    });
    skillsY = chipY + chipH + 12;
  }

  // Social/Contact links on the right column below skills
  const contactLinks: { label: string; url: string }[] = [];
  if (profile.website) contactLinks.push({ label: 'Website', url: profile.website });
  if (profile.linkedin_url) contactLinks.push({ label: 'LinkedIn', url: profile.linkedin_url });
  if (profile.instagram_url) contactLinks.push({ label: 'Instagram', url: profile.instagram_url });
  if (profile.youtube_url) contactLinks.push({ label: 'YouTube', url: profile.youtube_url });
  if (profile.spotify_url) contactLinks.push({ label: 'Spotify', url: profile.spotify_url });
  if (profile.twitter_url) contactLinks.push({ label: 'X (Twitter)', url: profile.twitter_url });
  if (profile.behance_url) contactLinks.push({ label: 'Behance', url: profile.behance_url });
  if (profile.imdb_url) contactLinks.push({ label: 'IMDb', url: profile.imdb_url });
  if (profile.soundcloud_url) contactLinks.push({ label: 'SoundCloud', url: profile.soundcloud_url });
  if (profile.calendly_url) contactLinks.push({ label: 'Book a Call', url: profile.calendly_url });

  if (contactLinks.length > 0) {
    drawSectionTitle('Connect', skillsX, skillsY);
    skillsY += 8;
    doc.setFontSize(8);
    contactLinks.slice(0, 8).forEach((link) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.primary);
      doc.text(link.label, skillsX, skillsY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.muted);
      const labelW = doc.getTextWidth(link.label);
      const urlTrunc = truncateText(doc, link.url, CONTENT_W / 2 - labelW - 15);
      doc.text(`  ${urlTrunc}`, skillsX + labelW, skillsY);
      // Make clickable
      doc.link(skillsX, skillsY - 3, CONTENT_W / 2, 5, { url: link.url });
      skillsY += 6;
    });
  }

  // ════════════════════════════════════════════════════════════
  // SLIDE 3+: CREDITS (Visual Cards)
  // ════════════════════════════════════════════════════════════
  if (credits.length > 0) {
    const CARDS_PER_ROW = 4;
    const ROWS_PER_PAGE = 2;
    const CARDS_PER_PAGE = CARDS_PER_ROW * ROWS_PER_PAGE;
    const cardGap = 6;
    const totalCardW = (CONTENT_W - (CARDS_PER_ROW - 1) * cardGap) / CARDS_PER_ROW;
    const cardH = (PAGE_H - MARGIN * 2 - 18 - cardGap) / ROWS_PER_PAGE;
    const displayCredits = credits.slice(0, 24);

    for (let pageIdx = 0; pageIdx < Math.ceil(displayCredits.length / CARDS_PER_PAGE); pageIdx++) {
      newPage();
      const pageCredits = displayCredits.slice(pageIdx * CARDS_PER_PAGE, (pageIdx + 1) * CARDS_PER_PAGE);

      // Section header
      if (pageIdx === 0) {
        drawSectionTitle(`Selected Work  —  ${credits.length} Credits`, MARGIN, MARGIN + 5);
      } else {
        drawSectionTitle('Selected Work (continued)', MARGIN, MARGIN + 5);
      }

      const startY = MARGIN + 14;

      pageCredits.forEach((credit, i) => {
        const row = Math.floor(i / CARDS_PER_ROW);
        const col = i % CARDS_PER_ROW;
        const cx = MARGIN + col * (totalCardW + cardGap);
        const cy = startY + row * (cardH + cardGap);

        // Card background
        doc.setFillColor(...C.card);
        drawRoundedRect(doc, cx, cy, totalCardW, cardH, 4);

        // Visual area (top 55% of card)
        const visualH = cardH * 0.55;
        const categoryColors: Record<string, [number, number, number]> = {
          film: [30, 25, 65],
          music: [50, 20, 35],
          tv: [20, 30, 55],
          podcast: [20, 45, 35],
          photography: [45, 30, 20],
          video: [45, 18, 22],
          design: [20, 40, 50],
          writing: [40, 35, 20],
        };
        const catKey = (credit.credit_category || '').toLowerCase();
        const catColor = Object.entries(categoryColors).find(([k]) => catKey.includes(k))?.[1] || [25, 23, 38];
        doc.setFillColor(...catColor);
        // Top rounded corners only — draw full rounded rect then cover bottom
        drawRoundedRect(doc, cx, cy, totalCardW, visualH + 4, 4);

        // Credit name in visual area
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.white);
        const creditName = decodeHtml(credit.project_name || credit.title || '');
        const nameLines = doc.splitTextToSize(creditName, totalCardW - 10);
        doc.text(nameLines.slice(0, 2), cx + 5, cy + visualH / 2 - 2);

        // Verified badge in visual area
        if (credit.isVerified) {
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...C.gold);
          doc.text('VERIFIED', cx + totalCardW - 5, cy + 6, { align: 'right' });
        }

        // Info area (bottom 45%)
        const infoY = cy + visualH + 4;
        
        // Role
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.light);
        const roleTrunc = truncateText(doc, credit.role, totalCardW - 10);
        doc.text(roleTrunc, cx + 5, infoY + 4);

        // Year + Platform
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.muted);
        const meta = [credit.year, credit.platform].filter(Boolean).join(' · ');
        if (meta) {
          doc.text(meta, cx + 5, infoY + 10);
        }

        // Category pill
        if (credit.credit_category) {
          const pillY = infoY + 15;
          doc.setFontSize(5.5);
          const catText = credit.credit_category.toUpperCase();
          const catTw = doc.getTextWidth(catText);
          doc.setFillColor(...C.surface);
          drawRoundedRect(doc, cx + 5, pillY - 3, catTw + 6, 5.5, 2);
          doc.setTextColor(...C.muted);
          doc.text(catText, cx + 8, pillY);
        }
      });
    }
  }

  // ════════════════════════════════════════════════════════════
  // SLIDE: AWARDS & PRESS
  // ════════════════════════════════════════════════════════════
  if (awards.length > 0 || pressLinks.length > 0) {
    newPage();

    // Left: Awards
    if (awards.length > 0) {
      let ax = MARGIN;
      let ay = MARGIN + 5;
      drawSectionTitle(`Awards & Recognition`, ax, ay);
      ay += 10;

      awards.slice(0, 6).forEach((award) => {
        // Award card
        doc.setFillColor(...C.card);
        drawRoundedRect(doc, ax, ay, CONTENT_W / 2 - 10, 18, 3);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.gold);
        doc.text(truncateText(doc, award.title, CONTENT_W / 2 - 25), ax + 5, ay + 7);

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.muted);
        const awardMeta = [award.organization, award.year, award.category].filter(Boolean).join(' · ');
        doc.text(truncateText(doc, awardMeta, CONTENT_W / 2 - 25), ax + 5, ay + 13);
        ay += 22;
      });
    }

    // Right: Press
    if (pressLinks.length > 0) {
      let px = PAGE_W / 2 + 10;
      let py = MARGIN + 5;
      drawSectionTitle('Featured In', px, py);
      py += 10;

      pressLinks.slice(0, 6).forEach((press) => {
        doc.setFillColor(...C.card);
        drawRoundedRect(doc, px, py, CONTENT_W / 2 - 10, 18, 3);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.white);
        doc.text(truncateText(doc, decodeHtml(press.title), CONTENT_W / 2 - 25), px + 5, py + 7);

        if (press.publication) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(...C.muted);
          doc.text(press.publication, px + 5, py + 13);
        }

        // Clickable link
        if (press.url) {
          doc.link(px, py, CONTENT_W / 2 - 10, 18, { url: press.url });
        }
        py += 22;
      });
    }
  }

  // ════════════════════════════════════════════════════════════
  // SLIDE: TESTIMONIALS
  // ════════════════════════════════════════════════════════════
  if (reviews.length > 0) {
    newPage();

    drawSectionTitle('Client Testimonials', MARGIN, MARGIN + 5);

    const reviewCards = reviews.slice(0, 4);
    const cardW = (CONTENT_W - 8) / 2;
    const reviewCardH = 60;

    reviewCards.forEach((review, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const rx = MARGIN + col * (cardW + 8);
      const ry = MARGIN + 16 + row * (reviewCardH + 8);

      doc.setFillColor(...C.card);
      drawRoundedRect(doc, rx, ry, cardW, reviewCardH, 4);

      // Stars
      const stars = '★'.repeat(Math.round(review.rating));
      doc.setFontSize(11);
      doc.setTextColor(...C.gold);
      doc.text(stars, rx + 8, ry + 10);

      // Reviewer name
      if (review.reviewer_name) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.primary);
        doc.text(review.reviewer_name, rx + 8, ry + 18);
      }

      // Review text
      if (review.review_text) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...C.light);
        const rLines = doc.splitTextToSize(`"${review.review_text}"`, cardW - 16);
        doc.text(rLines.slice(0, 5), rx + 8, ry + 26);
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // SLIDE: CREDENTIALS & STATS
  // ════════════════════════════════════════════════════════════
  if (industryStats.length > 0) {
    newPage();

    drawSectionTitle('Credentials & Industry Stats', MARGIN, MARGIN + 5);

    const statCards = industryStats.slice(0, 8);
    const statCardW = (CONTENT_W - 8 * 3) / 4;
    const statCardH = 35;

    statCards.forEach((stat, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const sx = MARGIN + col * (statCardW + 8);
      const sy = MARGIN + 16 + row * (statCardH + 8);

      doc.setFillColor(...C.card);
      drawRoundedRect(doc, sx, sy, statCardW, statCardH, 4);

      // Value
      if (stat.value) {
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.primary);
        doc.text(stat.value, sx + statCardW / 2, sy + 14, { align: 'center' });
      }

      // Title
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.light);
      const titleLines = doc.splitTextToSize(stat.title, statCardW - 8);
      doc.text(titleLines.slice(0, 2), sx + statCardW / 2, sy + 22, { align: 'center' });

      // Issuer
      if (stat.issuer) {
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.muted);
        doc.text(truncateText(doc, stat.issuer, statCardW - 8), sx + statCardW / 2, sy + 29, { align: 'center' });
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // FINAL SLIDE: Contact CTA
  // ════════════════════════════════════════════════════════════
  newPage();
  
  // Centered CTA
  const ctaCenterY = PAGE_H / 2 - 10;

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("Let's Create Together", PAGE_W / 2, ctaCenterY, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.muted);
  doc.text(profile.full_name || '', PAGE_W / 2, ctaCenterY + 12, { align: 'center' });

  const ctaRole = profile.job_title || profile.role || '';
  if (ctaRole) {
    doc.setTextColor(...C.primary);
    doc.text(ctaRole, PAGE_W / 2, ctaCenterY + 20, { align: 'center' });
  }

  // EPK link as clickable button
  const epkUrl = `https://thrivein.io/epk/${encodeURIComponent(profile.full_name?.toLowerCase().replace(/\s+/g, '-') || 'creator')}`;
  const btnW = 70;
  const btnH = 10;
  const btnX = PAGE_W / 2 - btnW / 2;
  const btnY = ctaCenterY + 30;
  doc.setFillColor(...C.primary);
  drawRoundedRect(doc, btnX, btnY, btnW, btnH, 4);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text('View Full EPK', PAGE_W / 2, btnY + 6.5, { align: 'center' });
  doc.link(btnX, btnY, btnW, btnH, { url: epkUrl });

  // Contact links below
  let ctaLinkY = btnY + 18;
  const ctaLinks: string[] = [];
  if (profile.website) ctaLinks.push(profile.website);
  if (profile.calendly_url) ctaLinks.push(profile.calendly_url);
  if (profile.linkedin_url) ctaLinks.push(profile.linkedin_url);
  if (profile.instagram_url) ctaLinks.push(profile.instagram_url);

  if (ctaLinks.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.dimmed);
    ctaLinks.slice(0, 3).forEach((link) => {
      doc.text(link, PAGE_W / 2, ctaLinkY, { align: 'center' });
      doc.link(PAGE_W / 2 - 50, ctaLinkY - 3, 100, 5, { url: link });
      ctaLinkY += 6;
    });
  }

  // ════════════════════════════════════════════════════════════
  // FOOTERS — Apply to all pages
  // ════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Custom branding logo
    if (brandingOptions?.logoUrl) {
      try {
        const logoData = await loadImageAsDataUrl(brandingOptions.logoUrl);
        if (logoData) {
          doc.addImage(logoData, 'PNG', PAGE_W - MARGIN - 10, PAGE_H - 9, 8, 8);
        }
      } catch {}
    }

    drawFooter(i, totalPages);
  }

  // Save
  const safeName = (profile.full_name || 'creator').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${safeName}_EPK.pdf`);
}
