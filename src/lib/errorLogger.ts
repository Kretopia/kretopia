import { supabase } from "@/integrations/supabase/client";

let isLogging = false;

/**
 * Logs a client-side error to the database for monitoring.
 * Silently fails — never throws or interrupts UX.
 */
export async function logClientError(
  error: Error | string,
  componentName?: string,
  metadata?: Record<string, unknown>
) {
  // Prevent recursive logging
  if (isLogging) return;
  isLogging = true;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    await (supabase as any).from("client_error_logs").insert({
      user_id: user?.id || null,
      error_message: typeof error === "string" ? error : error.message,
      error_stack: typeof error === "string" ? null : error.stack?.slice(0, 4000),
      component_name: componentName || null,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      metadata: metadata || null,
    });
  } catch {
    // Silently fail — never crash the app for logging
  } finally {
    isLogging = false;
  }
}

/**
 * Sets up global error handlers to catch unhandled errors and rejections.
 */
export function setupGlobalErrorLogging() {
  window.addEventListener("error", (event) => {
    logClientError(
      event.error || event.message,
      "GlobalErrorHandler",
      { filename: event.filename, lineno: event.lineno, colno: event.colno }
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const errorMsg = reason instanceof Error 
      ? reason 
      : String(reason || 'Unknown rejection');
    logClientError(
      errorMsg,
      "UnhandledPromiseRejection",
      { 
        reasonType: typeof reason,
        reasonConstructor: reason?.constructor?.name,
        stack: reason?.stack?.slice(0, 2000),
      }
    );
  });
}
