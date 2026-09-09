/**
 * Geometry for the Passport Role Stamp's engraved medallion look -- a
 * laurel-wreath medallion in the spirit of a national passport crest
 * (fine engraved gold line, laurel branches framing a central emblem),
 * adapted to Kretopia's own gold palette and a "K" monogram in place of
 * a country's initials. Replaces the earlier flat icon-on-gradient-circle
 * version, which read as a generic app badge rather than an actual stamp.
 *
 * The wreath is identical across every craft (only the center icon
 * differs -- see CATEGORY_ICON_PATHS below), so its path data is computed
 * once, here, at module load, rather than duplicated per category or
 * recomputed on every render.
 *
 * All coordinates live in a fixed 0-200 viewBox; RoleStamp scales the
 * rendered <svg> to whatever pixel size it needs via width/height, so
 * this geometry never needs to change for different call sites.
 */

const CX = 100;
const CY = 100;
const STEM_R = 76;

interface WreathPoint {
  phi: number;
  x: number;
  y: number;
}

/** Point on a circle of radius r around (CX, CY); phi in degrees, measured
 *  clockwise from the top (12 o'clock = 0deg) -- so phi=90 is 3 o'clock,
 *  180 is 6 o'clock (bottom), 270 is 9 o'clock. */
function pointOnCircle(phi: number, r: number): [number, number] {
  const rad = (phi * Math.PI) / 180;
  return [CX + r * Math.sin(rad), CY - r * Math.cos(rad)];
}

/**
 * One laurel branch: a stem arcing from phiFrom to phiTo, with small
 * pointed-almond leaves alternating sides along its length, tapering
 * toward the tip. mirror flips the leaves' forward-sweep direction so
 * the left and right branches read as mirror images of the same plant,
 * not independently-random leaf clusters.
 */
function buildBranch(phiFrom: number, phiTo: number, steps: number, mirror: 1 | -1): { stem: string; leaves: string } {
  const pts: WreathPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const phi = phiFrom + (phiTo - phiFrom) * t;
    const [x, y] = pointOnCircle(phi, STEM_R);
    pts.push({ phi, x, y });
  }

  const stem = "M " + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ");

  const leafPaths: string[] = [];
  for (let i = 1; i < pts.length; i++) {
    const { phi, x, y } = pts[i];
    const rad = (phi * Math.PI) / 180;
    const outward: [number, number] = [Math.sin(rad), -Math.cos(rad)];
    const tangent: [number, number] = [Math.cos(rad), Math.sin(rad)];
    const side = i % 2 === 0 ? 1 : -1;
    const taper = 1 - (i / pts.length) * 0.4;
    const leafLen = 16.5 * taper;
    const leafW = 5.2 * taper;

    const baseX = x;
    const baseY = y;
    const tipX = x + outward[0] * leafLen + tangent[0] * leafLen * 0.45 * mirror;
    const tipY = y + outward[1] * leafLen + tangent[1] * leafLen * 0.45 * mirror;
    const midX = (baseX + tipX) / 2 + tangent[0] * side * leafW;
    const midY = (baseY + tipY) / 2 + tangent[1] * side * leafW;
    const midX2 = (baseX + tipX) / 2 - tangent[0] * side * leafW * 0.3;
    const midY2 = (baseY + tipY) / 2 - tangent[1] * side * leafW * 0.3;

    leafPaths.push(
      `M ${baseX.toFixed(1)} ${baseY.toFixed(1)} ` +
        `Q ${midX.toFixed(1)} ${midY.toFixed(1)}, ${tipX.toFixed(1)} ${tipY.toFixed(1)} ` +
        `Q ${midX2.toFixed(1)} ${midY2.toFixed(1)}, ${baseX.toFixed(1)} ${baseY.toFixed(1)} Z`,
    );
  }

  return { stem, leaves: leafPaths.join(" ") };
}

const LEFT = buildBranch(198, 338, 11, -1);
const RIGHT = buildBranch(162, 22, 11, 1);

export const WREATH_STEM_D = `${LEFT.stem} M ${RIGHT.stem}`;
export const WREATH_LEAVES_D = `${LEFT.leaves} ${RIGHT.leaves}`;

/** Small ribbon knot crossing the two stem bases at the bottom, echoing
 *  the ribbon/ankh crossing on a national passport crest. */
export const RIBBON_D = "M 78 181 Q 100 192 122 181 M 84 184 Q 100 176 116 184";

/**
 * One engraved-line icon per craft, in the same fine-line style as the
 * wreath -- drawn in a local -20..20 coordinate space, centered and
 * scaled by RoleStamp at render time. Kept simple/geometric on purpose:
 * this reads at 20-56px, not at illustration size, so a clean, iconic
 * silhouette holds up far better than a detailed one would.
 */
export const CATEGORY_ICON_PATHS: Record<
  "software" | "fashion" | "music" | "photo_video" | "design" | "writing" | "dance" | "crew" | "model" | "creator",
  string
> = {
  software:
    "M -18 -18 L 18 -18 L 18 6 L -18 6 Z M -24 6 L 24 6 L 20 13 L -20 13 Z " +
    "M -8 -13 L -13 -6 L -8 1 M 8 -13 L 13 -6 L 8 1",
  fashion:
    "M 0 -18 Q 7 -18 7 -12 Q 7 -7 0 -7 M -19 -7 L 19 -7 M -19 -7 L -25 14 L 25 14 L 19 -7",
  music:
    "M -13 8 a5 3.5 0 1 0 10 0 a5 3.5 0 1 0 -10 0 M -3 8 L -3 -15 Q -3 -15 8 -11 Q 13 -9 8 -4",
  photo_video:
    "M -19 -3 L -19 14 L 19 14 L 19 -3 L 10 -3 L 7 -8 L -7 -8 L -10 -3 Z M 0 5 m -8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0",
  design:
    "M 0 -17 L -10 15 M 0 -17 L 10 15 M -4 -13 L 4 -13 M -10 15 L -14 17 M 10 15 L 6 17 M 0 -17 m -3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0",
  writing:
    "M -11 17 L 13 -17 M 13 -17 Q 19 -17 17 -10 Q 15 -4 9 -4 Q 5 -4 5 -8 Q 5 -12 9 -12 M -13 19 m -1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0",
  dance:
    "M 0 -17 m -3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M 0 -14 L -2 2 M -2 2 L -11 15 M -2 2 L 7 11 M 0 -9 L -13 -15 M 0 -9 L 11 -17",
  crew:
    "M -13 13 L 7 -7 M -1 -13 Q -6 -18 -11 -13 Q -16 -8 -11 -3 Q -6 2 -1 -3 Q 4 -8 -1 -13 Z " +
    "M -15 15 m -2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0",
  model:
    "M 0 -17 m -3.2 0 a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0 M 0 -13.5 L 0 6 M 0 6 L -7 17 M 0 6 L 7 17 M 0 -8 L -9 -1 M 0 -8 L 9 -1",
  creator: "M 0 -18 L 0 18 M -18 0 L 18 0 M -12.5 -12.5 L 12.5 12.5 M -12.5 12.5 L 12.5 -12.5",
};
