import { Search, Loader2, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  searching?: boolean;
  resultCount: number;
}

/**
 * PersonalCreditsSearch — searches ONLY the signed-in person's own record.
 *
 * The query goes to `search_my_credits`, which derives the user from
 * auth.uid() server-side and never accepts a user_id from the browser. No
 * public profile directory and no global user search is reachable here.
 */
export function PersonalCreditsSearch({ value, onChange, searching, resultCount }: Props) {
  return (
    <div className="w-full">
      <label htmlFor="credits-search" className="sr-only">
        Search your own credits
      </label>
      <div className="relative flex w-full items-center">
        <Search className="pointer-events-none absolute left-4 h-4 w-4 text-white/40" aria-hidden />
        <input
          id="credits-search"
          type="search"
          inputMode="search"
          maxLength={120}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search your credits — project, role, client, year"
          className="h-12 w-full min-w-0 rounded-full border border-white/12 bg-white/[0.03] pl-11 pr-20 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        />
        <div className="absolute right-3 flex items-center gap-1.5">
          {searching && <Loader2 className="h-4 w-4 animate-spin text-white/50" aria-hidden />}
          {value && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onChange("")}
              className="rounded-full p-1 text-white/50 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-white/40" aria-live="polite">
        {value
          ? `${resultCount} of your credits match "${value.slice(0, 40)}"`
          : "Private search — only your own record is searched here."}
      </p>
    </div>
  );
}
