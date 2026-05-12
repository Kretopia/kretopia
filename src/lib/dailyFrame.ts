// Daily.co only allows ONE DailyIframe instance globally. React StrictMode,
// HMR, and route transitions can all leave a stale instance behind that
// then throws "Duplicate DailyIframe instances are not allowed".
//
// This helper safely tears down any existing instance and clears the
// container before creating a fresh frame.
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";

export function destroyExistingDailyFrame(): void {
  try {
    const existing =
      (DailyIframe as any).getCallInstance?.() ??
      (DailyIframe as any).instances?.()?.[0];
    if (existing) {
      try { existing.leave?.(); } catch {}
      try { existing.destroy?.(); } catch {}
    }
  } catch {
    /* non-fatal */
  }
}

export function createDailyFrame(
  container: HTMLElement,
  props: Parameters<typeof DailyIframe.createFrame>[1],
): DailyCall {
  destroyExistingDailyFrame();
  // Clear any leftover <iframe> children from a previous mount.
  while (container.firstChild) container.removeChild(container.firstChild);
  return DailyIframe.createFrame(container, props);
}
