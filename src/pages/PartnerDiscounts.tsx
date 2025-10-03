import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ExternalLink, Copy, Check, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function PartnerDiscounts() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [userTier, setUserTier] = useState('free');
  const { toast } = useToast();

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      setUserTier(profile.subscription_tier);
    }

    const { data } = await supabase
      .from('partner_discounts')
      .select('*')
      .eq('is_active', true)
      .order('tier_required', { ascending: false });

    setDiscounts(data || []);
    setLoading(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Code copied!", description: code });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const categories = ['all', 'coworking', 'software', 'education', 'wellness', 'services'];

  return (
    <div className="min-h-screen p-6">
      <div className="container max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            Partner Discounts
          </h1>
          <p className="text-muted-foreground">Exclusive deals for Thrive members</p>
        </div>

        <Tabs defaultValue="all" className="mb-6">
          <TabsList>
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="capitalize">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(category => (
            <TabsContent key={category} value={category}>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {discounts
                  .filter(d => category === 'all' || d.category === category)
                  .map(discount => (
                    <Card key={discount.id} className="relative overflow-hidden">
                      {discount.tier_required !== 'free' && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="secondary" className="gap-1">
                            <Crown className="h-3 w-3" />
                            {discount.tier_required === 'thriver' ? 'Thriver' : 'Pro'}
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader>
                        <img
                          src={discount.partner_logo_url}
                          alt={discount.partner_name}
                          className="h-16 w-16 object-contain mb-3 rounded"
                        />
                        <CardTitle>{discount.partner_name}</CardTitle>
                        <CardDescription>{discount.description}</CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div className="text-2xl font-bold text-primary">
                          {discount.discount_value}
                        </div>

                        {discount.redemption_code && (
                          <div className="flex gap-2">
                            <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                              {discount.redemption_code}
                            </code>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => copyCode(discount.redemption_code)}
                            >
                              {copiedCode === discount.redemption_code ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}

                        {discount.redemption_url && (
                          <Button className="w-full" variant="gradient" asChild>
                            <a href={discount.redemption_url} target="_blank" rel="noopener noreferrer">
                              Redeem Offer
                              <ExternalLink className="h-4 w-4 ml-2" />
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
