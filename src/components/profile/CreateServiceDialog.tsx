import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "music", "design", "video", "photography", "fashion", "art", "writing", "development", "coaching", "consulting", "other"
];

interface Tier {
  tier_name: string;
  price: string;
  delivery_days: string;
  deliverables: string[];
}

interface CreateServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export const CreateServiceDialog = ({ open, onOpenChange, onCreated }: CreateServiceDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [serviceFormat, setServiceFormat] = useState("virtual");
  const [tiers, setTiers] = useState<Tier[]>([
    { tier_name: "Standard", price: "", delivery_days: "", deliverables: [""] },
  ]);

  const addTier = () => {
    if (tiers.length >= 3) return;
    const names = ["Basic", "Standard", "Premium"];
    const nextName = names.find(n => !tiers.some(t => t.tier_name === n)) || `Tier ${tiers.length + 1}`;
    setTiers([...tiers, { tier_name: nextName, price: "", delivery_days: "", deliverables: [""] }]);
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof Tier, value: any) => {
    setTiers(tiers.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const addDeliverable = (tierIndex: number) => {
    const updated = [...tiers];
    updated[tierIndex].deliverables.push("");
    setTiers(updated);
  };

  const updateDeliverable = (tierIndex: number, delIndex: number, value: string) => {
    const updated = [...tiers];
    updated[tierIndex].deliverables[delIndex] = value;
    setTiers(updated);
  };

  const removeDeliverable = (tierIndex: number, delIndex: number) => {
    const updated = [...tiers];
    updated[tierIndex].deliverables = updated[tierIndex].deliverables.filter((_, i) => i !== delIndex);
    setTiers(updated);
  };

  const handleAIEnhance = async () => {
    if (!title && !description) {
      toast({ title: "Add some details first", description: "Enter a title or description for AI to enhance.", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-listing-ai', {
        body: { title, description, category, type: 'service' },
      });
      if (error) throw error;
      if (data?.title) setTitle(data.title);
      if (data?.description) setDescription(data.description);
      toast({ title: "Enhanced!", description: "AI improved your title and description." });
    } catch (err) {
      console.error('AI enhance error:', err);
      toast({ title: "AI unavailable", description: "Could not enhance right now. Try again later.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    const validTiers = tiers.filter(t => t.price && parseFloat(t.price) > 0);
    if (validTiers.length === 0) {
      toast({ title: "Add at least one tier with a price", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: service, error } = await supabase
        .from('creator_services')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          service_format: serviceFormat,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert tiers
      const tierInserts = validTiers.map((t, i) => ({
        service_id: service.id,
        tier_name: t.tier_name,
        price: parseFloat(t.price),
        delivery_days: t.delivery_days ? parseInt(t.delivery_days) : null,
        deliverables: t.deliverables.filter(d => d.trim()),
        tier_order: i,
      }));

      const { error: tierError } = await supabase
        .from('service_tiers')
        .insert(tierInserts);

      if (tierError) throw tierError;

      toast({ title: "Service created!", description: "Your service is now live on your profile." });
      onOpenChange(false);
      onCreated();
      // Reset form
      setTitle(""); setDescription(""); setCategory("");
      setTiers([{ tier_name: "Standard", price: "", delivery_days: "", deliverables: [""] }]);
    } catch (err) {
      console.error('Save service error:', err);
      toast({ title: "Error", description: "Failed to create service.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Service</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* AI Enhance */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAIEnhance}
            disabled={aiLoading}
            className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
          >
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Enhance with AI
          </Button>

          {/* Title */}
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Professional Music Production" />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what you offer..." rows={3} />
          </div>

          {/* Category & Format */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Format</Label>
              <Select value={serviceFormat} onValueChange={setServiceFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tiers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Pricing Tiers</Label>
              {tiers.length < 3 && (
                <Button variant="ghost" size="sm" onClick={addTier} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Add Tier
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {tiers.map((tier, ti) => (
                <div key={ti} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Input
                      value={tier.tier_name}
                      onChange={e => updateTier(ti, 'tier_name', e.target.value)}
                      className="h-7 text-sm font-medium w-28"
                    />
                    {tiers.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeTier(ti)} className="h-7 w-7 p-0 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Price ($) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.price}
                        onChange={e => updateTier(ti, 'price', e.target.value)}
                        placeholder="0.00"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Delivery (days)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={tier.delivery_days}
                        onChange={e => updateTier(ti, 'delivery_days', e.target.value)}
                        placeholder="e.g. 7"
                        className="h-8"
                      />
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div>
                    <Label className="text-xs">What's Included</Label>
                    {tier.deliverables.map((d, di) => (
                      <div key={di} className="flex gap-1 mt-1">
                        <Input
                          value={d}
                          onChange={e => updateDeliverable(ti, di, e.target.value)}
                          placeholder="e.g. 2 revisions"
                          className="h-7 text-xs"
                        />
                        {tier.deliverables.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeDeliverable(ti, di)} className="h-7 w-7 p-0 shrink-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => addDeliverable(ti)} className="h-6 text-[10px] mt-1 gap-1">
                      <Plus className="h-2.5 w-2.5" /> Add item
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Service
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
