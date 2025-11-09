import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, Download, DollarSign, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";

interface DigitalProduct {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  product_type: string;
  category: string;
  preview_urls: string[];
  demo_url?: string;
  download_count: number;
  tags: string[];
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
    role: string;
  };
}

const Marketplace = () => {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, typeFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('digital_products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('product_type', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
        const productsWithProfiles = data.map(product => ({
          ...product,
          profiles: profileMap.get(product.user_id)
        }));
        
        setProducts(productsWithProfiles as any);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    searchQuery === "" ||
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO 
        title="Digital Products Marketplace"
        description="Browse and purchase digital products from creators - templates, assets, courses, and more"
      />
      
      <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="h-8 w-8" />
            Digital Marketplace
          </h1>
          <p className="text-muted-foreground">
            Discover and purchase digital products from talented creators
          </p>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="writing">Writing</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="template">Templates</SelectItem>
                <SelectItem value="asset">Asset Packs</SelectItem>
                <SelectItem value="course">Courses</SelectItem>
                <SelectItem value="ebook">eBooks</SelectItem>
                <SelectItem value="music">Music/Audio</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate(`/profile/${product.user_id}`)}
              >
                {product.preview_urls?.[0] && (
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    <img 
                      src={product.preview_urls[0]} 
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold line-clamp-1">{product.title}</h3>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {product.product_type}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                  
                  {product.profiles && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        {product.profiles.avatar_url ? (
                          <img 
                            src={product.profiles.avatar_url} 
                            alt={product.profiles.full_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium">
                            {product.profiles.full_name?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span>{product.profiles.full_name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-primary">
                        ${product.price}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {product.download_count}
                      </span>
                    </div>
                    
                    <Button size="sm">
                      View
                    </Button>
                  </div>
                  
                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {product.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;