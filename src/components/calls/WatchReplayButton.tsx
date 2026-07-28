import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Fetches a fresh Daily access-link for a recording and opens it in a new tab.
 * Daily links expire in ~120s so we always mint on demand.
 */
export const WatchReplayButton = ({
  transcriptId,
  variant = "outline",
  size = "sm",
  label = "Replay",
}: {
  transcriptId: string;
  variant?: "outline" | "ghost" | "default" | "secondary";
  size?: "sm" | "default" | "icon";
  label?: string;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const open = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "get-recording-link",
        { body: { transcript_id: transcriptId } },
      );
      if (error) throw error;
      const url = (data as any)?.download_link;
      if (!url) throw new Error("No recording URL returned");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({
        title: "Couldn't open recording",
        description: e?.message ?? "The recording may still be processing.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={open}
      disabled={loading}
      className="gap-1.5 shrink-0"
      aria-label="Watch call replay"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
};
