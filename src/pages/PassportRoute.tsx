import { lazy, Suspense } from "react";
import { BrandLoader } from "@/components/brand/BrandDots";

/**
 * V1 /passport route — currently forwards to the existing Profile page.
 * Phase 4 will replace with the full Passport overhaul (KretopiaIdBadge,
 * Verified Paid Credits section, share sheet, PassportKretoBuilder).
 */
const Profile = lazy(() => import("./Profile"));

export default function PassportRoute() {
  return (
    <Suspense fallback={<BrandLoader />}>
      <Profile />
    </Suspense>
  );
}
