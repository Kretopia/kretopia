import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Globe, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportFromWebsiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: any) => void;
}

export const ImportFromWebsiteDialog = ({ open, onOpenChange, onImport }: ImportFromWebsiteDialogProps) => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-profile-url', {
        body: { url }
      });

      // Check for LinkedIn blocking first (even if there's an error)
      if (data?.isLinkedInBlock) {
        toast({
          title: "LinkedIn Access Restricted",
          description: data.error || "LinkedIn blocks automated profile scraping. Please manually copy-paste your information or try another URL.",
          variant: "destructive",
          duration: 8000,
        });
        return;
      }

      if (error) throw error;

      if (data?.success && data.data) {
        setExtractedData(data.data);
        toast({
          title: "Analysis Complete",
          description: "Review the extracted data and apply changes",
        });
      } else {
        throw new Error(data?.error || "Failed to extract profile data");
      }
    } catch (error: any) {
      console.error("Error analyzing URL:", error);
      const errorMessage = error?.message || "Could not extract profile data from this URL. Please try another or enter manually.";
      
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onImport(extractedData);
      toast({
        title: "Profile Data Imported",
        description: "Review and save your profile to apply changes",
      });
      onOpenChange(false);
      setUrl("");
      setExtractedData(null);
    }
  };

  const handleCancel = () => {
    setUrl("");
    setExtractedData(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Import from Website
          </DialogTitle>
          <DialogDescription>
            Paste your website, portfolio, or EPK URL to auto-fill your profile
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website-url">Website URL</Label>
            <div className="flex gap-2">
              <Input
                id="website-url"
                type="url"
                placeholder="https://yourwebsite.com or https://linkedin.com/in/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
              <Button onClick={handleAnalyze} disabled={isLoading || !url}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  "Analyze"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Works with personal websites, LinkedIn, IMDb, Behance, and more
            </p>
          </div>

          {extractedData && (
            <ScrollArea className="max-h-[400px] pr-4">
              <Card className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Data extracted successfully</span>
                </div>

                {extractedData.full_name && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <p className="font-medium">{extractedData.full_name}</p>
                  </div>
                )}

                {extractedData.role && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Role</Label>
                    <p className="font-medium">{extractedData.role}</p>
                  </div>
                )}

                {extractedData.bio && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Bio</Label>
                    <p className="text-sm line-clamp-3">{extractedData.bio}</p>
                  </div>
                )}

                {extractedData.location && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <p className="font-medium">{extractedData.location}</p>
                  </div>
                )}

                {extractedData.skills && extractedData.skills.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Skills ({extractedData.skills.length})</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {extractedData.skills.slice(0, 10).map((skill: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {extractedData.skills.length > 10 && (
                        <Badge variant="outline" className="text-xs">
                          +{extractedData.skills.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {extractedData.portfolio_items && extractedData.portfolio_items.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Portfolio Items ({extractedData.portfolio_items.length})
                    </Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {extractedData.portfolio_items.slice(0, 6).map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
                          {item.thumbnail_url && (
                            <img src={item.thumbnail_url} alt={item.title} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                          )}
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))}
                      {extractedData.portfolio_items.length > 6 && (
                        <div className="flex items-center justify-center p-2 rounded-md bg-muted/30 text-xs text-muted-foreground">
                          +{extractedData.portfolio_items.length - 6} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {extractedData.awards && extractedData.awards.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Awards ({extractedData.awards.length})
                    </Label>
                  </div>
                )}

                {extractedData.credits && extractedData.credits.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Credits ({extractedData.credits.length})
                    </Label>
                  </div>
                )}

                {extractedData.press_links && extractedData.press_links.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Press Links ({extractedData.press_links.length})
                    </Label>
                  </div>
                )}
              </Card>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            {extractedData && (
              <Button onClick={handleApply}>
                Apply to Profile
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
