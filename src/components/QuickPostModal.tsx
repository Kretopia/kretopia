import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Briefcase, CalendarDays, Loader2, MapPin, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthPrompt, useAuthPrompt } from "@/components/AuthPrompt";

type PostType = "gig" | "event";

interface QuickPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PostType;
}

export function QuickPostModal({ open, onOpenChange, type }: QuickPostModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { open: authOpen, setOpen: setAuthOpen, requireAuth } = useAuthPrompt();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [detail, setDetail] = useState(""); // type for gig, date for event
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      requireAuth(`post a ${type}`);
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      if (type === "gig") {
        const { data, error } = await supabase.from("opportunities").insert({
          title: title.trim(),
          location: location.trim() || null,
          type: detail.trim() || "Gig",
          created_by: user.id,
          status: "active",
          description: "",
        }).select("id").single();

        if (error) throw error;
        toast.success("Gig posted! Add more details to attract talent.");
        onOpenChange(false);
        navigate(`/opportunity/${data.id}`);
      } else {
        const startTime = detail.trim() || new Date(Date.now() + 7 * 86400000).toISOString();
        const { data, error } = await supabase.from("creative_jams").insert({
          title: title.trim(),
          venue_name: location.trim() || null,
          start_time: startTime,
          created_by: user.id,
          category: "general",
          ends_at: new Date(new Date(startTime).getTime() + 3 * 3600000).toISOString(),
        }).select("id").single();

        if (error) throw error;
        toast.success("Event posted! Add more details to get RSVPs.");
        onOpenChange(false);
        navigate(`/event/${data.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    } finally {
      setSubmitting(false);
      setTitle("");
      setLocation("");
      setDetail("");
    }
  };

  const isGig = type === "gig";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {isGig ? <Briefcase className="h-4 w-4 text-green-500" /> : <CalendarDays className="h-4 w-4 text-primary" />}
              Quick Post — {isGig ? "Gig" : "Event"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <Input
              placeholder={isGig ? "e.g. Photographer needed for fashion shoot" : "e.g. Creative Meetup — Downtown"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
              autoFocus
            />
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Location (optional)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-11 pl-9"
              />
            </div>
            <Input
              placeholder={isGig ? "Type: Paid, Barter, Collab..." : "Date: e.g. 2026-04-20"}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="h-11"
            />
            <Button
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="w-full h-11 font-semibold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Post ${isGig ? "Gig" : "Event"}`}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              You can add full details after posting
            </p>
          </div>
        </DialogContent>
      </Dialog>
      <AuthPrompt open={authOpen} onOpenChange={setAuthOpen} action={`post a ${type}`} />
    </>
  );
}
