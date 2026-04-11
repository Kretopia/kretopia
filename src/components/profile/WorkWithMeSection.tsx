import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, MessageSquarePlus, Clock, DollarSign, Star, Download, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateServiceDialog } from "./CreateServiceDialog";
import { CustomProjectRequestDialog } from "./CustomProjectRequestDialog";

interface ServiceTier {
  id: string;
  tier_name: string;
  price: number;
  currency: string;
  deliverables: string[];
  delivery_days: number | null;
  tier_order: number;
}

interface CreatorService {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  delivery_time: string | null;
  service_format: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  is_active: boolean;
  tiers: ServiceTier[];
}

interface DigitalProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  listing_type: string;
  preview_urls: string[] | null;
  download_count: number | null;
  average_rating: number | null;
  review_count: number | null;
  tags: string[] | null;
}

interface WorkWithMeSectionProps {
  userId: string;
  isOwner: boolean;
  creatorName?: string;
}

export const WorkWithMeSection = ({ userId, isOwner, creatorName }: WorkWithMeSectionProps) => {
  const [services, setServices] = useState<CreatorService[]>([]);
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [showProjectRequest, setShowProjectRequest] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [servicesRes, productsRes] = await Promise.all([
        supabase
          .from('creator_services')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('digital_products')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (productsRes.error) throw productsRes.error;

      // Fetch tiers for all services
      const serviceIds = (servicesRes.data || []).map((s: any) => s.id);
      let tiers: any[] = [];
      if (serviceIds.length > 0) {
        const { data: tiersData } = await supabase
          .from('service_tiers')
          .select('*')
          .in('service_id', serviceIds)
          .order('tier_order');
        tiers = tiersData || [];
      }

      const servicesWithTiers = (servicesRes.data || []).map((s: any) => ({
        ...s,
        tiers: tiers.filter((t: any) => t.service_id === s.id),
      }));

      setServices(servicesWithTiers);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error fetching work-with-me data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFormatLabel = (format: string | null) => {
    const labels: Record<string, string> = {
      virtual: "Virtual",
      in_person: "In Person",
      both: "Virtual or In Person",
    };
    return labels[format || ''] || format;
  };

  const hasContent = services.length > 0 || products.length > 0;

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (!isOwner && !hasContent) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">
          {isOwner ? "Your Offerings" : `Work With ${creatorName?.split(' ')[0] || 'Me'}`}
        </h2>
        {isOwner && (
          <Button size="sm" onClick={() => setShowAddService(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Service
          </Button>
        )}
      </div>

      {!hasContent && isOwner && (
        <EmptyState
          icon={Sparkles}
          title="Start earning from your profile"
          description="Add services, packages, or digital products. Share your profile link to convert visitors into clients."
          action={{
            label: "Add Your First Service",
            onClick: () => setShowAddService(true),
          }}
        />
      )}

      {/* Services */}
      {services.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Services</h3>
          <div className="grid gap-4">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} isOwner={isOwner} />
            ))}
          </div>
        </div>
      )}

      {/* Digital Products */}
      {products.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Products
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {products.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/market/${product.id}`)}
              >
                {product.preview_urls?.[0] && (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img
                      src={product.preview_urls[0]}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <div className="p-3">
                  <h4 className="font-semibold text-sm line-clamp-1">{product.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{product.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-primary text-sm">${product.price}</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      Buy Now
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Request Custom Project CTA */}
      {!isOwner && hasContent && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm">Need something custom?</h4>
              <p className="text-xs text-muted-foreground">
                Describe your project and {creatorName?.split(' ')[0] || 'this creator'} will get back to you.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (!user) {
                  navigate('/auth');
                  return;
                }
                setShowProjectRequest(true);
              }}
            >
              Request Project
            </Button>
          </div>
        </Card>
      )}

      {/* Dialogs */}
      <CreateServiceDialog
        open={showAddService}
        onOpenChange={setShowAddService}
        onCreated={fetchData}
      />

      {!isOwner && (
        <CustomProjectRequestDialog
          open={showProjectRequest}
          onOpenChange={setShowProjectRequest}
          creatorId={userId}
          creatorName={creatorName || 'Creator'}
        />
      )}
    </div>
  );
};

// Service Card sub-component
function ServiceCard({ service, isOwner }: { service: CreatorService; isOwner: boolean }) {
  const navigate = useNavigate();
  const lowestPrice = service.tiers.length > 0
    ? Math.min(...service.tiers.map(t => t.price))
    : null;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {service.cover_image_url && (
          <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
            <img src={service.cover_image_url} alt={service.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm line-clamp-1">{service.title}</h4>
            {service.service_format && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {service.service_format === 'virtual' ? 'Virtual' : service.service_format === 'in_person' ? 'In Person' : 'Virtual/In Person'}
              </Badge>
            )}
          </div>
          {service.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{service.description}</p>
          )}

          {/* Tiers */}
          {service.tiers.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {service.tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex-shrink-0 border rounded-lg p-2.5 min-w-[140px] bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{tier.tier_name}</span>
                    <span className="text-xs font-bold text-primary">${tier.price}</span>
                  </div>
                  {tier.delivery_days && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
                      <Clock className="h-2.5 w-2.5" />
                      {tier.delivery_days} day{tier.delivery_days !== 1 ? 's' : ''}
                    </div>
                  )}
                  {tier.deliverables.length > 0 && (
                    <ul className="space-y-0.5">
                      {tier.deliverables.slice(0, 3).map((d, i) => (
                        <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                          <span className="text-primary mt-0.5">✓</span>
                          <span className="line-clamp-1">{d}</span>
                        </li>
                      ))}
                      {tier.deliverables.length > 3 && (
                        <li className="text-[10px] text-muted-foreground">
                          +{tier.deliverables.length - 3} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {lowestPrice !== null && (
                <span className="text-sm font-bold text-primary">
                  {service.tiers.length > 1 ? `From $${lowestPrice}` : `$${lowestPrice}`}
                </span>
              )}
              {service.tags?.slice(0, 2).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
            {!isOwner && (
              <Button size="sm" variant="outline" className="h-7 text-xs">
                Book Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
