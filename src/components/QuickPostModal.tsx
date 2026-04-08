import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Briefcase, CalendarDays, DollarSign, Loader2, MapPin, Sparkles, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PostType = "gig" | "event";

interface QuickPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PostType;
}

const GIG_TYPES = ["Paid", "Collab", "Barter", "Volunteer"];
const GIG_CATEGORIES = [
  "Photography", "Videography", "Music", "Design", "Writing",
  "Acting", "Modeling", "Dance", "Production", "Other"
];

export function QuickPostModal({ open, onOpenChange, type }: QuickPostModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [gigType, setGigType] = useState("Paid");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const isGig = type === "gig";

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setGigType("Paid");
    setCategory("");
    setBudget("");
    setEventDate("");
  };

  const publishGig = async (userId: string, formData: any) => {
    const { data, error } = await supabase.from("opportunities").insert({
      title: formData.title,
      description: formData.description || "",
      location: formData.location || null,
      type: formData.gigType || "Gig",
      category: formData.category || null,
      budget: formData.budget || null,
      created_by: userId,
      status: "active",
    }).select("id").single();

    if (error) throw error;
    return data.id;
  };

  const publishEvent = async (userId: string, formData: any) => {
    const startTime = formData.eventDate || new Date(Date.now() + 7 * 86400000).toISOString();
    const { data, error } = await supabase.from("creative_jams").insert({
      title: formData.title,
      description: formData.description || null,
      venue_name: formData.location || null,
      start_time: startTime,
      created_by: userId,
      category: "general",
      ends_at: new Date(new Date(startTime).getTime() + 3 * 3600000).toISOString(),
    }).select("id").single();

    if (error) throw error;
    return data.id;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const formData = {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      gigType,
      category,
      budget: budget.trim(),
      eventDate: eventDate.trim(),
      type,
    };

    // If not logged in, save form to sessionStorage and redirect to auth
    if (!user) {
      sessionStorage.setItem("thrivein_pending_post", JSON.stringify(formData));
      toast.info("Sign up to publish your post — we've saved your details!");
      onOpenChange(false);
      navigate(`/auth?redirect=/dashboard`);
      return;
    }

    // User is logged in — publish directly
    setSubmitting(true);
    try {
      let id: string;
      if (isGig) {
        id = await publishGig(user.id, formData);
        toast.success("Gig posted! Generating cover image...");
        onOpenChange(false);
        navigate(`/opportunity/${id}`);
        // Fire-and-forget AI cover generation
        supabase.functions.invoke("generate-gig-cover", {
          body: { opportunityId: id, title: formData.title, category: formData.category, gigType: formData.gigType },
        }).then(({ error }) => {
          if (error) console.warn("Cover generation failed:", error);
          else toast.success("Cover image generated!");
        });
      } else {
        id = await publishEvent(user.id, formData);
        toast.success("Event posted! Add more details to get RSVPs.");
        onOpenChange(false);
        navigate(`/event/${id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    } finally {
      setSubmitting(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {isGig ? <Briefcase className="h-4 w-4 text-green-500" /> : <CalendarDays className="h-4 w-4 text-primary" />}
            {isGig ? "Post a Gig" : "Post an Event"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Title */}
          <Input
            placeholder={isGig ? "e.g. Photographer needed for fashion shoot" : "e.g. Creative Meetup — Downtown"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11"
            autoFocus
          />

          {/* Description */}
          <div className="space-y-1.5">
            <Textarea
              placeholder={isGig ? "Describe what you need — skills, deliverables, timeline..." : "What's the event about?"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            {isGig && title.trim().length >= 3 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-primary hover:text-primary"
                disabled={generatingDesc}
                onClick={async () => {
                  setGeneratingDesc(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("generate-gig-description", {
                      body: { title: title.trim(), category, gigType, location: location.trim() },
                    });
                    if (error) throw error;
                    if (data?.description) {
                      setDescription(data.description);
                      toast.success("Description generated!");
                    }
                  } catch (err: any) {
                    toast.error(err.message || "Failed to generate description");
                  } finally {
                    setGeneratingDesc(false);
                  }
                }}
              >
                {generatingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {generatingDesc ? "Writing..." : "AI Write Description"}
              </Button>
            )}
          </div>

          {/* Location */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-11 pl-9"
            />
          </div>

          {isGig ? (
            <>
              {/* Gig Type & Category */}
              <div className="grid grid-cols-2 gap-2">
                <Select value={gigType} onValueChange={setGigType}>
                  <SelectTrigger className="h-11">
                    <Tag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {GIG_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {GIG_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Budget */}
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Budget (optional, e.g. $500 or TBD)"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </>
          ) : (
            /* Event Date */
            <Input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="h-11"
            />
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
            className="w-full h-11 font-semibold"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : !user ? (
              `Continue & Sign Up to Publish`
            ) : (
              `Publish ${isGig ? "Gig" : "Event"}`
            )}
          </Button>

          {!user && (
            <p className="text-[10px] text-muted-foreground text-center">
              Your details are saved — just create an account to go live ✨
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Utility to process pending post after signup — call from AuthContext
export async function processPendingPost(userId: string): Promise<string | null> {
  try {
    const raw = sessionStorage.getItem("thrivein_pending_post");
    if (!raw) return null;
    sessionStorage.removeItem("thrivein_pending_post");

    const formData = JSON.parse(raw);
    const { default: supabaseClient } = await import("@/integrations/supabase/client").then(m => ({ default: m.supabase }));

    if (formData.type === "gig") {
      const { data, error } = await supabaseClient.from("opportunities").insert({
        title: formData.title,
        description: formData.description || "",
        location: formData.location || null,
        type: formData.gigType || "Gig",
        category: formData.category || null,
        budget: formData.budget || null,
        created_by: userId,
        status: "active",
      }).select("id").single();

      if (error) throw error;
      return `/opportunity/${data.id}`;
    } else {
      const startTime = formData.eventDate || new Date(Date.now() + 7 * 86400000).toISOString();
      const { data, error } = await supabaseClient.from("creative_jams").insert({
        title: formData.title,
        description: formData.description || null,
        venue_name: formData.location || null,
        start_time: startTime,
        created_by: userId,
        category: "general",
        ends_at: new Date(new Date(startTime).getTime() + 3 * 3600000).toISOString(),
      }).select("id").single();

      if (error) throw error;
      return `/event/${data.id}`;
    }
  } catch (e) {
    console.warn("[QuickPostModal] Failed to process pending post:", e);
    return null;
  }
}
