import { useId } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getRoleStampCategory, ROLE_STAMP_LABEL, type RoleStampCategory } from "@/lib/passport/roleStamp";
import { WREATH_STEM_D, WREATH_LEAVES_D, RIBBON_D, CATEGORY_ICON_PATHS } from "@/lib/passport/roleStampCrest";

interface RoleStampProps {
  role?: string | null;
  subRoles?: string[] | null;
  /** Pixel diameter of the stamp. */
  size?: number;
  className?: string;
}

/**
 * The gold metallic Passport seal -- replaces the old "L1" numeric level
 * badge, and its own earlier flat icon-on-gradient-circle look (a generic
 * app badge, not an actual stamp). Now an engraved laurel-wreath medallion
 * in the spirit of a national passport crest: fine gold line, a laurel
 * wreath framing a central craft emblem, a "K" monogram in place of a
 * country's initials. One consistent look per craft (see roleStamp.ts),
 * not level-gated -- the point is "what you do", not a gamified rank.
 * Pure SVG (see roleStampCrest.ts for the wreath/icon geometry) so it
 * stays crisp at every size, from a 20px grid-card corner to a 56px
 * Passport hero badge.
 */
export function RoleStamp({ role, subRoles, size = 32, className }: RoleStampProps) {
  const category = getRoleStampCategory({ role, sub_roles: subRoles });
  const label = ROLE_STAMP_LABEL[category];
  const iconD = CATEGORY_ICON_PATHS[category];
  const gid = useId();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden focusable="false">
            <defs>
              <radialGradient id={`${gid}-bg`} cx="32%" cy="26%" r="78%">
                <stop offset="0%" stopColor="#FDE9AE" />
                <stop offset="22%" stopColor="#F3C543" />
                <stop offset="58%" stopColor="#CE8B18" />
                <stop offset="100%" stopColor="#7A4B0C" />
              </radialGradient>
              <linearGradient id={`${gid}-line`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6B4310" />
                <stop offset="100%" stopColor="#3A2205" />
              </linearGradient>
            </defs>

            <circle cx="100" cy="100" r="92" fill={`url(#${gid}-bg)`} stroke="#5C3A0A" strokeWidth="2.5" />
            <circle cx="100" cy="100" r="82" fill="none" stroke={`url(#${gid}-line)`} strokeWidth="1" opacity="0.55" />

            <path d={WREATH_STEM_D} stroke={`url(#${gid}-line)`} strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d={WREATH_LEAVES_D} fill={`url(#${gid}-line)`} fillOpacity="0.92" stroke={`url(#${gid}-line)`} strokeWidth="0.5" />
            <path d={RIBBON_D} stroke={`url(#${gid}-line)`} strokeWidth="1.5" fill="none" strokeLinecap="round" />

            <g transform="translate(100, 90) scale(1.5)" stroke={`url(#${gid}-line)`} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round">
              <path d={iconD} />
            </g>
            <text x="100" y="146" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="15" fill="#3A2205" opacity="0.85">
              K
            </text>
          </svg>
          <span className="sr-only">{label} — Kretopia Passport</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-sm">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default RoleStamp;
