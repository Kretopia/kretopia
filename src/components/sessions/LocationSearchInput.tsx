import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationResult {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  text: string;
}

interface LocationSearchInputProps {
  value: string;
  onSelect: (result: { address: string; venueName: string; lat: number; lng: number }) => void;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXRoYW5hdWd1c3RlIiwiYSI6ImNtZzhvbDk0dzAwaHYycnB6eWp4Zjh2OHAifQ.4uCSa5SdtxZAnC2Xvx6V5w";

export const LocationSearchInput = ({ value, onSelect, onChange, placeholder }: LocationSearchInputProps) => {
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=poi,address,place&limit=5`
        );
        const data = await res.json();
        setResults(data.features?.map((f: any) => ({
          id: f.id,
          place_name: f.place_name,
          center: f.center,
          text: f.text,
        })) || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (result: LocationResult) => {
    onSelect({
      address: result.place_name,
      venueName: result.text,
      lat: result.center[1],
      lng: result.center[0],
    });
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            search(e.target.value);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder || "Search for a location..."}
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg overflow-hidden">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => handleSelect(result)}
              className={cn(
                "flex items-start gap-3 w-full px-3 py-2.5 text-left text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-medium truncate">{result.text}</p>
                <p className="text-xs text-muted-foreground truncate">{result.place_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
