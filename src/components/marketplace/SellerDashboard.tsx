import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Eye, ShoppingCart, DollarSign, Package, Star } from "lucide-react";

export function SellerDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: prods }, { data: ords }] = await Promise.all([
        supabase.from("digital_products").select("id, title, price, download_count, average_rating, review_count, preview_urls, listing_type").eq("user_id", user.id).eq("is_active", true),
        supabase.from("marketplace_orders").select("id, amount, platform_fee, status, created_at").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setProducts(prods || []);
      setOrders(ords || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const stats = useMemo(() => {
    const completed = orders.filter(o => o.status === "completed");
    const totalRevenue = completed.reduce((s, o) => s + (Number(o.amount) - Number(o.platform_fee || 0)), 0);
    const totalOrders = completed.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalDownloads = products.reduce((s, p) => s + (p.download_count || 0), 0);
    const avgRating = products.filter(p => p.average_rating).reduce((s, p, _, a) => s + (p.average_rating || 0) / a.length, 0);
    return { totalRevenue, totalOrders, avgOrderValue, totalDownloads, avgRating, activeListings: products.length };
  }, [products, orders]);

  if (loading) return <div className="h-40 animate-pulse bg-muted rounded-lg" />;

  const statCards = [
    { label: "Revenue", value: `$${stats.totalRevenue.toFixed(0)}`, icon: DollarSign, color: "text-green-500" },
    { label: "Orders", value: stats.totalOrders, icon: ShoppingCart, color: "text-primary" },
    { label: "Active Listings", value: stats.activeListings, icon: Package, color: "text-primary" },
    { label: "Downloads", value: stats.totalDownloads, icon: TrendingUp, color: "text-primary" },
    { label: "Avg Rating", value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—", icon: Star, color: "text-yellow-500" },
    { label: "Avg Order", value: `$${stats.avgOrderValue.toFixed(0)}`, icon: Eye, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Seller Analytics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(s => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Top Products */}
      {products.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {products.sort((a, b) => (b.download_count || 0) - (a.download_count || 0)).slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3 min-w-0">
                  {p.preview_urls?.[0] && (
                    <img src={p.preview_urls[0]} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{p.listing_type}</Badge>
                      <span>${p.price}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{p.download_count || 0}</p>
                  <p className="text-[10px] text-muted-foreground">downloads</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
