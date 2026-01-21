import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import {
  CheckCircle,
  Download,
  ExternalLink,
  Package,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function PurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [downloadUrls, setDownloadUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const productId = searchParams.get('product_id');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (productId && sessionId) {
      completePurchase();
    } else {
      setError("Missing purchase information");
      setLoading(false);
    }
  }, [productId, sessionId]);

  const completePurchase = async () => {
    try {
      setLoading(true);

      // Complete the purchase and get download URLs
      const { data, error: completeError } = await supabase.functions.invoke(
        'complete-product-purchase',
        {
          body: { sessionId, productId }
        }
      );

      if (completeError) throw completeError;

      if (data?.downloadUrls) {
        setDownloadUrls(data.downloadUrls);
      }

      // Fetch product details
      const { data: productData } = await supabase
        .from('digital_products')
        .select('*, profiles!digital_products_user_id_fkey(full_name)')
        .eq('id', productId)
        .single();

      if (productData) {
        setProduct(productData);
      }

      toast({
        title: "Purchase Complete! 🎉",
        description: "Your files are ready to download",
      });

    } catch (err: any) {
      console.error('Error completing purchase:', err);
      setError(err.message || "Failed to complete purchase");
      toast({
        title: "Error",
        description: "There was an issue completing your purchase. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Processing your purchase...</p>
            <p className="text-sm text-muted-foreground">Please wait a moment</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              If you were charged, please contact support with your session ID: {sessionId}
            </p>
            <Button onClick={() => navigate('/spark')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO title="Purchase Complete - ThriveIN" />
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Purchase Complete!</CardTitle>
            <CardDescription>
              Thank you for your purchase. Your files are ready.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Product Info */}
            {product && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {product.preview_urls?.[0] && (
                    <img 
                      src={product.preview_urls[0]} 
                      alt={product.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{product.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      by {product.profiles?.full_name}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{product.product_type}</Badge>
                      <span className="font-bold text-primary">${product.price}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Download Section */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Your Downloads
              </h4>
              
              {downloadUrls.length > 0 ? (
                <div className="space-y-2">
                  {downloadUrls.map((url, index) => (
                    <Button 
                      key={index}
                      variant="outline" 
                      className="w-full justify-between"
                      onClick={() => window.open(url, '_blank')}
                    >
                      <span className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Download File {downloadUrls.length > 1 ? index + 1 : ''}
                      </span>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Download links will be sent to your email and available in your purchases.
                </p>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <Link to="/purchases" className="block">
                <Button variant="outline" className="w-full">
                  View All Purchases
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              
              <Link to="/spark" className="block">
                <Button className="w-full">
                  Continue Exploring
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              A receipt has been sent to your email. For any issues, contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
