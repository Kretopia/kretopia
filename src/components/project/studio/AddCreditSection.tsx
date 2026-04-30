import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";

interface AddCreditSectionProps {
  project: {
    id: string;
    title: string;
    status?: string | null;
    workspace_type?: string | null;
  };
  collaborators: Array<{ id: string; full_name: string }>;
}

export const AddCreditSection = ({ project, collaborators }: AddCreditSectionProps) => {
  const navigate = useNavigate();
  if (project.status !== "completed") return null;

  const handleAdd = () => {
    const tagged = collaborators.map((c) => c.id).join(",");
    const params = new URLSearchParams({
      project_id: project.id,
      title: project.title,
      ...(tagged && { collaborators: tagged }),
    });
    navigate(`/credits/new?${params.toString()}`);
  };

  return (
    <section className="px-4 py-5">
      <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
          <Award className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold">This project is complete.</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add it to your verified credits — collaborators will be tagged automatically.
          </p>
        </div>
        <Button onClick={handleAdd} className="w-full">
          Add Credit
        </Button>
      </div>
    </section>
  );
};
