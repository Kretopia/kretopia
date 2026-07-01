import { lazy, Suspense } from "react";
import { BrandLoader } from "@/components/brand/BrandDots";

/**
 * V1 Search — for now, forwards to the existing unified Search page.
 * Phase 5 will replace this with the full "Search the Creative Universe"
 * tabs (People · Passports · Projects · Credits · Companies · Opportunities · Press · Web).
 */
const Search = lazy(() => import("./Search"));

export default function KretopiaSearch() {
  return (
    <Suspense fallback={<BrandLoader />}>
      <Search />
    </Suspense>
  );
}
