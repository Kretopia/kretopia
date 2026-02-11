import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Image, Link2, Loader2, X, Upload, Send, MessageSquarePlus, Lightbulb, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SparkPostComposerProps {
  userId: string;
  userAvatar?: string;
  userName?: string;
  onPostCreated: () => void;
}

const POST_INTENTS = [
  { id: "share", label: "Share", icon: MessageSquarePlus, placeholder: "What's on your creative mind?" },
  { id: "inspiration", label: "Inspiration", icon: Lightbulb, placeholder: "Share something that inspires you..." },
  { id: "feedback", label: "Feedback", icon: HelpCircle, placeholder: "What do you need feedback on?" },
];

export const SparkPostComposer = ({ userId, userAvatar, userName, onPostCreated }: SparkPostComposerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [intent, setIntent] = useState("share");
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const currentIntent = POST_INTENTS.find((i) => i.id === intent) || POST_INTENTS[0];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `spark/${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("portfolio").upload(fileName, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("portfolio").getPublicUrl(fileName);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageUrl && !linkUrl) {
      toast({ title: "Add some content", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const mediaUrls = imageUrl ? [{ type: "image", url: imageUrl }] : null;
      const tags = intent !== "share" ? [intent] : [];

      const { error } = await supabase.from("feed_posts").insert({
        user_id: userId,
        content: content.trim() || null,
        media_urls: mediaUrls,
        media_type: imageUrl ? "image" : null,
        tags,
        post_type: intent === "feedback" ? "feedback_request" : "post",
        category: "general",
        link_url: linkUrl || null,
      });

      if (error) throw error;

      setContent("");
      setImageUrl("");
      setLinkUrl("");
      setShowLink(false);
      setIsExpanded(false);
      onPostCreated();
      toast({ title: "Posted! 🔥" });
    } catch (error: any) {
      toast({ title: "Failed to post", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isExpanded) {
    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsExpanded(true)}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={userAvatar} />
            <AvatarFallback>{userName?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground flex-1">
            What's on your creative mind?
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}>
              <Image className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 animate-fade-in">
      <CardContent className="p-4 space-y-3">
        {/* Intent selector */}
        <div className="flex gap-2">
          {POST_INTENTS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={intent === id ? "default" : "outline"}
              onClick={() => setIntent(id)}
              className="flex-1 text-xs"
            >
              <Icon className="h-3.5 w-3.5 mr-1" />
              {label}
            </Button>
          ))}
        </div>

        {/* Text area */}
        <Textarea
          placeholder={currentIntent.placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="resize-none"
          autoFocus
          maxLength={1000}
        />

        {/* Image preview */}
        {imageUrl && (
          <div className="relative">
            <img src={imageUrl} alt="Upload" className="w-full h-48 object-cover rounded-lg" />
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={() => setImageUrl("")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Link input */}
        {showLink && (
          <Input
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <input type="file" id="spark-compose-img" onChange={handleImageUpload} accept="image/*" className="hidden" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => document.getElementById("spark-compose-img")?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", showLink && "text-primary")}
              onClick={() => setShowLink(!showLink)}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setIsExpanded(false); setContent(""); setImageUrl(""); setLinkUrl(""); setShowLink(false); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || uploading || (!content.trim() && !imageUrl && !linkUrl)}
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1" /> Post</>}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
