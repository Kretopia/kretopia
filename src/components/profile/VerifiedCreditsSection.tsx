import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Film, 
  Tv, 
  Music, 
  Disc3, 
  Video, 
  ExternalLink, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2
} from "lucide-react";

interface VerifiedCredit {
  id: string;
  source: string;
  source_id: string;
  credit_type: string;
  title: string;
  role: string;
  year: number | null;
  metadata: any;
  verification_url: string;
  verified_at: string;
}

interface VerifiedCreditsSectionProps {
  userId: string;
  isOwnProfile?: boolean;
  onCreditsChanged?: () => void;
}

import { Mic2 } from "lucide-react";

const CREDIT_TYPE_ICONS: Record<string, any> = {
  film: Film,
  movie: Film,
  tv: Tv,
  album: Disc3,
  single: Music,
  music_video: Video,
  podcast: Mic2,
  episode: Mic2,
};

const SOURCE_COLORS: Record<string, string> = {
  spotify: 'bg-green-500',
  youtube: 'bg-red-500',
  tmdb: 'bg-blue-500',
  imdb: 'bg-yellow-500',
  discogs: 'bg-orange-500',
};

export function VerifiedCreditsSection({ userId, isOwnProfile, onCreditsChanged }: VerifiedCreditsSectionProps) {
  const [credits, setCredits] = useState<VerifiedCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCredits();
  }, [userId]);

  const handleDeleteCredit = async (creditId: string) => {
    setDeletingId(creditId);
    try {
      const { error } = await supabase
        .from('verified_credits')
        .delete()
        .eq('id', creditId)
        .eq('user_id', userId);

      if (error) throw error;

      setCredits(prev => prev.filter(c => c.id !== creditId));
      onCreditsChanged?.();
      toast({
        title: "Credit removed",
        description: "The credit has been removed from your profile",
      });
    } catch (error: any) {
      console.error('Error deleting credit:', error);
      toast({
        title: "Error",
        description: "Failed to remove credit",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const fetchCredits = async () => {
    try {
      const { data, error } = await supabase
        .from('verified_credits')
        .select('*')
        .eq('user_id', userId)
        .order('year', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setCredits(data || []);
    } catch (error) {
      console.error('Error fetching verified credits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card aria-busy="true" aria-label="Loading verified credits">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading credits...</p>
        </CardContent>
      </Card>
    );
  }

  if (credits.length === 0) {
    if (!isOwnProfile) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Verified Credits
          </CardTitle>
          <CardDescription>
            Connect your platforms to import verified work credits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No verified credits yet. Connect Spotify, YouTube, IMDB, or Discogs to import your work.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group credits by type
  const groupedCredits = credits.reduce((acc, credit) => {
    const type = credit.credit_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(credit);
    return acc;
  }, {} as Record<string, VerifiedCredit[]>);

  const creditTypes = Object.keys(groupedCredits);
  const displayedCredits = expanded ? credits : credits.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Verified Credits
          <Badge variant="secondary" className="ml-2">
            {credits.length} verified
          </Badge>
        </CardTitle>
        <CardDescription>
          Work credits verified from industry databases
        </CardDescription>
      </CardHeader>
      <CardContent>
        {creditTypes.length > 1 ? (
          <Tabs defaultValue={creditTypes[0]} className="w-full">
            <TabsList className="w-full justify-start mb-4 overflow-x-auto">
              {creditTypes.map((type) => {
                const Icon = CREDIT_TYPE_ICONS[type] || Film;
                return (
                  <TabsTrigger key={type} value={type} className="capitalize">
                    <Icon className="h-4 w-4 mr-2" />
                    {type.replace('_', ' ')}s ({groupedCredits[type].length})
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {creditTypes.map((type) => (
              <TabsContent key={type} value={type}>
                <div className="grid gap-3">
                {groupedCredits[type].slice(0, expanded ? undefined : 6).map((credit) => (
                    <CreditItem 
                      key={credit.id} 
                      credit={credit} 
                      isOwnProfile={isOwnProfile}
                      onDelete={() => handleDeleteCredit(credit.id)}
                      isDeleting={deletingId === credit.id}
                    />
                  ))}
                </div>
                {groupedCredits[type].length > 6 && (
                  <Button
                    variant="ghost"
                    className="w-full mt-4"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show All {groupedCredits[type].length} Credits
                      </>
                    )}
                  </Button>
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <>
            <div className="grid gap-3">
              {displayedCredits.map((credit) => (
                <CreditItem 
                  key={credit.id} 
                  credit={credit} 
                  isOwnProfile={isOwnProfile}
                  onDelete={() => handleDeleteCredit(credit.id)}
                  isDeleting={deletingId === credit.id}
                />
              ))}
            </div>
            {credits.length > 6 && (
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show All {credits.length} Credits
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface CreditItemProps {
  credit: VerifiedCredit;
  isOwnProfile?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
}

function CreditItem({ credit, isOwnProfile, onDelete, isDeleting }: CreditItemProps) {
  const Icon = CREDIT_TYPE_ICONS[credit.credit_type] || Film;
  const sourceColor = SOURCE_COLORS[credit.source] || 'bg-gray-500';
  const thumbnailUrl = credit.metadata?.posterUrl || credit.metadata?.imageUrl || credit.metadata?.thumbUrl || credit.metadata?.thumbnailUrl;

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={credit.title}
          className="w-12 h-12 rounded object-cover"
        />
      ) : (
        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{credit.title}</h4>
          <Badge variant="outline" className={`${sourceColor} bg-opacity-10 text-xs`}>
            {credit.source.toUpperCase()}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {credit.role}
          {credit.year && <span className="ml-2">• {credit.year}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {credit.verification_url && (
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href={credit.verification_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        {isOwnProfile && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
