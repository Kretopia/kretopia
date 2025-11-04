import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Shield, CheckCircle2, MessageSquare, FileText, Clock } from "lucide-react";

interface MatchIntentDialogProps {
  open: boolean;
  onClose: () => void;
  matchedUser: {
    name: string;
    avatar: string;
    role: string;
  } | null;
  onCreateWorkspace: () => void;
  onJustConnect: () => void;
}

export const MatchIntentDialog = ({
  open,
  onClose,
  matchedUser,
  onCreateWorkspace,
  onJustConnect,
}: MatchIntentDialogProps) => {
  if (!matchedUser) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarImage src={matchedUser.avatar} />
              <AvatarFallback>{matchedUser.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-lg">Starting a project with {matchedUser.name}?</DialogTitle>
              <DialogDescription className="text-sm">{matchedUser.role}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Protected workspace option */}
          <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
            <div className="flex items-start gap-3 mb-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Create Protected Workspace</p>
                <p className="text-xs text-muted-foreground">
                  Get your complete collaboration space with payment protection
                </p>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Escrow payment protection</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Real-time chat & task board</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>File sharing & time tracking</span>
              </div>
            </div>

            <Button 
              onClick={onCreateWorkspace}
              className="w-full"
              size="sm"
            >
              Create Workspace
            </Button>
          </div>

          {/* Just connect option */}
          <div className="p-4 rounded-lg border bg-background">
            <div className="flex items-start gap-3 mb-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Just Connect</p>
                <p className="text-xs text-muted-foreground">
                  Add to your network, start a workspace later
                </p>
              </div>
            </div>

            <Button 
              onClick={onJustConnect}
              variant="outline"
              className="w-full"
              size="sm"
            >
              Connect Only
            </Button>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          You can always create a workspace later from your connections
        </p>
      </DialogContent>
    </Dialog>
  );
};
