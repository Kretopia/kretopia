import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Download, Star, DollarSign, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddDigitalProductDialog } from "./AddDigitalProductDialog";

interface DigitalProduct {
  id: string;
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
}

interface DigitalProductsSectionProps {
  userId: string;
  isOwner: boolean;
}

export const DigitalProductsSection = ({ userId, isOwner }: DigitalProductsSectionProps) => {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, [userId]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('digital_products')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load digital products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Digital Products</h3>
        </div>
        <p className="text-sm text-muted-foreground">Loading products...</p>
      </Card>
    );
  }

  if (!isOwner && products.length === 0) {
    return null; // Don't show section if user has no products and viewer isn't owner
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Digital Products</h3>
            {products.length > 0 && (
              <Badge variant="secondary">{products.length}</Badge>
            )}
          </div>
          {isOwner && (
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-4">
              {isOwner 
                ? "Start selling your digital creations! Templates, assets, courses, and more."
                : "No digital products yet"}
            </p>
            {isOwner && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Product
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {product.preview_urls?.[0] && (
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    <img 
                      src={product.preview_urls[0]} 
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm line-clamp-1">{product.title}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {product.product_type}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {product.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">
                        ${product.price}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {product.download_count}
                      </span>
                    </div>
                    
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                  
                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
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
      </Card>

      <AddDigitalProductDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchProducts}
      />
    </>
  );
};