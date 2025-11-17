import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SparkItemWrapperProps {
  children: React.ReactNode;
  itemId: string;
  itemType: 'feed_post' | 'portfolio_item' | 'community_post' | 'award' | 'press' | 'credit';
}

export const SparkItemWrapper = ({ children, itemId, itemType }: SparkItemWrapperProps) => {
  const [isClipped, setIsClipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkIfClipped();
  }, [itemId]);

  const checkIfClipped = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('saved_sparks')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .eq('item_type', getItemTypeForDb(itemType))
      .maybeSingle();

    setIsClipped(!!data);
  };

  const getItemTypeForDb = (type: string) => {
    if (type === 'feed_post') return 'post';
    if (type === 'portfolio_item') return 'portfolio';
    if (type === 'community_post') return 'post';
    return type;
  };

  const handleClip = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in to clip items");
      return;
    }

    // Optimistic update for immediate feedback
    setIsClipped(!isClipped);
    setIsLoading(true);
    
    try {
      if (isClipped) {
        await supabase
          .from('saved_sparks')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', itemId)
          .eq('item_type', getItemTypeForDb(itemType));
        
        toast.success("Removed from clipped");
      } else {
        await supabase
          .from('saved_sparks')
          .insert({
            user_id: user.id,
            item_id: itemId,
            item_type: getItemTypeForDb(itemType)
          });
        
        toast.success("Clipped! View in your collection");
      }
    } catch (error) {
      // Revert on error
      setIsClipped(isClipped);
      console.error('Error clipping item:', error);
      toast.error("Failed to clip item");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative group">
      {children}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClip}
        disabled={isLoading}
        className={cn(
          "absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200",
          "bg-background/80 backdrop-blur-sm hover:bg-background/90 hover:scale-110",
          isClipped && "opacity-100 text-primary scale-110",
          isLoading && "animate-pulse"
        )}
      >
        <Paperclip className={cn(
          "h-5 w-5 transition-all duration-200", 
          isClipped && "fill-current rotate-12"
        )} />
      </Button>
    </div>
  );
};
