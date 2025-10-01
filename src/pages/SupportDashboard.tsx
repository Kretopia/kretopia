import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, AlertCircle, HelpCircle, Lightbulb, CheckCircle2, Clock, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  user_id: string;
  title: string;
  status: string;
  category: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string;
  };
  support_messages: Array<{
    content: string;
    sender_type: string;
    created_at: string;
  }>;
}

const SupportDashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel('support-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          support_messages(content, sender_type, created_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile data separately for each ticket
      const ticketsWithProfiles = await Promise.all(
        (data || []).map(async (ticket) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', ticket.user_id)
            .single();

          return {
            ...ticket,
            profiles: profile || { full_name: 'Unknown User' }
          };
        })
      );

      setTickets(ticketsWithProfiles);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load support tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Ticket ${status}`,
      });

      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive",
      });
    }
  };

  const getCategoryIcon = (category: string | null) => {
    switch(category) {
      case 'bug': return <AlertCircle className="h-4 w-4" />;
      case 'feature-request': return <Lightbulb className="h-4 w-4" />;
      case 'question': return <HelpCircle className="h-4 w-4" />;
      case 'feedback': return <MessageCircle className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (cat: string | null) => {
    switch(cat) {
      case 'bug': return 'destructive';
      case 'feature-request': return 'secondary';
      case 'question': return 'default';
      case 'feedback': return 'outline';
      default: return 'default';
    }
  };

  const filterTickets = (status: string) => {
    return tickets.filter(t => t.status === status);
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Support Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage user support requests
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Open
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filterTickets('open').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Bugs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tickets.filter(t => t.category === 'bug' && t.status === 'open').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tickets.filter(t => t.category === 'feature-request').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Resolved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filterTickets('resolved').length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="open" className="w-full">
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          {['open', 'in-progress', 'resolved'].map(status => (
            <TabsContent key={status} value={status}>
              <div className="grid md:grid-cols-2 gap-4">
                {filterTickets(status).map(ticket => (
                  <Card key={ticket.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedTicket(ticket)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {getCategoryIcon(ticket.category)}
                            {ticket.profiles?.full_name || 'Unknown User'}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {new Date(ticket.created_at).toLocaleString()}
                          </CardDescription>
                        </div>
                        {ticket.category && (
                          <Badge variant={getCategoryColor(ticket.category)}>
                            {ticket.category}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.support_messages?.[ticket.support_messages.length - 1]?.content || 'No messages yet'}
                      </p>
                      <div className="flex gap-2 mt-4">
                        {ticket.status === 'open' && (
                          <Button size="sm" variant="outline" onClick={(e) => {
                            e.stopPropagation();
                            updateTicketStatus(ticket.id, 'in-progress');
                          }}>
                            Start Working
                          </Button>
                        )}
                        {ticket.status === 'in-progress' && (
                          <Button size="sm" variant="default" onClick={(e) => {
                            e.stopPropagation();
                            updateTicketStatus(ticket.id, 'resolved');
                          }}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {selectedTicket && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getCategoryIcon(selectedTicket.category)}
                      {selectedTicket.profiles?.full_name}
                    </CardTitle>
                    <CardDescription>
                      Created {new Date(selectedTicket.created_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    {selectedTicket.support_messages?.map((msg, idx) => (
                      <div key={idx} className={`p-3 rounded-lg ${msg.sender_type === 'user' ? 'bg-primary text-primary-foreground ml-8' : 'bg-muted mr-8'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {msg.sender_type === 'user' ? 'User' : 'AI'}
                          </Badge>
                          <span className="text-xs opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportDashboard;