/**
 * EPK (Electronic Press Kit) PDF Generator
 * Generates a professional, branded PDF deck from a creator's profile data.
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
}

interface EPKAward {
  title: string;
  organization: string;
  year?: number;
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

// Brand colors
const BRAND = {
  primary: [139, 92, 246] as [number, number, number],    // violet
  dark: [30, 27, 45] as [number, number, number],          // near-black
  white: [255, 255, 255] as [number, number, number],
  muted: [148, 148, 160] as [number, number, number],
  light: [245, 243, 255] as [number, number, number],
  accent: [168, 130, 255] as [number, number, number],
};

const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

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

export interface EPKBrandingOptions {
  primaryColor?: [number, number, number];
  accentColor?: [number, number, number];
  darkColor?: [number, number, number];
  logoUrl?: string;
  tagline?: string;
}

export async function generateEPKPdf(input: EPKPdfInput, brandingOptions?: EPKBrandingOptions): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Apply custom branding if provided
  const COLORS = {
    primary: brandingOptions?.primaryColor || BRAND.primary,
    dark: brandingOptions?.darkColor || BRAND.dark,
    accent: brandingOptions?.accentColor || BRAND.accent,
    white: BRAND.white,
    muted: BRAND.muted,
    light: BRAND.light,
  };

  const { profile, credits, awards, pressLinks, industryStats, reviews } = input;
  let y = 0;

  // Helper: add new page
  const newPage = () => {
    doc.addPage();
    y = MARGIN;
  };

  // Helper: check page break
  const checkPageBreak = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      newPage();
      return true;
    }
    return false;
  };

  // Helper: draw section header
  const drawSectionHeader = (title: string) => {
    checkPageBreak(20);
    y += 6;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.primary);
    doc.text(title.toUpperCase(), MARGIN, y);
    y += 2;
    doc.setDrawColor(...BRAND.primary);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, MARGIN + 30, y);
    y += 6;
  };

  // ============================================================
  // PAGE 1: Cover / Hero
  // ============================================================
  
  // Dark header band
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, PAGE_W, 120, 'F');

  // Accent line
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 120, PAGE_W, 3, 'F');

  // Avatar (circular placeholder — draw a circle, try to embed image)
  const avatarSize = 36;
  const avatarX = PAGE_W / 2;
  const avatarY = 45;
  
  if (profile.avatar_url) {
    const avatarData = await loadImageAsDataUrl(profile.avatar_url);
    if (avatarData) {
      // Clip circle effect — draw image then overlay ring
      doc.addImage(avatarData, 'JPEG', avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    }
  }
  // Circle border around avatar
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(1.5);
  doc.circle(avatarX, avatarY, avatarSize / 2);

  // Name
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.white);
  doc.text(profile.full_name || 'Creator', PAGE_W / 2, 78, { align: 'center' });

  // Title
  const displayRole = profile.job_title || profile.role || 'Creative Professional';
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.accent);
  doc.text(displayRole, PAGE_W / 2, 88, { align: 'center' });

  // Location
  if (profile.location) {
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.muted);
    doc.text(`📍 ${profile.location}`, PAGE_W / 2, 97, { align: 'center' });
  }

  // Verification badge
  if (profile.verification_tier || profile.verification_status === 'verified') {
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.accent);
    const badge = profile.verification_tier === 'elite' ? '✦ Elite Verified' 
                : profile.verification_tier === 'industry' ? '✦ Industry Verified' 
                : '✓ Verified Creator';
    doc.text(badge, PAGE_W / 2, 106, { align: 'center' });
  }

  // Bio section
  y = 133;
  if (profile.bio) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 70);
    const bioLines = doc.splitTextToSize(profile.bio, CONTENT_W);
    doc.text(bioLines, MARGIN, y);
    y += bioLines.length * 5 + 6;
  }

  // Quick stats row
  const statsRow: string[] = [];
  if (credits.length > 0) statsRow.push(`${credits.length} Credits`);
  if (credits.filter(c => c.isVerified).length > 0) statsRow.push(`${credits.filter(c => c.isVerified).length} Verified`);
  if (awards.length > 0) statsRow.push(`${awards.length} Awards`);
  if (profile.average_rating) statsRow.push(`⭐ ${profile.average_rating.toFixed(1)} Rating`);
  if (profile.total_reviews) statsRow.push(`${profile.total_reviews} Reviews`);
  
  if (statsRow.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.primary);
    doc.text(statsRow.join('  •  '), PAGE_W / 2, y, { align: 'center' });
    y += 10;
  }

  // Contact & Social Links
  const contactLines: string[] = [];
  if (profile.website) contactLines.push(`🌐 ${profile.website}`);
  if (profile.linkedin_url) contactLines.push(`LinkedIn: ${profile.linkedin_url}`);
  if (profile.instagram_url) contactLines.push(`Instagram: ${profile.instagram_url}`);
  if (profile.youtube_url) contactLines.push(`YouTube: ${profile.youtube_url}`);
  if (profile.spotify_url) contactLines.push(`Spotify: ${profile.spotify_url}`);
  if (profile.twitter_url) contactLines.push(`X: ${profile.twitter_url}`);
  if (profile.behance_url) contactLines.push(`Behance: ${profile.behance_url}`);
  if (profile.imdb_url) contactLines.push(`IMDb: ${profile.imdb_url}`);
  if (profile.soundcloud_url) contactLines.push(`SoundCloud: ${profile.soundcloud_url}`);
  if (profile.calendly_url) contactLines.push(`📅 Book a call: ${profile.calendly_url}`);

  if (contactLines.length > 0) {
    drawSectionHeader('Contact & Links');
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 70);
    contactLines.forEach(line => {
      checkPageBreak(6);
      doc.text(line, MARGIN, y);
      y += 5;
    });
    y += 4;
  }

  // Skills
  const allSkills: string[] = [
    ...(Array.isArray(profile.professional_skills) 
      ? profile.professional_skills.map((s: any) => typeof s === 'string' ? s : s?.skill || s?.name).filter(Boolean)
      : []),
    ...(Array.isArray(profile.passion_skills) 
      ? profile.passion_skills.map((s: any) => typeof s === 'string' ? s : s?.skill || s?.name).filter(Boolean)
      : [])
  ];

  if (allSkills.length > 0) {
    drawSectionHeader('Skills & Expertise');
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 70);
    const skillsText = allSkills.slice(0, 20).join('  •  ');
    const skillLines = doc.splitTextToSize(skillsText, CONTENT_W);
    doc.text(skillLines, MARGIN, y);
    y += skillLines.length * 5 + 4;
  }

  // Availability
  if (profile.collab_intent || profile.rate_range) {
    drawSectionHeader('Availability');
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 70);
    if (profile.collab_intent) {
      doc.text(`Looking for: ${profile.collab_intent.replace(/_/g, ' ')}`, MARGIN, y);
      y += 5;
    }
    if (profile.rate_range) {
      doc.text(`Rate: ${profile.rate_range}`, MARGIN, y);
      y += 5;
    }
    y += 4;
  }

  // ============================================================
  // CREDITS (Work History)
  // ============================================================
  if (credits.length > 0) {
    checkPageBreak(30);
    drawSectionHeader(`Work History — ${credits.length} Credits`);
    
    credits.slice(0, 30).forEach((credit) => {
      checkPageBreak(12);
      const name = decodeHtml(credit.project_name || credit.title || '');
      const verifiedTag = credit.isVerified ? ' ✓' : '';
      
      // Project name
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);
      doc.text(`${name}${verifiedTag}`, MARGIN, y);
      
      // Year on the right
      if (credit.year) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND.muted);
        doc.text(String(credit.year), PAGE_W - MARGIN, y, { align: 'right' });
      }
      y += 5;

      // Role & platform
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 90);
      const roleText = credit.platform ? `${credit.role} • ${credit.platform}` : credit.role;
      doc.text(roleText, MARGIN, y);
      y += 7;
    });
  }

  // ============================================================
  // PRESS & AWARDS
  // ============================================================
  if (pressLinks.length > 0) {
    checkPageBreak(20);
    drawSectionHeader('Featured In');
    
    pressLinks.slice(0, 8).forEach((press) => {
      checkPageBreak(10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);
      doc.text(decodeHtml(press.title), MARGIN, y);
      y += 5;
      if (press.publication) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...BRAND.muted);
        doc.text(press.publication, MARGIN, y);
        y += 5;
      }
      y += 3;
    });
  }

  if (awards.length > 0) {
    checkPageBreak(20);
    drawSectionHeader('Awards & Recognition');
    
    awards.slice(0, 8).forEach((award) => {
      checkPageBreak(10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.dark);
      doc.text(`🏆 ${award.title}`, MARGIN, y);
      y += 5;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.muted);
      doc.text(`${award.organization}${award.year ? ` • ${award.year}` : ''}`, MARGIN, y);
      y += 7;
    });
  }

  // ============================================================
  // CREDENTIALS & STATS
  // ============================================================
  if (industryStats.length > 0) {
    checkPageBreak(20);
    drawSectionHeader('Credentials & Stats');
    
    industryStats.slice(0, 10).forEach((stat) => {
      checkPageBreak(10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.primary);
      doc.text(stat.value || '', MARGIN, y);
      const valueWidth = stat.value ? doc.getTextWidth(stat.value) + 3 : 0;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.dark);
      doc.text(stat.title, MARGIN + valueWidth, y);
      y += 5;
      if (stat.issuer) {
        doc.setFontSize(8);
        doc.setTextColor(...BRAND.muted);
        doc.text(stat.issuer, MARGIN, y);
        y += 4;
      }
      y += 3;
    });
  }

  // ============================================================
  // REVIEWS / TESTIMONIALS
  // ============================================================
  if (reviews.length > 0) {
    checkPageBreak(25);
    drawSectionHeader('Client Reviews');
    
    reviews.slice(0, 5).forEach((review) => {
      checkPageBreak(20);
      // Stars
      const stars = '★'.repeat(Math.round(review.rating)) + '☆'.repeat(5 - Math.round(review.rating));
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.primary);
      doc.text(stars, MARGIN, y);
      if (review.reviewer_name) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND.dark);
        doc.text(`— ${review.reviewer_name}`, MARGIN + doc.getTextWidth(stars) + 3, y);
      }
      y += 5;
      if (review.review_text) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(80, 80, 90);
        const reviewLines = doc.splitTextToSize(`"${review.review_text}"`, CONTENT_W);
        doc.text(reviewLines.slice(0, 4), MARGIN, y);
        y += Math.min(reviewLines.length, 4) * 5 + 4;
      }
      y += 2;
    });
  }

  // ============================================================
  // FOOTER on every page
  // ============================================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Bottom accent line
    doc.setFillColor(...BRAND.primary);
    doc.rect(0, PAGE_H - 12, PAGE_W, 12, 'F');
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.white);
    doc.text(`${profile.full_name} — EPK  •  thrivein.io/epk/${encodeURIComponent(profile.full_name?.toLowerCase().replace(/\s+/g, '-') || 'creator')}`, PAGE_W / 2, PAGE_H - 5, { align: 'center' });
    // Page number
    doc.setFontSize(7);
    doc.text(`${i} / ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 5, { align: 'right' });
  }

  // Save
  const safeName = (profile.full_name || 'creator').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${safeName}_EPK.pdf`);
}
