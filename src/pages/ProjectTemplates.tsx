import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Plus, Users, Zap, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: string;
  estimated_duration: string;
  usage_count: number;
  thumbnail_url: string | null;
  created_by: string;
  is_public: boolean;
  structure: any;
  tasks: any;
  milestones: any;
}

export default function ProjectTemplates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    complexity: "intermediate",
    estimated_duration: "",
    is_public: false
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("project_templates")
        .select("*")
        .order("usage_count", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { error } = await supabase.from("project_templates").insert({
        ...formData,
        created_by: user?.id,
        structure: {
          sections: ["Planning", "Execution", "Review"],
          workflow: ["Task Creation", "Assignment", "Completion"]
        },
        tasks: [],
        milestones: []
      });

      if (error) throw error;

      toast.success("Template created successfully!");
      setShowCreateDialog(false);
      fetchTemplates();
      setFormData({
        name: "",
        description: "",
        category: "",
        complexity: "intermediate",
        estimated_duration: "",
        is_public: false
      });
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
    }
  };

  const handleUseTemplate = async (template: ProjectTemplate) => {
    try {
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          title: `${template.name} Project`,
          description: template.description,
          status: "active",
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Increment usage count
      await supabase
        .from("project_templates")
        .update({ usage_count: template.usage_count + 1 })
        .eq("id", template.id);

      toast.success("Project created from template!");
      navigate(`/projects?id=${project.id}`);
    } catch (error) {
      console.error("Error using template:", error);
      toast.error("Failed to create project");
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "beginner": return "text-green-600 bg-green-100";
      case "intermediate": return "text-yellow-600 bg-yellow-100";
      case "advanced": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Project Templates"
        description="Speed up your project creation with pre-built templates"
      />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Project Templates</h1>
            <p className="text-muted-foreground">Start projects faster with pre-built templates</p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Project Template</DialogTitle>
                <DialogDescription>
                  Create a reusable template for your projects
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="E.g., Video Production Workflow"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this template is for..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="E.g., Video, Music, Design"
                    />
                  </div>
                  <div>
                    <Label htmlFor="complexity">Complexity</Label>
                    <Select
                      value={formData.complexity}
                      onValueChange={(value) => setFormData({ ...formData, complexity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="duration">Estimated Duration</Label>
                  <Input
                    id="duration"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                    placeholder="E.g., 2-4 weeks"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate}>Create Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {templates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first template to speed up project creation
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="line-clamp-1">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    {template.is_public && (
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getComplexityColor(template.complexity)}>
                        {template.complexity}
                      </Badge>
                      <Badge variant="outline">
                        {template.category}
                      </Badge>
                    </div>
                    {template.estimated_duration && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {template.estimated_duration}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      Used {template.usage_count} times
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handleUseTemplate(template)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Use Template
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
