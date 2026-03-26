import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Send, Search, Loader2, ShieldCheck, Mail } from "lucide-react";

interface Credit {
  id: string;
  project_name: string;
  role: string;
  year?: number;
}

interface CreditEndorsementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credit: Credit;
  userId: string;
}

export function CreditEndorsementDialog({ open, onOpenChange, credit, userId }: CreditEndorsementDialogProps) {
  const [method, setMethod] = useState<'platform' | 'email'>('platform');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [sending, setSending] = useState(false);

  const searchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, primary_role, username')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .neq('user_id', userId)
        .limit(5);
      setSearchResults(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const sendEndorsementRequest = async (endorserId?: string, endorserEmail?: string, endorserName?: string) => {
    setSending(true);
    try {
      const { error } = await supabase.from('credit_endorsements').insert({
        credit_id: credit.id,
        requested_by: userId,
        endorser_id: endorserId || null,
        endorser_email: endorserEmail || null,
        endorser_name: endorserName || name || null,
        relationship: relationship || null,
        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('An endorsement request already exists for this person');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Endorsement request sent!', {
        description: endorserName || endorserEmail || 'User will be notified',
      });
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error sending endorsement request:', error);
      toast.error('Failed to send request');
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setEmail('');
    setName('');
    setRelationship('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Request Endorsement
          </DialogTitle>
          <DialogDescription>
            Ask a collaborator or client to verify your role on <strong>{credit.project_name}</strong> ({credit.role})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={method === 'platform' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMethod('platform')}
              className="flex-1"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Platform User
            </Button>
            <Button
              variant={method === 'email' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMethod('email')}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-1" />
              Via Email
            </Button>
          </div>

          {method === 'platform' ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Search for collaborator</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name or username..."
                    value={searchQuery}
                    onChange={(e) => searchUsers(e.target.value)}
                  />
                </div>
              </div>

              {searching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.user_id}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      onClick={() => sendEndorsementRequest(user.user_id, undefined, user.full_name)}
                      disabled={sending}
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-medium">{user.display_name?.[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.primary_role || user.username}</p>
                      </div>
                      <Send className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Their name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., John Smith" />
              </div>
              <div className="space-y-2">
                <Label>Their email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@example.com" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Their relationship to the project</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collaborator">Collaborator / Co-worker</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="supervisor">Supervisor / Director</SelectItem>
                <SelectItem value="producer">Producer</SelectItem>
                <SelectItem value="vendor">Vendor / Contractor</SelectItem>
                <SelectItem value="audience">Audience / Attendee</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method === 'email' && (
            <Button
              className="w-full"
              onClick={() => sendEndorsementRequest(undefined, email, name)}
              disabled={sending || !email}
            >
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Endorsement Request
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
