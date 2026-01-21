import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { useNavigate } from "react-router-dom";
import { ProductReviewDialog } from "@/components/product/ProductReviewDialog";
import {
  Download,
  Package,
  DollarSign,
  Calendar,
  ExternalLink,
  ShoppingBag,
  Store,
  TrendingUp,
  Star,
} from "lucide-react";

interface Purchase {
  id: string;
  product_id: string;
  amount: number;
  currency: string;
  status: string;
  download_url: string | null;
  download_count: number;
  created_at: string;
  completed_at: string | null;
  has_reviewed?: boolean;
  product?: {
    id: string;
    title: string;
    product_type: string;
    preview_urls: string[];
  };
}

interface Sale {
  id: string;
  product_id: string;
  amount: number;
  seller_amount: number;
  platform_fee: number;
  currency: string;
  status: string;
  created_at: string;
  product?: {
    id: string;
    title: string;
    product_type: string;
  };
  buyer?: {
    full_name: string;
  };
}

export default function MyPurchases() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesStats, setSalesStats] = useState({
    total: 0,
    count: 0,
    thisMonth: 0,
  });
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch purchases from product_purchases table
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('product_purchases')
        .select(`
          *,
          product:digital_products(id, title, product_type, preview_urls)
        `)
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (purchasesError) {
        console.error('Error fetching purchases:', purchasesError);
        // If table doesn't exist, just set empty
        setPurchases([]);
      } else {
        // Check which products user has reviewed
        const productIds = purchasesData?.map(p => p.product_id) || [];
        const { data: reviews } = await supabase
          .from('product_reviews')
          .select('product_id')
          .eq('reviewer_id', user?.id)
          .in('product_id', productIds.length > 0 ? productIds : ['00000000-0000-0000-0000-000000000000']);
        
        const reviewedProductIds = new Set(reviews?.map(r => r.product_id) || []);
        
        const purchasesWithReviewStatus = (purchasesData || []).map(p => ({
          id: p.id,
          product_id: p.product_id,
          amount: p.amount,
          currency: p.currency || 'usd',
          status: p.status,
          download_url: p.download_url,
          download_count: p.download_count || 0,
          created_at: p.created_at,
          completed_at: p.completed_at,
          has_reviewed: reviewedProductIds.has(p.product_id),
          product: p.product
        }));
        
        setPurchases(purchasesWithReviewStatus);
      }

      // Fetch sales (as seller)
      const { data: salesData, error: salesError } = await supabase
        .from('product_purchases')
        .select(`
          *,
          product:digital_products(id, title, product_type)
        `)
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (salesError) {
        console.error('Error fetching sales:', salesError);
        setSales([]);
      } else {
        // Fetch buyer info separately
        const salesWithBuyers = await Promise.all((salesData || []).map(async (sale) => {
          const { data: buyerData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', sale.buyer_id)
            .single();
          return {
            id: sale.id,
            product_id: sale.product_id,
            amount: sale.amount,
            seller_amount: sale.seller_amount || sale.amount,
            platform_fee: sale.platform_fee || 0,
            currency: sale.currency || 'usd',
            status: sale.status,
            created_at: sale.created_at,
            product: sale.product,
            buyer: buyerData || { full_name: 'Customer' }
          };
        }));
        
        setSales(salesWithBuyers);

        // Calculate sales stats
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const stats = salesWithBuyers.reduce((acc, sale) => {
          if (sale.status === 'completed') {
            acc.total += sale.seller_amount;
            acc.count += 1;
            if (new Date(sale.created_at) >= thisMonth) {
              acc.thisMonth += sale.seller_amount;
            }
          }
          return acc;
        }, { total: 0, count: 0, thisMonth: 0 });

        setSalesStats(stats);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load purchase data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <>
      <SEO title="My Purchases & Sales - ThriveIN" />
      <div className="container mx-auto py-8 px-4 max-w-6xl min-h-screen pb-24 md:pb-8">
        <h1 className="text-3xl font-bold mb-8">Purchases & Sales</h1>

        {/* Sales Stats */}
        {sales.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${salesStats.total.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{salesStats.count} sales</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${salesStats.thisMonth.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/thrivepay')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  ThrivePay Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">View</span>
                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Manage payouts</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="purchases" className="space-y-6">
          <TabsList>
            <TabsTrigger value="purchases" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              My Purchases ({purchases.length})
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              My Sales ({sales.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-4">
            {purchases.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No purchases yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Explore digital products from creators
                </p>
                <Button onClick={() => navigate('/discover')}>
                  Discover Creators
                </Button>
              </Card>
            ) : (
              purchases.map((purchase) => (
                <Card key={purchase.id} className="overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    {purchase.product?.preview_urls?.[0] && (
                      <img 
                        src={purchase.product.preview_urls[0]} 
                        alt={purchase.product?.title}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{purchase.product?.title || 'Product'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{purchase.product?.product_type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          ${purchase.amount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge 
                        variant={purchase.status === 'completed' ? 'default' : 'secondary'}
                      >
                        {purchase.status}
                      </Badge>
                      {purchase.download_url && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(purchase.download_url!, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                      {purchase.status === 'completed' && !purchase.has_reviewed && (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            setSelectedPurchase(purchase);
                            setReviewDialogOpen(true);
                          }}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      )}
                      {purchase.has_reviewed && (
                        <Badge variant="outline" className="text-xs">
                          ✓ Reviewed
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            {sales.length === 0 ? (
              <Card className="p-8 text-center">
                <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No sales yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add products to start selling
                </p>
                <Button onClick={() => navigate('/profile')}>
                  Add Products
                </Button>
              </Card>
            ) : (
              sales.map((sale) => (
                <Card key={sale.id} className="overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{sale.product?.title || 'Product'}</h3>
                      <p className="text-sm text-muted-foreground">
                        Purchased by {sale.buyer?.full_name || 'Customer'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(sale.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-500">
                        +${sale.seller_amount.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Fee: ${sale.platform_fee.toFixed(2)}
                      </p>
                      <Badge 
                        variant={sale.status === 'completed' ? 'default' : 'secondary'}
                      >
                        {sale.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
        
        {selectedPurchase && (
          <ProductReviewDialog
            open={reviewDialogOpen}
            onOpenChange={setReviewDialogOpen}
            productId={selectedPurchase.product_id}
            productTitle={selectedPurchase.product?.title || 'Product'}
            purchaseId={selectedPurchase.id}
            onSuccess={() => {
              fetchData();
              setSelectedPurchase(null);
            }}
          />
        )}
      </div>
    </>
  );
}