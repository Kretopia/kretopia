import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingBag, Search, Download, Package, Wrench, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import CreateListingDialog from "@/components/marketplace/CreateListingDialog";
import ListingCard from "@/components/marketplace/ListingCard";
import { useAuth } from "@/contexts/AuthContext";

const LISTING_TYPE_TABS = [
  { value: "all", label: "All", icon: ShoppingBag },
  { value: "digital", label: "Digital", icon: Download },
  { value: "physical", label: "Physical", icon: Package },
  { value: "service", label: "Services", icon: Wrench },
];

const Marketplace = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [listingTypeFilter, setListingTypeFilter] = useState("all");
  const { toast } = useToast();

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

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (listingTypeFilter !== "all") {
        query = query.eq("listing_type", listingTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((p) => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
        setProducts(
          data.map((product) => ({
            ...product,
            profiles: profileMap.get(product.user_id),
          }))
        );
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO
        title="Creator Marketplace"
        description="Buy and sell digital products, physical items, and creative services"
      />

      <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShoppingBag className="h-8 w-8" />
              Market
            </h1>
            <p className="text-muted-foreground">
              Digital products, gear, and creative services from the community
            </p>
          </div>
          {user && <CreateListingDialog onCreated={fetchProducts} />}
        </div>

        {/* Marketplace Disclaimer Banner */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border">
          <ShieldAlert className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium">Peer-to-peer marketplace.</span> ThriveIN connects buyers and sellers but does not verify listings, 
            process payments for physical items, or guarantee transactions. Please do your own due diligence before purchasing.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {LISTING_TYPE_TABS.map((tab) => {
            const isActive = listingTypeFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setListingTypeFilter(tab.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Category Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="music">Music</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="photography">Photography</SelectItem>
              <SelectItem value="fashion">Fashion</SelectItem>
              <SelectItem value="art">Art</SelectItem>
              <SelectItem value="writing">Writing</SelectItem>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No listings found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {listingTypeFilter !== "all"
                ? `No ${listingTypeFilter} listings yet. Be the first!`
                : "Try adjusting your filters or search query"}
            </p>
            {user && <CreateListingDialog onCreated={fetchProducts} />}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
