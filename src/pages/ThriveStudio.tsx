import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Send, 
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Mic,
  Copy,
  Download,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ContentType = "copy" | "image" | "video" | "music" | "voice";

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: ContentType;
  imageUrl?: string;
}

const ThriveStudio = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<ContentType>("copy");
  const [credits, setCredits] = useState(0);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCredits();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchCredits = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: wallet } = await supabase
      .from('wallets')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (wallet) setCredits(wallet.credits);
  };

  const contentTypes = [
    { id: "copy", label: "Copy", icon: <FileText className="h-4 w-4" />, cost: 1, available: true },
    { id: "image", label: "Images", icon: <ImageIcon className="h-4 w-4" />, cost: 5, available: true },
    { id: "video", label: "Video", icon: <Video className="h-4 w-4" />, cost: 10, available: false },
    { id: "music", label: "Music", icon: <Music className="h-4 w-4" />, cost: 10, available: false },
    { id: "voice", label: "Voice", icon: <Mic className="h-4 w-4" />, cost: 3, available: false },
  ];

  const getSystemPrompt = (type: ContentType) => {
    const prompts = {
      copy: "You are a professional copywriter. Help create engaging copy for bios, posts, contracts, and captions.",
      image: "Generate a high-quality, professional image based on the user's description. Be creative and detailed.",
      video: "You are a video concept consultant. Help brainstorm and plan video content.",
      music: "You are a music creation consultant. Help with concepts, lyrics, and composition ideas.",
      voice: "You are a voiceover script writer. Create professional voiceover scripts.",
    };
    return prompts[type];
  };

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input, type: selectedType };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Deduct credits
      const creditCost = contentTypes.find(t => t.id === selectedType)?.cost || 1;
      if (credits < creditCost) {
        toast({
          title: "Insufficient Credits",
          description: "Please add more credits to continue.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Call AI generation function
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          messages: [
            { role: "system", content: getSystemPrompt(selectedType) },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: input }
          ],
          type: selectedType,
        }
      });

      if (error) throw error;

      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.content || "Image generated successfully!",
        type: selectedType,
        imageUrl: data.images?.[0]?.image_url?.url
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update credits
      await supabase
        .from('wallets')
        .update({ credits: credits - creditCost })
        .eq('user_id', user.id);

      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: creditCost,
          type: 'credit_spent',
          description: `Generated ${selectedType} content`,
        });

      setCredits(credits - creditCost);

      toast({
        title: "Content Generated! ✨",
        description: `Used ${creditCost} credits`,
      });

    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              ThriveStudio
            </h1>
            <p className="text-muted-foreground">AI-powered content creation</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Available Credits</p>
            <p className="text-2xl font-bold text-primary">{credits}</p>
          </div>
        </div>

        {/* Content Type Selector */}
        <div className="mb-6 flex flex-wrap gap-2">
          {contentTypes.map((type) => (
            <div key={type.id} className="relative">
              <Button
                variant={selectedType === type.id ? "default" : "outline"}
                size="sm"
                onClick={() => type.available && setSelectedType(type.id as ContentType)}
                className="gap-2"
                disabled={!type.available}
              >
                {type.icon}
                {type.label}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {type.cost}
                </Badge>
              </Button>
              {!type.available && (
                <Badge 
                  variant="outline" 
                  className="absolute -right-2 -top-2 text-xs bg-background"
                >
                  Soon
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Chat Area */}
        <Card className="mb-4 h-[500px] flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <Sparkles className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                  <h3 className="mb-2 text-xl font-semibold">What do you want to create?</h3>
                  <p className="text-muted-foreground">
                    Choose a content type above and describe what you need
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.imageUrl ? (
                        <div className="space-y-2">
                          <img 
                            src={message.imageUrl} 
                            alt="Generated content" 
                            className="rounded-lg max-w-full h-auto"
                          />
                          <p className="text-sm">{message.content}</p>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      {message.role === "assistant" && (
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(message.content)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {message.imageUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = message.imageUrl!;
                                link.download = 'generated-image.png';
                                link.click();
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={`Describe the ${selectedType} you want to create...`}
            className="min-h-[60px] resize-none"
            disabled={loading}
          />
          <Button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            size="lg"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThriveStudio;
