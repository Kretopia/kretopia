// Daily.co only allows ONE DailyIframe instance globally. React StrictMode,
// HMR, and route transitions can leave a stale instance behind that then
// throws "Duplicate DailyIframe instances are not allowed".
//
// This helper aggressively tears down any existing instance (sync + async)
// and falls back to a retry if Daily's internal singleton hasn't cleared yet.
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";

export async function destroyExistingDailyFrame(): Promise<void> {
  try {
    const existing =
      (DailyIframe as any).getCallInstance?.() ??
      (DailyIframe as any).instances?.()?.[0];
    if (existing) {
      try { await existing.leave?.(); } catch {}
      try { await existing.destroy?.(); } catch {}
    }
  } catch {
    /* non-fatal */
  }
}

export async function createDailyFrame(
  container: HTMLElement,
  props: Record<string, any>,
): Promise<DailyCall> {
  await destroyExistingDailyFrame();
  while (container.firstChild) container.removeChild(container.firstChild);
  try {
    return (DailyIframe as any).createFrame(container, props);
  } catch (err: any) {
    // Singleton check still sees a stale instance — destroy synchronously
    // (no await) and retry once.
    if (String(err?.message || "").includes("Duplicate")) {
      try {
        const stale =
          (DailyIframe as any).getCallInstance?.() ??
          (DailyIframe as any).instances?.()?.[0];
        stale?.destroy?.();
      } catch {}
      while (container.firstChild) container.removeChild(container.firstChild);
      return (DailyIframe as any).createFrame(container, props);
    }
    throw err;
  }
}
