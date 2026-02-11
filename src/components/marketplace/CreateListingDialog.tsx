import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Wrench, Download, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const LISTING_TYPES = [
  { value: "digital", label: "Digital Product", icon: Download, description: "Beats, presets, templates, courses" },
  { value: "physical", label: "Physical Item", icon: Package, description: "Gear, merch, art, vinyl" },
  { value: "service", label: "Service", icon: Wrench, description: "Lessons, mixing, coaching" },
];

const CATEGORIES = [
  "music", "design", "video", "photography", "fashion", "art", "writing", "development", "other"
];

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

const SHIPPING_METHODS = [
  { value: "ship", label: "Shipping" },
  { value: "local_pickup", label: "Local Pickup" },
  { value: "both", label: "Ship or Pickup" },
];

const SERVICE_FORMATS = [
  { value: "virtual", label: "Virtual / Online" },
  { value: "in_person", label: "In Person" },
  { value: "both", label: "Virtual or In Person" },
];

interface CreateListingDialogProps {
  onCreated: () => void;
}

const CreateListingDialog = ({ onCreated }: CreateListingDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listingType, setListingType] = useState<string>("");
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    product_type: "",
    tags: "",
    // Physical
    condition: "",
    shipping_method: "",
    shipping_price: "",
    item_location: "",
    pickup_location: "",
    // Service
    service_format: "",
    service_duration: "",
    availability_info: "",
    is_virtual: true,
  });

  const updateForm = (key: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.title || !form.price || !listingType) {
      toast({ title: "Missing fields", description: "Please fill in title, price, and listing type", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const insertData: any = {
        user_id: user.id,
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category || null,
        product_type: form.product_type || listingType,
        listing_type: listingType,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
        is_active: true,
      };

      if (listingType === "physical") {
        insertData.condition = form.condition || null;
        insertData.shipping_method = form.shipping_method || null;
        insertData.shipping_price = form.shipping_price ? parseFloat(form.shipping_price) : 0;
        insertData.item_location = form.item_location || null;
        insertData.pickup_location = form.pickup_location || null;
        insertData.is_virtual = false;
      }

      if (listingType === "service") {
        insertData.service_format = form.service_format || null;
        insertData.service_duration = form.service_duration || null;
        insertData.availability_info = form.availability_info || null;
        insertData.is_virtual = form.service_format !== "in_person";
      }

      const { error } = await supabase.from("digital_products").insert(insertData);
      if (error) throw error;

      toast({ title: "Listing created!", description: "Your listing is now live on the marketplace" });
      setOpen(false);
      resetForm();
      onCreated();
    } catch (error: any) {
      console.error("Error creating listing:", error);
      toast({ title: "Error", description: error.message || "Failed to create listing", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setListingType("");
    setForm({
      title: "", description: "", price: "", category: "", product_type: "", tags: "",
      condition: "", shipping_method: "", shipping_price: "", item_location: "", pickup_location: "",
      service_format: "", service_duration: "", availability_info: "", is_virtual: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Listing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a Listing</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Step 1: Choose Type */}
          {!listingType ? (
            <div className="space-y-3">
              <Label>What are you listing?</Label>
              <div className="grid gap-3">
                {LISTING_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setListingType(type.value)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="p-3 rounded-lg bg-primary/10">
                      <type.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Type Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">{listingType}</Badge>
                <button onClick={() => setListingType("")} className="text-xs text-muted-foreground underline">Change</button>
              </div>

              {/* Common Fields */}
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input placeholder="e.g. Vintage Fender Stratocaster" value={form.title} onChange={e => updateForm("title", e.target.value)} />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Describe your listing..." value={form.description} onChange={e => updateForm("description", e.target.value)} rows={3} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price (USD) *</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={e => updateForm("price", e.target.value)} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={v => updateForm("category", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input placeholder="guitar, vintage, fender" value={form.tags} onChange={e => updateForm("tags", e.target.value)} />
                </div>
              </div>

              {/* Physical Item Fields */}
              {listingType === "physical" && (
                <div className="space-y-4 border-t border-border pt-4">
                  <p className="text-sm font-medium text-muted-foreground">Physical Item Details</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Condition</Label>
                      <Select value={form.condition} onValueChange={v => updateForm("condition", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Delivery Method</Label>
                      <Select value={form.shipping_method} onValueChange={v => updateForm("shipping_method", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {SHIPPING_METHODS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(form.shipping_method === "ship" || form.shipping_method === "both") && (
                    <div>
                      <Label>Shipping Price (USD)</Label>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.shipping_price} onChange={e => updateForm("shipping_price", e.target.value)} />
                    </div>
                  )}

                  <div>
                    <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Item Location</Label>
                    <Input placeholder="e.g. Los Angeles, CA" value={form.item_location} onChange={e => updateForm("item_location", e.target.value)} />
                  </div>

                  {(form.shipping_method === "local_pickup" || form.shipping_method === "both") && (
                    <div>
                      <Label>Pickup Location Details</Label>
                      <Input placeholder="e.g. Downtown LA studio" value={form.pickup_location} onChange={e => updateForm("pickup_location", e.target.value)} />
                    </div>
                  )}
                </div>
              )}

              {/* Service Fields */}
              {listingType === "service" && (
                <div className="space-y-4 border-t border-border pt-4">
                  <p className="text-sm font-medium text-muted-foreground">Service Details</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Format</Label>
                      <Select value={form.service_format} onValueChange={v => updateForm("service_format", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {SERVICE_FORMATS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Duration</Label>
                      <Input placeholder="e.g. 1 hour, 30 min" value={form.service_duration} onChange={e => updateForm("service_duration", e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label>Availability</Label>
                    <Textarea placeholder="e.g. Weekdays 9am-5pm EST, book 48hrs in advance" value={form.availability_info} onChange={e => updateForm("availability_info", e.target.value)} rows={2} />
                  </div>
                </div>
              )}

              <Button onClick={handleSubmit} disabled={loading} className="w-full">
                {loading ? "Creating..." : "Publish Listing"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateListingDialog;
