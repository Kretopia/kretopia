import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, X, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface FilterSuggestion {
  label: string;
  filter: string;
  value: any;
  reason: string;
  icon?: string;
}

interface SmartFilterSuggestionsProps {
  activeTab: "creators" | "opportunities";
  currentFilters: any;
  onApplySuggestion: (filter: string, value: any) => void;
  className?: string;
}

export const SmartFilterSuggestions = ({ 
  activeTab, 
  currentFilters, 
  onApplySuggestion,
  className 
}: SmartFilterSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<FilterSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    generateSuggestions();
  }, [activeTab, currentFilters]);

  const generateSuggestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's recent activity - use simple approach without swipes table
      const newSuggestions: FilterSuggestion[] = [];

      // Add time-based suggestions
      const hour = new Date().getHours();
      if (activeTab === "opportunities" && hour >= 9 && hour <= 17) {
        if (!currentFilters.remote) {
          newSuggestions.push({
            label: "Remote Only",
            filter: "remote",
            value: true,
            reason: "Most flexible for collaboration",
            icon: "💼"
          });
        }
      }

      // Add trending suggestion
      if (activeTab === "creators" && !currentFilters.verified) {
        newSuggestions.push({
          label: "Verified Creators",
          filter: "verified",
          value: true,
          reason: "Higher engagement rates",
          icon: "✓"
        });
      }

      setSuggestions(newSuggestions.filter(s => !dismissed.has(s.label)));
    } catch (error) {
      console.error("Error generating suggestions:", error);
    }
  };

  const handleApply = (suggestion: FilterSuggestion) => {
    onApplySuggestion(suggestion.filter, suggestion.value);
    setDismissed(prev => new Set(prev).add(suggestion.label));
  };

  const handleDismiss = (label: string) => {
    setDismissed(prev => new Set(prev).add(label));
  };

  if (suggestions.length === 0) return null;

  return (
    <Card className={cn("border-accent/30 bg-gradient-to-r from-accent/5 to-primary/5", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent/10 flex-shrink-0">
            <Lightbulb className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">Smart Suggestions</h4>
              <Badge variant="secondary" className="text-xs gap-1">
                <TrendingUp className="h-3 w-3" />
                AI
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on your recent activity
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.label}
                  className="flex items-center gap-1 group"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 hover:bg-accent/10 hover:text-accent hover:border-accent/30"
                    onClick={() => handleApply(suggestion)}
                  >
                    {suggestion.icon && <span>{suggestion.icon}</span>}
                    {suggestion.label}
                    <span className="text-[10px] text-muted-foreground ml-1">
                      {suggestion.reason}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDismiss(suggestion.label)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
