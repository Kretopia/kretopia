import { SEO } from "@/components/SEO";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, Check, CheckCheck, Trash2, ExternalLink, MessageCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'match': return '';
    case 'message': return '';
    case 'project': return '';
    case 'opportunity': return '';
    case 'social': return '';
    case 'connection': return '';
    case 'reward': return '';
    default: return '';
  }
};

const Notifications = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (notification: any) => {
    if (!notification.read) markAsRead(notification.id);
    const dest = notification.action_url || notification.link;
    if (dest) navigate(dest);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="Notifications - ThriveIN" description="View all your notifications" />
      <div className="container mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Bell className="h-7 w-7" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">{unreadCount} unread</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">Stay up to date with your activity</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No notifications yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              We'll notify you when something important happens
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <div
                  className={`group relative rounded-xl p-4 transition-all cursor-pointer ${
                    notification.read
                      ? 'bg-muted/30 hover:bg-muted/50'
                      : 'bg-primary/5 hover:bg-primary/10 border border-primary/20'
                  }`}
                  onClick={() => handleClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0 mt-0.5">
                      {getCategoryIcon(notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{notification.title}</h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {notification.priority === 'high' && (
                            <Badge variant="destructive" className="text-[10px] h-5">Urgent</Badge>
                          )}
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        <div className="flex gap-1.5">
                          {notification.action_url && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => {
                              e.stopPropagation();
                              if (!notification.read) markAsRead(notification.id);
                              navigate(notification.action_url);
                            }}>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {notification.action_text || "View"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                {index < notifications.length - 1 && <Separator className="my-1" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
