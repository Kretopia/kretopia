import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Clock, Users, Loader2, Ticket, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { LocationSearchInput } from "./LocationSearchInput";
import { Switch } from "@/components/ui/switch";
import { EventCoverPicker } from "./EventCoverPicker";

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  defaultLocation?: { lat: number; lng: number };
  defaultCircleId?: string;
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
  defaultLocation,
  defaultCircleId,
}: CreateSessionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("14:00");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [userCircles, setUserCircles] = useState<{ id: string; title: string; icon_emoji: string }[]>([]);
  
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
    external_ticket_url: '',
    circle_id: defaultCircleId || '',
  });

  // Fetch user's circles for the dropdown
  useEffect(() => {
    if (!user || !open) return;
    const fetchCircles = async () => {
      const { data: memberships } = await supabase
        .from("spark_room_members")
        .select("room_id")
        .eq("user_id", user.id);
      if (!memberships?.length) return;
      const roomIds = memberships.map(m => m.room_id);
      const { data: rooms } = await supabase
        .from("spark_rooms")
        .select("id, title, icon_emoji")
        .in("id", roomIds)
        .eq("is_active", true);
      setUserCircles(rooms || []);
    };
    fetchCircles();
  }, [user, open]);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
  };

  const uploadCover = async (): Promise<string | null> => {
    if (!coverFile || !user) return null;
    const ext = coverFile.name.split('.').pop();
    const path = `${user.id}/events/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('portfolio').upload(path, coverFile);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date) return;

    setLoading(true);
    try {
      // Upload cover image if selected
      const coverUrl = await uploadCover();

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
        cover_image_url: coverUrl,
        external_ticket_url: formData.external_ticket_url || null,
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
        external_ticket_url: '',
        circle_id: '',
      });
      setDate(undefined);
      setCoverFile(null);
      setCoverPreview(null);
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
      toast({ title: "Not supported", description: "Geolocation is not supported by your browser", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({ ...prev, latitude: position.coords.latitude, longitude: position.coords.longitude }));
        toast({ title: "Location detected", description: "Your current location will be used for the venue" });
      },
      () => {
        toast({ title: "Location error", description: "Could not detect your location", variant: "destructive" });
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">✨ Create an Event</DialogTitle>
          <DialogDescription>Host a meetup, jam session, workshop, or event for creators</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Type Toggle */}
          <div className="flex gap-2">
            <Button type="button" variant={formData.event_type === 'session' ? 'default' : 'outline'} size="sm" className="flex-1"
              onClick={() => setFormData(prev => ({ ...prev, event_type: 'session' }))}>Jam Session</Button>
            <Button type="button" variant={formData.event_type === 'event' ? 'default' : 'outline'} size="sm" className="flex-1"
              onClick={() => setFormData(prev => ({ ...prev, event_type: 'event' }))}>Event / Meetup</Button>
          </div>

          <EventCoverPicker
            coverPreview={coverPreview}
            onCoverChange={(file, preview) => { setCoverFile(file); setCoverPreview(preview); }}
            eventTitle={formData.title}
            eventCategory={formData.category}
          />

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" placeholder={formData.event_type === 'event' ? "e.g., Creator Meetup Bali, Open Mic Night" : "e.g., Sunset Photo Walk, Music Jam"}
              value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="What's the vibe? What should people bring?" value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} />
          </div>

          {/* Date & Time - stacked on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {date ? format(date, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} disabled={(date) => date < new Date()} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="pl-10" required />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <LocationSearchInput value={formData.venue_address}
              onChange={(val) => setFormData(prev => ({ ...prev, venue_address: val }))}
              onSelect={(result) => setFormData(prev => ({ ...prev, venue_name: result.venueName, venue_address: result.address, latitude: result.lat, longitude: result.lng }))}
              placeholder="Search for a venue, address, or place..." />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={detectLocation} className="text-xs gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Use current location
              </Button>
            </div>
            {formData.latitude && formData.longitude && (
              <p className="text-xs text-muted-foreground">📍 {formData.venue_name || 'Location set'} ({formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)})</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_participants">Max Participants</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="max_participants" type="number" min={2} max={1000} value={formData.max_participants}
                onChange={(e) => setFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 10 }))} className="pl-10" />
            </div>
          </div>

          {/* Ticketing */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="ticketed" className="text-sm font-medium">Paid Event / Tickets</Label>
              </div>
              <Switch id="ticketed" checked={formData.is_ticketed}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_ticketed: checked }))} />
            </div>
            {formData.is_ticketed && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Price</Label>
                    <Input type="number" min={0} step={0.01} placeholder="0.00" value={formData.ticket_price || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, ticket_price: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Currency</Label>
                    <Select value={formData.ticket_currency} onValueChange={(v) => setFormData(prev => ({ ...prev, ticket_currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="IDR">IDR (Rp)</SelectItem>
                        <SelectItem value="TTD">TTD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">External Ticket Link (optional)</Label>
                  <Input 
                    type="url" 
                    placeholder="https://nomeo.io/m/... or Eventbrite link" 
                    value={formData.external_ticket_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, external_ticket_url: e.target.value }))}
                  />
                  <p className="text-[10px] text-muted-foreground">Paste a Nomeo, Eventbrite, or other ticket link. Users will be redirected there to purchase.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading || !date || !formData.title} className="flex-1" variant="gradient">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create {formData.event_type === 'event' ? 'Event' : 'Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
