import { useEffect, useState } from "react";
import { KretoAvatar } from "@/components/brand/KretoAvatar";
import { cn } from "@/lib/utils";

/**
 * KretoLauncher — the single, subtle "open Kreto" affordance on desktop.
 * Replaces the old side-positioned star pill (DesktopCopilotRail's collapsed
 * state). Dispatches the same `thrive-copilot:open` event every other
 * surface already uses, so it opens the real ThriveAgentFab Sheet with no
 * new backend or event plumbing.
 *
 * Desktop-only (lg+) by design: on mobile, ThriveBar is already docked
 * above the bottom nav as the "open Kreto" entry point — a second floating
 * button there would sit on top of it, which is exactly what this
 * component's own positioning rules are meant to avoid.
 */
export function KretoLauncher() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Hide while any Sheet/Dialog (Kreto itself, menu, notifications,
  // messages, etc.) is open, so it never sits on top of a drawer.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const check = () => {
      setDialogOpen(
        document.body.hasAttribute("data-scroll-locked") ||
          !!document.querySelector('[role="dialog"][data-state="open"]')
      );
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked", "style"],
      childList: true,
      subtree: true,
    });
    return () => obs.disconnect();
  }, []);

  if (dialogOpen) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("thrive-copilot:open", { detail: {} }))}
      aria-label="Open Kreto"
      title="Open Kreto"
      className={cn(
        "hidden lg:flex fixed z-40 items-center justify-center h-14 w-14 rounded-full",
        "bg-[#0B0B10]/90 border border-white/12 backdrop-blur-sm",
        "shadow-[0_10px_28px_-10px_rgba(0,0,0,0.7)]",
        "hover:border-white/25 hover:scale-105 active:scale-95",
        "transition-transform duration-200 motion-reduce:transition-none motion-reduce:hover:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      style={{
        right: "max(1.25rem, env(safe-area-inset-right))",
        bottom: "max(1.25rem, env(safe-area-inset-bottom))",
      }}
    >
      <KretoAvatar size="xs" animated={!reducedMotion} />
      <span className="sr-only">Open Kreto</span>
    </button>
  );
}

export default KretoLauncher;
