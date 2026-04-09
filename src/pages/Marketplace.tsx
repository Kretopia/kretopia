import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShoppingBag, Search, Download, Wrench, ShieldAlert, Heart, BarChart3, 
  TrendingUp, Star, Zap, ArrowRight, Sparkles, Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import CreateListingDialog from "@/components/marketplace/CreateListingDialog";
import ListingCard from "@/components/marketplace/ListingCard";
import { SellerDashboard } from "@/components/marketplace/SellerDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";

const LISTING_TYPE_TABS = [
  { value: "all", label: "All", icon: ShoppingBag },
  { value: "digital", label: "Digital", icon: Download },
  { value: "service", label: "Services", icon: Wrench },
  { value: "physical", label: "Physical", icon: Package },
];

const CATEGORY_CARDS = [
  { value: "music", emoji: "", label: "Music & Audio", gradient: "from-violet-500/20 to-fuchsia-500/20" },
  { value: "design", emoji: "", label: "Design", gradient: "from-primary/20 to-rose-500/20" },
  { value: "video", emoji: "", label: "Video & Film", gradient: "from-orange-500/20 to-amber-500/20" },
  { value: "photography", emoji: "", label: "Photography", gradient: "from-cyan-500/20 to-blue-500/20" },
  { value: "development", emoji: "", label: "Web & App", gradient: "from-emerald-500/20 to-green-500/20" },
  { value: "education", emoji: "", label: "Courses", gradient: "from-primary/20 to-primary/20" },
];

const Marketplace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [listingTypeFilter, setListingTypeFilter] = useState("all");
  const [activeView, setActiveView] = useState("browse");
  const { toast } = useToast();
  const { wishlistIds, toggleWishlist } = useWishlist();

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, listingTypeFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("digital_products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
      if (listingTypeFilter !== "all") query = query.eq("listing_type", listingTypeFilter);

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((p) => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role")
          .in("user_id", userIds);
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
        setProducts(data.map((product) => ({ ...product, profiles: profileMap.get(product.user_id) })));
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({ title: "Error", description: "Failed to load listings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      searchQuery === "" ||
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const savedProducts = products.filter(p => wishlistIds.has(p.id));
  const trendingProducts = [...products].sort((a, b) => (b.download_count || 0) - (a.download_count || 0)).slice(0, 6);
  const featuredProducts = products.filter(p => p.preview_urls?.length > 0).slice(0, 4);

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="Thrive Market" description="Buy and sell digital products and creative services on ThriveIN" />

      <div className="container mx-auto max-w-7xl px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              Thrive Market
            </h1>
            <p className="text-sm text-muted-foreground">
              Creative products, services & tools from the community
            </p>
          </div>
          {user && <CreateListingDialog onCreated={fetchProducts} />}
        </div>

        {/* View Tabs */}
        {user && (
          <Tabs value={activeView} onValueChange={setActiveView}>
            <TabsList className="grid w-full grid-cols-3 h-10 rounded-xl bg-muted/60 p-1">
              <TabsTrigger value="browse" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> Browse
              </TabsTrigger>
              <TabsTrigger value="saved" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Heart className="h-3.5 w-3.5" /> Saved
                {savedProducts.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{savedProducts.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="selling" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <BarChart3 className="h-3.5 w-3.5" /> My Sales
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Content based on active view */}
        {activeView === "selling" && user ? (
          <SellerDashboard />
        ) : activeView === "saved" && user ? (
          savedProducts.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary/40" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No saved listings</h3>
              <p className="text-sm text-muted-foreground mb-4">Tap the heart icon on any listing to save it here</p>
              <Button variant="outline" onClick={() => setActiveView("browse")}>Browse Market</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedProducts.map((listing) => (
                <ListingCard key={listing.id} listing={listing} isSaved={true} onToggleSave={toggleWishlist} />
              ))}
            </div>
          )
        ) : (
          <>
            {/* Featured Hero Banner */}
            {featuredProducts.length > 0 && (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-border/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Featured</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                  {featuredProducts.map(p => (
                    <div key={p.id} className="shrink-0 w-[160px] group cursor-pointer" onClick={() => navigate(`/market/${p.id}`)}>
                      <div className="aspect-[4/3] rounded-lg overflow-hidden mb-2 border border-border/30">
                        <img src={p.preview_urls[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      </div>
                      <p className="text-xs font-medium line-clamp-1">{p.title}</p>
                      <p className="text-xs text-primary font-bold">${p.price}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Quick Browse */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-primary" /> Browse by Category
                </h3>
                {categoryFilter !== "all" && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setCategoryFilter("all")}>
                    Clear filter
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {CATEGORY_CARDS.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategoryFilter(categoryFilter === cat.value ? "all" : cat.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${
                      categoryFilter === cat.value 
                        ? "border-primary bg-primary/10 shadow-sm" 
                        : "border-border/50 bg-gradient-to-br " + cat.gradient + " hover:border-border hover:shadow-sm"
                    }`}
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <span className="text-[10px] font-medium leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Section */}
            {trendingProducts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Trending Now</h3>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                  {trendingProducts.map(p => (
                    <div key={p.id} className="shrink-0 w-[200px]">
                      <ListingCard listing={p} isSaved={wishlistIds.has(p.id)} onToggleSave={toggleWishlist} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listing Type Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {LISTING_TYPE_TABS.map((tab) => {
                const isActive = listingTypeFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setListingTypeFilter(tab.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products, services, tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-muted/50"
              />
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
              <ShieldAlert className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-medium">Secure marketplace.</span> All transactions are protected through escrow.
                Funds are held securely until you confirm delivery.
              </p>
            </div>

            {/* Listings Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden animate-pulse">
                    <div className="aspect-video bg-muted" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="h-8 w-8 text-primary/40" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No listings found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {listingTypeFilter !== "all"
                    ? `No ${listingTypeFilter} listings yet. Be the first to list one!`
                    : "Try adjusting your filters or be the first to list something"}
                </p>
                {user && <CreateListingDialog onCreated={fetchProducts} />}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} isSaved={wishlistIds.has(listing.id)} onToggleSave={toggleWishlist} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
