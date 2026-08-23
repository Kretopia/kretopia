import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

/**
 * CreditsPermissionState — what a signed-out visitor sees at /credits.
 *
 * Credits is a personal, authenticated surface: no public directory, no
 * global user search. Public discovery lives at /search.
 */
export function CreditsPermissionState() {
  return (
    <div className="dark min-h-screen bg-background" style={{ backgroundColor: "#05070D" }}>
      <main className="container mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <Lock className="h-5 w-5 text-white/60" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Your Credits are private</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Credits is your own record — your identity, your stamps and your Hire Me profile in one place.
          Sign in to see it. Nothing here is public.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth?redirect=/credits"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#05070D] transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
          <Link
            to="/search"
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
          >
            Search public work instead
          </Link>
        </div>
      </main>
    </div>
  );
}
