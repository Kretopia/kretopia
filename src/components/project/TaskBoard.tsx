import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical, Calendar, User } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
}

interface TaskBoardProps {
  tasks: Task[];
  projectId: string;
  onUpdate: () => void;
}

const STATUSES = [
  { value: 'todo', label: 'To Do', color: 'bg-muted' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-primary/10' },
  { value: 'review', label: 'Review', color: 'bg-accent/10' },
  { value: 'done', label: 'Done', color: 'bg-accent/20' }
];

function SortableTask({ task, onUpdate }: { task: Task; onUpdate: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const { toast } = useToast();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from('project_tasks')
      .update({
        title: editedTask.title,
        description: editedTask.description,
        due_date: editedTask.due_date
      })
      .eq('id', task.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Task updated! ✅" });
      setIsEditing(false);
      onUpdate();
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-4 mb-3 hover:shadow-md transition-smooth cursor-move">
        <div className="flex items-start gap-2">
          <div {...attributes} {...listeners} className="mt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-2">
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <div className="cursor-pointer hover:opacity-70 transition-opacity">
                  <h4 className="font-semibold text-sm">{task.title}</h4>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {task.description}
                    </p>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Task</DialogTitle>
                  <DialogDescription>Update task details and due date</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={editedTask.title}
                      onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editedTask.description || ''}
                      onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={editedTask.due_date || ''}
                      onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSave} className="w-full">Save Changes</Button>
                </div>
              </DialogContent>
            </Dialog>
            {task.due_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function DroppableColumn({ status, tasks, onUpdate }: { status: typeof STATUSES[0], tasks: Task[], onUpdate: () => void }) {
  const { setNodeRef } = useDroppable({ id: status.value });

  return (
    <div ref={setNodeRef} className={`rounded-lg p-3 md:p-4 ${status.color} min-h-[300px] md:min-h-[400px]`}>
      <div className="mb-3 md:mb-4 flex items-center justify-between">
        <h4 className="font-semibold text-sm">{status.label}</h4>
        <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map(task => (
            <SortableTask key={task.id} task={task} onUpdate={onUpdate} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function TaskBoard({ tasks, projectId, onUpdate }: TaskBoardProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'todo'
  });
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast({ title: "Error", description: "Task title is required", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('project_tasks')
      .insert({
        project_id: projectId,
        created_by: user?.id,
        title: newTask.title,
        description: newTask.description || null,
        due_date: newTask.due_date || null,
        status: newTask.status
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Task created! ✅" });
      setNewTask({ title: '', description: '', due_date: '', status: 'todo' });
      setCreateDialogOpen(false);
      onUpdate();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overStatus = over.id as string;

    if (activeTask && STATUSES.some(s => s.value === overStatus) && activeTask.status !== overStatus) {
      const { error } = await supabase
        .from('project_tasks')
        .update({ status: overStatus })
        .eq('id', activeTask.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Task moved! ✅" });
        onUpdate();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Task Board</h3>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Add a new task to your project board</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task details"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newTask.status} onValueChange={(val) => setNewTask({ ...newTask, status: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateTask} className="w-full">Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {STATUSES.map(status => {
            const statusTasks = tasks.filter(t => t.status === status.value);
            return (
              <DroppableColumn 
                key={status.value} 
                status={status} 
                tasks={statusTasks} 
                onUpdate={onUpdate} 
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
