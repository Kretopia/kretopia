import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AddDigitalProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddDigitalProductDialog = ({ open, onOpenChange, onSuccess }: AddDigitalProductDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    product_type: "template",
    category: "design",
    demo_url: "",
    tags: ""
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('digital_products')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price),
          product_type: formData.product_type,
          category: formData.category,
          demo_url: formData.demo_url || null,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Digital product added successfully!"
      });

      setFormData({
        title: "",
        description: "",
        price: "",
        product_type: "template",
        category: "design",
        demo_url: "",
        tags: ""
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Digital Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Product Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Professional Website Template"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your product, what's included, features, etc."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (USD) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="29.99"
                required
              />
            </div>

            <div>
              <Label htmlFor="product_type">Product Type *</Label>
              <Select
                value={formData.product_type}
                onValueChange={(value) => setFormData({ ...formData, product_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="asset">Asset Pack</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="ebook">eBook</SelectItem>
                  <SelectItem value="music">Music/Audio</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="writing">Writing</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="demo_url">Demo/Preview URL</Label>
            <Input
              id="demo_url"
              value={formData.demo_url}
              onChange={(e) => setFormData({ ...formData, demo_url: e.target.value })}
              placeholder="https://example.com/demo"
              type="url"
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="react, template, responsive, modern"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};