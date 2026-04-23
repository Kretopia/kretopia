// Legacy entry point — now backed by the new 3-step CreateProjectWizard.
// Kept as a re-export so existing imports continue to work.
import { CreateProjectWizard } from "./CreateProjectWizard";

export interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateProjectDialog(props: CreateProjectDialogProps) {
  return <CreateProjectWizard {...props} />;
}
