import { useEffect } from "react";

/**
 * Central listener for "thrivedesk:intent" window events.
 * Tab components subscribe with the tab id + intent string they care about.
 *
 * Dispatched from NextStepBar, AI suggestions, and chat action chips.
 */
export interface DeskIntentDetail {
  tab: string;
  intent: string;
  payload?: Record<string, any>;
}

export function useDeskIntent(
  tab: string,
  handler: (intent: string, payload?: Record<string, any>) => void
) {
  useEffect(() => {
    const listener = (e: Event) => {
      const detail = (e as CustomEvent<DeskIntentDetail>).detail;
      if (!detail || detail.tab !== tab) return;
      handler(detail.intent, detail.payload);
    };
    window.addEventListener("thrivedesk:intent", listener);
    return () => window.removeEventListener("thrivedesk:intent", listener);
  }, [tab, handler]);
}

/** Helper to dispatch an intent from anywhere (chat, AI, empty states, etc.) */
export function dispatchDeskIntent(tab: string, intent: string, payload?: Record<string, any>) {
  window.dispatchEvent(
    new CustomEvent<DeskIntentDetail>("thrivedesk:intent", {
      detail: { tab, intent, payload },
    })
  );
}

/** Shortcut to navigate to a tab (used from chat/notes for cross-tab CTAs). */
export function navigateDeskTab(tab: string) {
  window.dispatchEvent(new CustomEvent("thrivedesk:set-tab", { detail: tab }));
}
