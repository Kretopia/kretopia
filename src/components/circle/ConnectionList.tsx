import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, MapPin } from "lucide-react";
import { NetworkVisualization } from "./NetworkVisualization";
import { InviteDialog } from "@/components/InviteDialog";

interface Connection {
  user_id: string;
  full_name: string;
  role: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  badge: string;
  level: number;
}

interface ConnectionListProps {
  connections: Connection[];
  loading: boolean;
  onMessage: (userId: string) => void;
}

const getBadgeColor = (badge: string) => {
  switch (badge) {
    case 'og': return 'bg-purple-500';
    case 'beta': return 'bg-blue-500';
    case 'vip': return 'bg-yellow-500';
    default: return 'bg-gray-500';
  }
};

export const ConnectionList = ({ connections, loading, onMessage }: ConnectionListProps) => {
  const [showInvite, setShowInvite] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <>
        <NetworkVisualization onInvite={() => setShowInvite(true)} />
        <InviteDialog open={showInvite} onOpenChange={setShowInvite} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {connections.map((connection) => (
        <Card key={connection.user_id} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary">
              <AvatarImage src={connection.avatar_url || undefined} />
              <AvatarFallback>
                {connection.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{connection.full_name}</h3>
                {connection.badge && (
                  <Badge className={`${getBadgeColor(connection.badge)} text-white text-xs px-2 py-0`}>
                    {connection.badge.toUpperCase()}
                  </Badge>
                )}
                {connection.level > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Lv {connection.level}
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">{connection.role}</p>
              
              {connection.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3" />
                  <span>{connection.location}</span>
                </div>
              )}
              
              {connection.bio && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {connection.bio}
                </p>
              )}
              
              <Button 
                onClick={() => onMessage(connection.user_id)} 
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
