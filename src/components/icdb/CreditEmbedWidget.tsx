import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, Code, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface CreditEmbedWidgetProps {
  creatorId: string;
  fullName: string;
}

export const CreditEmbedWidget = ({ creatorId, fullName }: CreditEmbedWidgetProps) => {
  const [style, setStyle] = useState<"badge" | "card" | "timeline">("badge");
  const baseUrl = window.location.origin;

  const embedCodes: Record<string, string> = {
    badge: `<a href="${baseUrl}/epk/${creatorId}" target="_blank" rel="noopener">
  <img src="${baseUrl}/api/badge/${creatorId}" alt="${fullName} - ICDB Verified" height="28" />
</a>`,
    card: `<iframe 
  src="${baseUrl}/embed/credit-card/${creatorId}" 
  width="350" height="200" 
  frameborder="0" 
  style="border-radius:12px;border:1px solid #e5e5e5;"
></iframe>`,
    timeline: `<iframe 
  src="${baseUrl}/embed/timeline/${creatorId}" 
  width="100%" height="400" 
  frameborder="0" 
  style="border-radius:12px;border:1px solid #e5e5e5;"
></iframe>`,
  };

  const markdownBadge = `[![${fullName} - ICDB Verified](${baseUrl}/api/badge/${creatorId})](${baseUrl}/epk/${creatorId})`;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Embed code copied!");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Code className="h-4 w-4 text-primary" />
          Embed Your Credits
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">Add your verified ICDB credits to any website</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={style} onValueChange={(v) => setStyle(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="badge" className="flex-1 text-[11px]">Badge</TabsTrigger>
            <TabsTrigger value="card" className="flex-1 text-[11px]">Card</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1 text-[11px]">Timeline</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Preview */}
        <div className="p-4 rounded-lg bg-muted/30 border min-h-[60px] flex items-center justify-center">
          {style === "badge" && (
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs border-primary/30">
              <ShieldCheck className="h-3 w-3 text-primary" />
              {fullName} · ICDB Verified
              <ExternalLink className="h-2.5 w-2.5 ml-1" />
            </Badge>
          )}
          {style === "card" && (
            <div className="w-full max-w-[300px] p-3 rounded-lg border bg-background text-center">
              <p className="font-semibold text-xs">{fullName}</p>
              <p className="text-[10px] text-muted-foreground">{creatorId}</p>
              <Badge variant="outline" className="text-[9px] mt-2 gap-0.5">
                <ShieldCheck className="h-2 w-2" /> ICDB Verified
              </Badge>
            </div>
          )}
          {style === "timeline" && (
            <div className="w-full max-w-[300px] p-3 rounded-lg border bg-background">
              <p className="font-semibold text-xs mb-2">{fullName}</p>
              <div className="space-y-1.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <div className="h-2 bg-muted rounded flex-1" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* HTML Code */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">HTML</p>
          <div className="relative">
            <pre className="text-[10px] bg-muted/50 p-3 rounded-md overflow-x-auto border font-mono">
              {embedCodes[style]}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0"
              onClick={() => copyCode(embedCodes[style])}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {style === "badge" && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Markdown</p>
            <div className="relative">
              <pre className="text-[10px] bg-muted/50 p-3 rounded-md overflow-x-auto border font-mono">
                {markdownBadge}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0"
                onClick={() => copyCode(markdownBadge)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
