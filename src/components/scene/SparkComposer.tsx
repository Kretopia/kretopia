import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Image, Link2, Loader2, Send, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SparkComposerProps {
  userProfile?: { full_name: string; avatar_url: string | null; role: string | null } | null;
  onPostCreated: () => void;
}

export const SparkComposer = ({ userProfile, onPostCreated }: SparkComposerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  if (!user) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handlePost = async () => {
    if (!content.trim() && !mediaFile && !linkUrl.trim()) return;
    setPosting(true);

    try {
      let mediaUrls: string[] | null = null;
      let mediaType: string | null = null;

      // Upload media if present
      if (mediaFile) {
        const ext = mediaFile.name.split(".").pop();
        const path = `spark/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("media")
          .upload(path, mediaFile);

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
          mediaUrls = [urlData.publicUrl];
          mediaType = mediaFile.type.startsWith("video") ? "video" 
            : mediaFile.type.startsWith("audio") ? "audio" : "image";
        }
      }

      await supabase.from("feed_posts").insert({
        user_id: user.id,
        content: content.trim() || null,
        media_urls: mediaUrls,
        media_type: mediaType,
        post_type: mediaFile ? "media" : linkUrl.trim() ? "link" : "text",
        link_url: linkUrl.trim() || null,
        source_type: "spark",
      });

      setContent("");
      setLinkUrl("");
      setMediaFile(null);
      setMediaPreview(null);
      setShowLinkInput(false);
      setExpanded(false);
      toast({ title: "Sparked! 🔥" });
      onPostCreated();
    } catch (err) {
      toast({ title: "Error posting", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card className="p-3 mb-4 border-border/50">
      <div className="flex gap-2.5">
        <Avatar className="h-9 w-9 ring-2 ring-primary/20 shrink-0">
          <AvatarImage src={userProfile?.avatar_url || ""} />
          <AvatarFallback className="text-xs">{userProfile?.full_name?.[0] || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          {!expanded ? (
            <div
              className="w-full rounded-full bg-muted/50 px-4 py-2 text-sm text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => setExpanded(true)}
            >
              Share something with the scene...
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                placeholder="What's inspiring you? Share work, ideas, or a vibe..."
                value={content}
                onChange={e => setContent(e.target.value)}
                className="min-h-[60px] text-sm bg-muted/30 border-border/30 resize-none"
                maxLength={500}
                autoFocus
              />

              {/* Media preview */}
              {mediaPreview && (
                <div className="relative inline-block">
                  {mediaFile?.type.startsWith("video") ? (
                    <video src={mediaPreview} className="h-20 rounded-lg" />
                  ) : mediaFile?.type.startsWith("audio") ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-xs">
                      🎵 {mediaFile.name}
                    </div>
                  ) : (
                    <img src={mediaPreview} className="h-20 rounded-lg object-cover" alt="preview" />
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                    onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Link input */}
              {showLinkInput && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Paste a link (YouTube, Spotify, etc.)"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleFileSelect} />
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
                    <Image className="h-3.5 w-3.5" /> Media
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowLinkInput(!showLinkInput)}>
                    <Link2 className="h-3.5 w-3.5" /> Link
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setExpanded(false); setContent(""); setMediaFile(null); setMediaPreview(null); }}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="gradient"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handlePost}
                    disabled={posting || (!content.trim() && !mediaFile && !linkUrl.trim())}
                  >
                    {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Spark
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
