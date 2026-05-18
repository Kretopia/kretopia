// Daily.co only allows ONE DailyIframe instance globally. React StrictMode,
// HMR, and route transitions can leave a stale instance behind that then
// throws "Duplicate DailyIframe instances are not allowed".
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";

function getStaleInstance(): any {
  try {
    return (
      (DailyIframe as any).getCallInstance?.() ??
      (DailyIframe as any).instances?.()?.[0] ??
      null
    );
  } catch {
    return null;
  }
}

export function destroyExistingDailyFrame(): void {
  const stale = getStaleInstance();
  if (!stale) return;
  try { stale.leave?.(); } catch {}
  try { stale.destroy?.(); } catch {}
}

/** Async variant — awaits Daily's destroy promise so the singleton slot is
 *  actually free before the next createCallObject/createFrame call. */
export async function destroyExistingDailyFrameAsync(): Promise<void> {
  const stale = getStaleInstance();
  if (!stale) return;
  try { await stale.leave?.(); } catch {}
  try { await stale.destroy?.(); } catch {}
}

export function createDailyFrame(
  container: HTMLElement,
  props: Record<string, any>,
): DailyCall {
  destroyExistingDailyFrame();
  while (container.firstChild) container.removeChild(container.firstChild);
  try {
    return (DailyIframe as any).createFrame(container, props);
  } catch (err: any) {
    if (String(err?.message || "").includes("Duplicate")) {
      // Daily's singleton check still sees a stale instance — force destroy
      // synchronously and retry once.
      try { getStaleInstance()?.destroy?.(); } catch {}
      while (container.firstChild) container.removeChild(container.firstChild);
      return (DailyIframe as any).createFrame(container, props);
    }
    throw err;
  }
}
