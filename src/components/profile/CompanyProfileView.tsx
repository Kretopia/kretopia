import { Building2, MapPin, Users, Star, Award, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LeaveCompanyReviewDialog } from "./LeaveCompanyReviewDialog";

interface CompanyReview {
  id: string;
  reviewer_name: string;
  reviewer_avatar: string;
  rating: number;
  review_text: string;
  created_at: string;
  response_text?: string;
}

interface PartnerDiscount {
  id: string;
  discount_type: string;
  discount_value: string;
  description: string;
  redemption_code?: string;
}

interface CompanyProfileViewProps {
  profile: any;
  reviews: CompanyReview[];
  partnerDiscounts?: PartnerDiscount[];
  isOwnProfile: boolean;
  onLeaveReview?: () => void;
  onRefresh?: () => void;
}

export const CompanyProfileView = ({
  profile,
  reviews,
  partnerDiscounts,
  isOwnProfile,
  onLeaveReview,
  onRefresh,
}: CompanyProfileViewProps) => {
  return (
    <div className="space-y-6">
      {/* Company Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="w-32 h-32 rounded-lg">
              <AvatarImage src={profile.company_logo_url} alt={profile.company_name} />
              <AvatarFallback className="rounded-lg text-4xl">
                <Building2 className="w-16 h-16" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-3xl font-bold mb-1">{profile.company_name}</h1>
                  {profile.company_industry && (
                    <p className="text-muted-foreground">{profile.company_industry}</p>
                  )}
                </div>
                {profile.badge && (
                  <Badge variant="secondary" className="text-sm">
                    {profile.badge === "og" ? "🌟 OG Member" : "Beta Member"}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mb-4">
                {profile.company_address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{profile.company_address}</span>
                  </div>
                )}
                {profile.company_size && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{profile.company_size}</span>
                  </div>
                )}
              </div>

              {profile.average_rating > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.floor(profile.average_rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold">{profile.average_rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({profile.total_reviews} {profile.total_reviews === 1 ? "review" : "reviews"})
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About Section */}
      {profile.company_about && (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{profile.company_about}</p>
          </CardContent>
        </Card>
      )}

      {/* Gallery Section */}
      {profile.company_images && Array.isArray(profile.company_images) && profile.company_images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gallery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(profile.company_images as string[]).map((imageUrl: string, index: number) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={imageUrl}
                    alt={`${profile.company_name} - Image ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => window.open(imageUrl, '_blank')}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partner Discounts Section */}
      {partnerDiscounts && partnerDiscounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Member Benefits & Discounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {partnerDiscounts.map((discount) => (
              <div key={discount.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      {discount.discount_type === "percentage" ? "%" : "$"} {discount.discount_value}
                    </Badge>
                    <p className="font-medium">{discount.description}</p>
                  </div>
                </div>
                {discount.redemption_code && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">Promo Code:</p>
                    <code className="text-sm font-mono font-bold">{discount.redemption_code}</code>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Reviews Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Reviews & Ratings
            </CardTitle>
            {!isOwnProfile && (
              <LeaveCompanyReviewDialog
                companyId={profile.user_id}
                companyName={profile.company_name}
                onReviewSubmitted={onRefresh}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No reviews yet. Be the first to leave a review!
            </p>
          ) : (
            <div className="space-y-6">
              {reviews.map((review, index) => (
                <div key={review.id}>
                  {index > 0 && <Separator className="my-6" />}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={review.reviewer_avatar} />
                        <AvatarFallback>{review.reviewer_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold">{review.reviewer_name}</p>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm">{review.review_text}</p>
                      </div>
                    </div>

                    {review.response_text && (
                      <div className="ml-12 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Response from {profile.company_name}</p>
                        <p className="text-sm text-muted-foreground">{review.response_text}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
