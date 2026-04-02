import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Star, MapPin, DollarSign, Camera, Building2, Palette, Music, ExternalLink, Globe, Phone, Loader2, User } from "lucide-react";
import type { CreativeLocation } from "./LocationListItem";

interface LocationDetailDialogProps {
  location: CreativeLocation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Review {
  id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  image_urls: string[];
  created_at: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string; emoji: string }> = {
  studio: { icon: Music, color: 'text-purple-500', label: 'Studio', emoji: '🎙️' },
  creative_space: { icon: Palette, color: 'text-emerald-500', label: 'Creative Space', emoji: '🎨' },
  shoot_spot: { icon: Camera, color: 'text-rose-500', label: 'Shoot Spot', emoji: '📸' },
  venue: { icon: Building2, color: 'text-blue-500', label: 'Venue', emoji: '🎤' },
};

export function LocationDetailDialog({ location, open, onOpenChange }: LocationDetailDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const config = location ? (TYPE_CONFIG[location.location_type] || TYPE_CONFIG.shoot_spot) : TYPE_CONFIG.shoot_spot;

  // Fetch reviews when dialog opens
  useEffect(() => {
    if (!location || !open) return;
    fetchReviews();
  }, [location?.id, open]);

  const fetchReviews = async () => {
    if (!location) return;
    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from('location_reviews')
        .select('*')
        .eq('location_id', location.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch reviewer profiles
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      let profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        
        (profiles || []).forEach(p => {
          profileMap[p.user_id] = { full_name: p.full_name || 'Anonymous', avatar_url: p.avatar_url };
        });
      }

      const enrichedReviews: Review[] = (data || []).map(r => ({
        ...r,
        image_urls: r.image_urls || [],
        reviewer_name: profileMap[r.user_id]?.full_name || 'Anonymous',
        reviewer_avatar: profileMap[r.user_id]?.avatar_url || undefined,
      }));

      setReviews(enrichedReviews);
      
      // Check if current user has already reviewed
      const existing = enrichedReviews.find(r => r.user_id === user?.id);
      if (existing) {
        setHasReviewed(true);
        setUserRating(existing.rating);
        setReviewText(existing.review_text || '');
      } else {
        setHasReviewed(false);
        setUserRating(0);
        setReviewText('');
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !location || userRating === 0) return;
    setSubmitting(true);
    try {
      if (hasReviewed) {
        // Update existing review
        const { error } = await supabase
          .from('location_reviews')
          .update({ rating: userRating, review_text: reviewText.trim() || null })
          .eq('location_id', location.id)
          .eq('user_id', user.id);
        if (error) throw error;
        toast({ title: "Review updated ✨" });
      } else {
        // Create new review
        const { error } = await supabase
          .from('location_reviews')
          .insert({
            location_id: location.id,
            user_id: user.id,
            rating: userRating,
            review_text: reviewText.trim() || null,
          });
        if (error) throw error;
        toast({ title: "Review submitted ⭐" });
      }
      setHasReviewed(true);
      fetchReviews();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!location) return null;

  const allImages = [
    ...(location.cover_image_url ? [location.cover_image_url] : []),
    ...(location.image_urls || []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
        {/* Hero Image / Gradient */}
        {allImages.length > 0 ? (
          <div className="relative h-48 bg-muted">
            <img 
              src={allImages[activeImageIndex]} 
              alt={location.name}
              className="w-full h-full object-cover"
            />
            {allImages.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === activeImageIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            )}
            <Badge className="absolute top-3 left-3 gap-1" variant="secondary">
              {config.emoji} {config.label}
            </Badge>
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-4xl">{config.emoji}</span>
          </div>
        )}

        <div className="px-6 pb-6 space-y-5">
          {/* Title & Rating */}
          <div className="pt-4">
            <h2 className="text-xl font-bold">{location.name}</h2>
            <div className="flex items-center gap-3 mt-1.5">
              {(location.average_rating ?? 0) > 0 && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(Number(location.average_rating)) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`} />
                  ))}
                  <span className="text-sm font-medium ml-1">{Number(location.average_rating).toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({location.review_count})</span>
                </div>
              )}
              {location.address && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {location.address}{location.city ? `, ${location.city}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {location.description && (
            <p className="text-sm text-muted-foreground">{location.description}</p>
          )}

          {/* Rental Info */}
          {location.is_rentable && location.price_per_hour && (
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      ${location.price_per_hour} {location.price_currency || 'USD'}/hr
                    </p>
                    <p className="text-xs text-muted-foreground">Available for rent</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs">
                  Enquire
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Amenities */}
          {(location.amenities?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {location.amenities!.map(a => (
                  <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {(location.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {location.tags!.map(t => (
                <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>
              ))}
            </div>
          )}

          {/* Pinned by */}
          {location.creator_name && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarImage src={location.creator_avatar || undefined} />
                <AvatarFallback className="text-[8px]">{location.creator_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              Pinned by {location.creator_name}
            </div>
          )}

          {/* Distance */}
          <div className="flex items-center gap-1 text-xs text-primary">
            <MapPin className="h-3 w-3" />
            {location.distance_km < 1 
              ? `${Math.round(location.distance_km * 1000)}m away` 
              : `${location.distance_km.toFixed(1)}km away`
            }
          </div>

          {/* Reviews Section */}
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-sm mb-3">Reviews ({reviews.length})</h3>
            
            {/* Write a review */}
            {user && (
              <Card className="mb-4">
                <CardContent className="p-3 space-y-3">
                  <p className="text-xs font-medium">{hasReviewed ? 'Update your review' : 'Rate this spot'}</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setUserRating(s)}
                      >
                        <Star className={`h-6 w-6 transition-colors ${
                          s <= (hoverRating || userRating) 
                            ? 'fill-amber-500 text-amber-500' 
                            : 'text-muted-foreground/30'
                        }`} />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience..."
                    rows={2}
                    className="text-sm"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleSubmitReview} 
                    disabled={submitting || userRating === 0}
                    className="w-full"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    {hasReviewed ? 'Update Review' : 'Submit Review'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Reviews list */}
            {loadingReviews ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No reviews yet — be the first!
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map(review => (
                  <div key={review.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={review.reviewer_avatar} />
                      <AvatarFallback className="text-xs">
                        {review.reviewer_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{review.reviewer_name}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/20'}`} />
                          ))}
                        </div>
                      </div>
                      {review.review_text && (
                        <p className="text-xs text-muted-foreground mt-0.5">{review.review_text}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
