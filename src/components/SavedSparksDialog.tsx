import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Paperclip, Award, Newspaper, Briefcase, FileText } from "lucide-react";
import { toast } from "sonner";

interface SavedSparksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SavedSparksDialog = ({ open, onOpenChange }: SavedSparksDialogProps) => {
  const { data: savedSparks, isLoading, refetch } = useQuery({
    queryKey: ['saved-sparks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('saved_sparks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch details for each saved item
      const itemsWithDetails = await Promise.all(
        data.map(async (saved) => {
          let details: any = null;
          
          switch (saved.item_type) {
            case 'portfolio': {
              const { data: itemData } = await supabase
                .from('portfolio_items')
                .select('*, profiles:user_id(full_name, avatar_url, role)')
                .eq('id', saved.item_id)
                .single();
              details = itemData;
              break;
            }
            case 'award': {
              const { data: itemData } = await supabase
                .from('awards')
                .select('*, profiles:user_id(full_name, avatar_url, role)')
                .eq('id', saved.item_id)
                .single();
              details = itemData;
              break;
            }
            case 'press': {
              const { data: itemData } = await supabase
                .from('press_links')
                .select('*, profiles:user_id(full_name, avatar_url, role)')
                .eq('id', saved.item_id)
                .single();
              details = itemData;
              break;
            }
            case 'credit': {
              const { data: itemData } = await supabase
                .from('credits')
                .select('*, profiles:user_id(full_name, avatar_url, role)')
                .eq('id', saved.item_id)
                .single();
              details = itemData;
              break;
            }
            case 'post': {
              const { data: itemData } = await supabase
                .from('feed_posts')
                .select('*, profiles:user_id(full_name, avatar_url, role)')
                .eq('id', saved.item_id)
                .single();
              details = itemData;
              break;
            }
          }

          return { ...saved, details };
        })
      );

      return itemsWithDetails.filter(item => item.details);
    },
    enabled: open,
  });

  const handleUnsave = async (itemType: string, itemId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('saved_sparks')
      .delete()
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId);

    if (error) {
      toast.error("Failed to unclip item");
      return;
    }

    toast.success("Unclipped!");
    refetch();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'portfolio':
        return <Briefcase className="h-4 w-4" />;
      case 'award':
        return <Award className="h-4 w-4" />;
      case 'press':
        return <Newspaper className="h-4 w-4" />;
      case 'credit':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTitle = (item: any) => {
    return item.details?.title || item.details?.name || item.details?.project_name || 'Untitled';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Clipped Items
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : savedSparks?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No clipped items yet. Start clipping posts and work for inspiration!
            </div>
          ) : (
            savedSparks?.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getIcon(item.item_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{getTitle(item)}</h4>
                  <p className="text-sm text-muted-foreground capitalize">{item.item_type}</p>
                  {item.details?.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.details.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnsave(item.item_type, item.item_id)}
                >
                  <Paperclip className="h-4 w-4 fill-current" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
