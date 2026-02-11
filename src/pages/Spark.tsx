import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { SparkPromptCard } from "@/components/spark/SparkPromptCard";
import { SparkResponseFeed } from "@/components/spark/SparkResponseFeed";
import { SparkResponseForm } from "@/components/spark/SparkResponseForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Flame, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CREATIVE_CATEGORIES = [
  { id: "all", label: "All", emoji: "✨" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "visual", label: "Visual Art", emoji: "🎨" },
  { id: "fashion", label: "Fashion", emoji: "👗" },
  { id: "film", label: "Film", emoji: "🎬" },
  { id: "photography", label: "Photo", emoji: "📸" },
  { id: "design", label: "Design", emoji: "✏️" },
  { id: "writing", label: "Writing", emoji: "✍️" },
];

interface SparkPrompt {
  id: string;
  title: string;
  description: string;
  prompt_type: string;
  category: string;
  tags: string[];
  active_date: string;
  response_count: number;
}

const Spark = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<SparkPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<SparkPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('spark_prompts')
        .select('*')
        .eq('is_active', true)
        .or(`active_date.eq.${today},prompt_type.eq.weekly_challenge`)
        .order('prompt_type', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        await generateDailyPrompt();
      } else {
        setPrompts(data);
        setSelectedPrompt(data[0]);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyPrompt = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-spark-prompt');
      if (error) throw error;
      
      if (data?.prompts) {
        setPrompts(data.prompts);
        setSelectedPrompt(data.prompts[0]);
      }
    } catch (error: any) {
      console.error('Error generating prompt:', error);
      const fallback: SparkPrompt = {
        id: 'fallback',
        title: "Show us your creative workspace 🎨",
        description: "Share a photo, describe it, or link to something that inspires your work today.",
        prompt_type: 'daily',
        category: 'general',
        tags: ['workspace', 'inspiration', 'behind-the-scenes'],
        active_date: new Date().toISOString().split('T')[0],
        response_count: 0,
      };
      setPrompts([fallback]);
      setSelectedPrompt(fallback);
    } finally {
      setGenerating(false);
    }
  };

  const handleResponseSubmitted = () => {
    setShowForm(false);
    fetchPrompts();
    toast({ title: "Spark shared! 🔥", description: "Your response is live" });
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Sparkles className="h-8 w-8 text-primary animate-pulse mx-auto" />
          <p className="text-muted-foreground text-sm">
            {generating ? "Generating today's creative spark..." : "Loading sparks..."}
          </p>
        </div>
      </div>
    );
  }

  const dailyPrompts = prompts.filter(p => p.prompt_type === 'daily');
  const weeklyChallenge = prompts.find(p => p.prompt_type === 'weekly_challenge');

  // Filter prompts by selected category
  const filteredDailyPrompts = selectedCategory === "all" 
    ? dailyPrompts 
    : dailyPrompts.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Spark - Daily Creative Prompts | ThriveIN" description="Daily creative prompts and weekly challenges to keep your creative spark alive." />
      
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold">Spark</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Daily creative prompts to fuel your fire
          </p>
        </div>

        {/* Creative Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {CREATIVE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                "border",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
              )}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="daily" className="flex-1 gap-1.5">
              <Sparkles className="h-4 w-4" />
              Today's Spark
            </TabsTrigger>
            {weeklyChallenge && (
              <TabsTrigger value="weekly" className="flex-1 gap-1.5">
                <Trophy className="h-4 w-4" />
                Weekly Challenge
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="daily" className="space-y-4 mt-4">
            {filteredDailyPrompts.map(prompt => (
              <SparkPromptCard
                key={prompt.id}
                prompt={prompt}
                isSelected={selectedPrompt?.id === prompt.id}
                onSelect={() => {
                  setSelectedPrompt(prompt);
                  setShowForm(true);
                }}
              />
            ))}

            {filteredDailyPrompts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No sparks for this category yet today</p>
              </div>
            )}

            {selectedPrompt && showForm && selectedPrompt.prompt_type === 'daily' && (
              <SparkResponseForm
                promptId={selectedPrompt.id}
                userId={user?.id || ''}
                onSubmitted={handleResponseSubmitted}
                onCancel={() => setShowForm(false)}
              />
            )}

            {dailyPrompts[0] && (
              <SparkResponseFeed
                promptId={dailyPrompts[0].id}
                currentUserId={user?.id || ''}
              />
            )}
          </TabsContent>

          {weeklyChallenge && (
            <TabsContent value="weekly" className="space-y-4 mt-4">
              <SparkPromptCard
                prompt={weeklyChallenge}
                isSelected={selectedPrompt?.id === weeklyChallenge.id}
                onSelect={() => {
                  setSelectedPrompt(weeklyChallenge);
                  setShowForm(true);
                }}
              />

              {selectedPrompt?.id === weeklyChallenge.id && showForm && (
                <SparkResponseForm
                  promptId={weeklyChallenge.id}
                  userId={user?.id || ''}
                  onSubmitted={handleResponseSubmitted}
                  onCancel={() => setShowForm(false)}
                />
              )}

              <SparkResponseFeed
                promptId={weeklyChallenge.id}
                currentUserId={user?.id || ''}
              />
            </TabsContent>
          )}
        </Tabs>

        {selectedPrompt && !showForm && (
          <div className="fixed bottom-20 left-0 right-0 px-4 lg:hidden z-40">
            <Button
              onClick={() => setShowForm(true)}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg"
              size="lg"
            >
              <Flame className="h-5 w-5 mr-2" />
              Share Your Spark
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Spark;
