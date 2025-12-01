import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  status: string | null;
  assigned_to: string | null;
}

interface SimpleTaskListProps {
  projectId: string;
  tasks: Task[];
  onTasksChanged: () => void;
  currentUserId: string;
}

export const SimpleTaskList = ({ projectId, tasks, onTasksChanged, currentUserId }: SimpleTaskListProps) => {
  const { toast } = useToast();
  const [newTask, setNewTask] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAddTask = async () => {
    if (!newTask.trim()) return;

    setAdding(true);
    try {
      const { error } = await supabase
        .from('project_tasks')
        .insert({
          project_id: projectId,
          title: newTask.trim(),
          created_by: currentUserId,
          status: 'todo',
        });

      if (error) throw error;

      setNewTask("");
      onTasksChanged();
      toast({
        title: "Task added",
        description: "New task added to the list",
      });
    } catch (error: any) {
      console.error('Add task error:', error);
      toast({
        title: "Failed to add task",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string | null) => {
    const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';
    
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      onTasksChanged();
    } catch (error: any) {
      console.error('Toggle task error:', error);
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Tasks ({completedCount}/{totalCount})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new task */}
        <div className="flex gap-2">
          <Input
            placeholder="Add a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            disabled={adding}
          />
          <Button
            onClick={handleAddTask}
            disabled={adding || !newTask.trim()}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Task list */}
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No tasks yet</p>
            <p className="text-sm mt-1">Add tasks to track your project progress</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => handleToggleTask(task.id, task.status)}
                />
                <span
                  className={`flex-1 text-sm ${
                    task.status === 'completed'
                      ? 'line-through text-muted-foreground'
                      : ''
                  }`}
                >
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
