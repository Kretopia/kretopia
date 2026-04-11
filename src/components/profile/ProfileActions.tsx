import { Button } from "@/components/ui/button";
import { Share2, Edit, Download, IdCard, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileActionsProps {
  onShare: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onCreatorCard?: () => void;
  isOwner: boolean;
}

export const ProfileActions = ({ onShare, onEdit, onDownload, onCreatorCard, isOwner }: ProfileActionsProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex gap-2 flex-wrap">
      {isOwner && (
        <Button onClick={onEdit} variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      )}
      <Button onClick={onShare} variant="outline" size="sm">
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
      {isOwner && (
        <Button
          onClick={() => navigate("/creative-circle")}
          variant="outline"
          size="sm"
          className="border-primary/20 text-primary hover:bg-primary/5"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite
        </Button>
      )}
      {isOwner && onCreatorCard && (
        <Button onClick={onCreatorCard} variant="outline" size="sm">
          <IdCard className="h-4 w-4 mr-2" />
          Creator Card
        </Button>
      )}
    </div>
  );
};
