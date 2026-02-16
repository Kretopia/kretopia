import { useState, useRef } from "react";
import { MessageSquarePlus, Send, X, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const CATEGORIES = [
  { value: "bug", label: "🐛 Bug", color: "destructive" as const },
  { value: "feature", label: "💡 Feature", color: "default" as const },
  { value: "ui", label: "🎨 UI/UX", color: "secondary" as const },
  { value: "general", label: "💬 General", color: "outline" as const },
];

export function FeedbackWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only show for logged-in users
  if (!user) return null;

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
        return;
      }
      setScreenshot(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({ title: "Please enter your feedback", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let screenshotUrl: string | null = null;

      if (screenshot) {
        const ext = screenshot.name.split(".").pop() || "png";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("feedback-screenshots")
          .upload(path, screenshot);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("feedback-screenshots")
          .getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        category,
        message: message.trim(),
        screenshot_url: screenshotUrl,
        page_url: window.location.pathname,
      });

      if (error) throw error;

      toast({ title: "Thanks for your feedback! 🙏", description: "We'll review it soon." });
      setMessage("");
      setCategory("general");
      removeScreenshot();
      setOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
            <DialogDescription>
              Help us improve ThriveIN — bugs, ideas, anything goes!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category selector */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Badge
                  key={cat.value}
                  variant={category === cat.value ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
                    category === cat.value ? "ring-2 ring-primary/30" : "hover:bg-accent"
                  }`}
                  onClick={() => setCategory(cat.value)}
                >
                  {cat.label}
                </Badge>
              ))}
            </div>

            {/* Message */}
            <Textarea
              placeholder="What's on your mind? Tell us about a bug, suggest a feature, or share general feedback..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>

            {/* Screenshot */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScreenshot}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-1" />
                {screenshot ? "Change" : "Add Screenshot"}
              </Button>
              {previewUrl && (
                <div className="relative h-10 w-10 rounded border overflow-hidden">
                  <img src={previewUrl} alt="Screenshot preview" className="h-full w-full object-cover" />
                  <button
                    onClick={removeScreenshot}
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
              className="w-full"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />Send Feedback</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
