import { Button } from "@/components/ui/button";
import { Share2, Edit, Download } from "lucide-react";

interface ProfileActionsProps {
  onShare: () => void;
  onEdit: () => void;
  onDownload: () => void;
  isOwner: boolean;
}

export const ProfileActions = ({ onShare, onEdit, onDownload, isOwner }: ProfileActionsProps) => {
  return (
    <div className="flex gap-2">
      {isOwner && (
        <>
          <Button onClick={onEdit} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
          <Button onClick={onDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download CV
          </Button>
        </>
      )}
      <Button onClick={onShare} variant="outline" size="sm">
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
    </div>
  );
};
