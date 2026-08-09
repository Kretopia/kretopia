import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

export { CarouselItem as GlassCarouselItem };

export interface GlassCarouselProps {
  children: React.ReactNode;
  className?: string;
  /** Loading skeleton state — pass a fixed count of placeholder cards. */
  loading?: boolean;
  loadingCount?: number;
  /** Empty state — shown instead of the carousel when there's nothing to scroll. */
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Accessible label for the carousel region (e.g. "Live sound stages"). */
  label: string;
}

/**
 * Batteries-included Liquid Glass carousel: horizontal scroll + swipe +
 * snap (via embla, from the base Carousel), glass prev/next buttons,
 * a visible position-dot indicator, keyboard arrow support (inherited),
 * and loading/empty states so callers don't have to build those per use.
 */
export const GlassCarousel = ({
  children,
  className,
  loading = false,
  loadingCount = 4,
  empty = false,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  label,
}: GlassCarouselProps) => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [selected, setSelected] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setSelected(api.selectedScrollSnap());
    const onSelect = () => setSelected(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  if (loading) {
    return (
      <div className={cn("flex gap-3 overflow-hidden", className)} aria-busy="true" aria-label={`${label} — loading`}>
        {Array.from({ length: loadingCount }).map((_, i) => (
          <div key={i} className="h-40 w-56 shrink-0 rounded-2xl glass-surface animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    );
  }

  if (empty) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center", className)}>
        <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
        {emptyDescription && <p className="mt-1 text-xs text-muted-foreground">{emptyDescription}</p>}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Carousel
        setApi={setApi}
        opts={{ align: "start", dragFree: true }}
        className="w-full"
        aria-label={label}
      >
        <CarouselContent className="-ml-3">{children}</CarouselContent>
        <CarouselPrevious variant="glass" className="hidden sm:flex -left-3" aria-label={`Previous — ${label}`} />
        <CarouselNext variant="glass" className="hidden sm:flex -right-3" aria-label={`Next — ${label}`} />
      </Carousel>

      {count > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5" role="tablist" aria-label={`${label} position`}>
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === selected}
              aria-label={`Go to slide ${i + 1} of ${count}`}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent))]",
                i === selected ? "w-4 bg-[hsl(var(--color-accent))]" : "w-1.5 bg-white/20 hover:bg-white/35",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};
GlassCarousel.displayName = "GlassCarousel";

export default GlassCarousel;
