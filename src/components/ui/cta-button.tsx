import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * CANONICAL CTA — single source of truth.
 *
 * These are the exact classes used by the Landing Page CTA
 * (src/components/landing/BottomCTASection.tsx). Any page-level primary
 * CTA must render through <CtaButton> so there is only one CTA
 * implementation in the product.
 *
 * NOT for: navbar buttons, filters, icon-only controls, destructive
 * actions, status controls. Those keep their own affordances.
 */
export const CTA_BUTTON_CLASS =
  "cta-solid w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold group shadow-md";

export type CtaButtonProps = React.ComponentProps<typeof Button>;

export const CtaButton = React.forwardRef<HTMLButtonElement, CtaButtonProps>(
  ({ className, size = "lg", ...props }, ref) => (
    <Button ref={ref} size={size} className={cn(CTA_BUTTON_CLASS, className)} {...props} />
  ),
);
CtaButton.displayName = "CtaButton";
