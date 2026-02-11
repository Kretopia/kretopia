import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Image, Type, Link2, Loader2, X, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface SparkResponseFormProps {
  promptId: string;
  userId: string;
  onSubmitted: () => void;
  onCancel: () => void;
}

type ResponseType = 'text' | 'image' | 'link';

export const SparkResponseForm = ({ promptId, userId, onSubmitted, onCancel }: SparkResponseFormProps) => {
  const [responseType, setResponseType] = useState<ResponseType>('text');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const { toast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `spark/${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('portfolio')
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('portfolio').getPublicUrl(fileName);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageUrl && !linkUrl) {
      toast({ title: "Add some content", description: "Share a thought, image, or link", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('spark_responses')
        .insert({
          user_id: userId,
          prompt_id: promptId,
          response_type: responseType,
          content: content.trim() || null,
          media_url: imageUrl || null,
          link_url: linkUrl || null,
          link_title: linkTitle || null,
        });

      if (error) throw error;
      onSubmitted();
    } catch (error: any) {
      toast({ title: "Failed to post", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const types: { type: ResponseType; icon: any; label: string }[] = [
    { type: 'text', icon: Type, label: 'Text' },
    { type: 'image', icon: Image, label: 'Photo' },
    { type: 'link', icon: Link2, label: 'Link' },
  ];

  return (
    <Card className="border-primary/20 animate-fade-in">
      <CardContent className="p-4 space-y-4">
        {/* Type selector */}
        <div className="flex gap-2">
          {types.map(({ type, icon: Icon, label }) => (
            <Button
              key={type}
              size="sm"
              variant={responseType === type ? 'default' : 'outline'}
              onClick={() => setResponseType(type)}
              className="flex-1"
            >
              <Icon className="h-4 w-4 mr-1.5" />
              {label}
            </Button>
          ))}
        </div>

        {/* Text input (always shown) */}
        <Textarea
          placeholder={
            responseType === 'text' ? "Share your thoughts..." :
            responseType === 'image' ? "Add a caption..." :
            "What's this link about?"
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="resize-none"
          maxLength={500}
        />

        {/* Image upload */}
        {responseType === 'image' && (
          <div className="space-y-2">
            {imageUrl ? (
              <div className="relative">
                <img src={imageUrl} alt="Upload" className="w-full h-48 object-cover rounded-lg" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => setImageUrl('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  id="spark-image"
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed border-2"
                  onClick={() => document.getElementById('spark-image')?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5" />
                      <span className="text-xs">Upload photo</span>
                    </div>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Link input */}
        {responseType === 'link' && (
          <div className="space-y-2">
            <Input
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <Input
              placeholder="Link title (optional)"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share Spark 🔥"}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          {content.length}/500 characters
        </p>
      </CardContent>
    </Card>
  );
};
