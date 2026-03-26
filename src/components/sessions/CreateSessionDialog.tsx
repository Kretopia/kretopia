import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Clock, Users, Loader2, Ticket } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { LocationSearchInput } from "./LocationSearchInput";
import { Switch } from "@/components/ui/switch";

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  defaultLocation?: { lat: number; lng: number };
}

const EVENT_CATEGORIES = [
  { value: 'music', label: '🎵 Music Jam / Concert' },
  { value: 'film', label: '🎬 Film Shoot / Screening' },
  { value: 'photo', label: '📸 Photo Walk / Shoot' },
  { value: 'art', label: '🎨 Art Collab / Exhibition' },
  { value: 'podcast', label: '🎙️ Podcast / Live Recording' },
  { value: 'content', label: '📱 Content Creation' },
  { value: 'workshop', label: '📚 Workshop / Masterclass' },
  { value: 'networking', label: '🤝 Networking / Meetup' },
  { value: 'festival', label: '🎪 Festival / Fair' },
  { value: 'showcase', label: '🌟 Showcase / Open Mic' },
  { value: 'general', label: '✨ General Creative' },
];

export const CreateSessionDialog = ({ 
  open, 
  onOpenChange, 
  onCreated,
  defaultLocation 
}: CreateSessionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("14:00");
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    venue_name: '',
    venue_address: '',
    max_participants: 10,
    latitude: defaultLocation?.lat || null,
    longitude: defaultLocation?.lng || null,
    is_ticketed: false,
    ticket_price: 0,
    ticket_currency: 'USD',
    event_type: 'session' as 'session' | 'event',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date) return;

    setLoading(true);
    try {
      // Combine date and time
      const [hours, minutes] = time.split(':').map(Number);
      const startTime = new Date(date);
      startTime.setHours(hours, minutes, 0, 0);

      const { error } = await supabase.from('creative_jams').insert({
        created_by: user.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        venue_name: formData.venue_name,
        venue_address: formData.venue_address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        start_time: startTime.toISOString(),
        max_participants: formData.max_participants,
        is_public: true,
        status: 'upcoming',
        is_ticketed: formData.is_ticketed,
        ticket_price: formData.is_ticketed ? formData.ticket_price : 0,
        ticket_currency: formData.ticket_currency,
        event_type: formData.event_type,
      } as any);

      if (error) throw error;

      toast({
        title: "Event created! 🎉",
        description: "Others can now find and join your event",
      });

      onOpenChange(false);
      onCreated?.();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'general',
        venue_name: '',
        venue_address: '',
        max_participants: 10,
        latitude: null,
        longitude: null,
        is_ticketed: false,
        ticket_price: 0,
        ticket_currency: 'USD',
        event_type: 'session',
      });
      setDate(undefined);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Not supported",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        toast({
          title: "Location detected",
          description: "Your current location will be used for the venue",
        });
      },
      (error) => {
        toast({
          title: "Location error",
          description: "Could not detect your location",
          variant: "destructive",
        });
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✨ Create a Session
          </DialogTitle>
          <DialogDescription>
            Host a creative session and invite other creators to collaborate
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Sunset Photo Walk, Music Jam"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What's the vibe? What should people bring?"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <LocationSearchInput
              value={formData.venue_address}
              onChange={(val) => setFormData(prev => ({ ...prev, venue_address: val }))}
              onSelect={(result) => setFormData(prev => ({
                ...prev,
                venue_name: result.venueName,
                venue_address: result.address,
                latitude: result.lat,
                longitude: result.lng,
              }))}
              placeholder="Search for a venue, address, or place..."
            />
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={detectLocation}
                className="text-xs gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5" />
                Use current location
              </Button>
            </div>
            {formData.latitude && formData.longitude && (
              <p className="text-xs text-muted-foreground">
                📍 {formData.venue_name || 'Location set'} ({formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)})
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_participants">Max Participants</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="max_participants"
                type="number"
                min={2}
                max={100}
                value={formData.max_participants}
                onChange={(e) => setFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 10 }))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !date || !formData.title}
              className="flex-1"
              variant="gradient"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Session
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};