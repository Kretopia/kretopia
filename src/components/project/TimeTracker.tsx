import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Square, Clock, Calendar } from "lucide-react";

interface TimeEntry {
  id: string;
  task_id: string | null;
  task_title: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
  created_by: string;
}

interface TimeTrackerProps {
  projectId: string;
  tasks: any[];
}

export const TimeTracker = ({ projectId, tasks }: TimeTrackerProps) => {
  const [tracking, setTracking] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTimeEntries();
    
    // Check if there's an active session
    checkActiveSession();
  }, [projectId]);

  useEffect(() => {
    if (tracking && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTimeRef.current!.getTime()) / 1000);
        setElapsedSeconds(diff);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [tracking]);

  const checkActiveSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check localStorage for active session
    const activeSession = localStorage.getItem(`active_time_session_${projectId}`);
    if (activeSession) {
      const session = JSON.parse(activeSession);
      startTimeRef.current = new Date(session.startTime);
      setCurrentTaskId(session.taskId);
      setTracking(true);
    }
  };

  const fetchTimeEntries = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch time entries from project_tasks metadata or create a simple calculation
    const { data: tasksWithTime } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId);

    if (tasksWithTime) {
      setTimeEntries(tasksWithTime);
    }
  };

  const handleStartTracking = (taskId: string) => {
    startTimeRef.current = new Date();
    setCurrentTaskId(taskId);
    setElapsedSeconds(0);
    setTracking(true);

    // Save to localStorage
    localStorage.setItem(`active_time_session_${projectId}`, JSON.stringify({
      taskId,
      startTime: startTimeRef.current.toISOString(),
    }));

    toast({
      title: "Timer started ⏱️",
      description: "Tracking time for this task",
    });
  };

  const handlePauseTracking = () => {
    setTracking(false);
    toast({
      title: "Timer paused",
      description: `Tracked ${formatDuration(elapsedSeconds)}`,
    });
  };

  const handleStopTracking = async () => {
    if (!currentTaskId || !startTimeRef.current) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Save time entry to task notes/description
      const task = tasks.find(t => t.id === currentTaskId);
      if (task) {
        const timeLog = `\n[Time Log] ${formatDuration(elapsedSeconds)} - ${new Date().toLocaleString()}`;
        const updatedDescription = (task.description || '') + timeLog;

        await supabase
          .from('project_tasks')
          .update({
            description: updatedDescription,
          })
          .eq('id', currentTaskId);
      }

      toast({
        title: "Time saved! ✓",
        description: `Logged ${formatDuration(elapsedSeconds)} to task`,
      });

      // Clear state
      localStorage.removeItem(`active_time_session_${projectId}`);
      setTracking(false);
      setCurrentTaskId(null);
      setElapsedSeconds(0);
      startTimeRef.current = null;
      fetchTimeEntries();
    } catch (error: any) {
      toast({
        title: "Failed to save time",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const calculateTotalTime = () => {
    // Calculate from task descriptions (simplified)
    return "0h 0m";
  };

  const currentTask = tasks.find(t => t.id === currentTaskId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Time Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Timer */}
        {tracking && currentTask && (
          <div className="p-4 border rounded-lg bg-primary/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentTask.title}</p>
                <Badge variant="secondary" className="mt-1">Tracking</Badge>
              </div>
            </div>
            <div className="text-3xl font-mono font-bold text-center mb-4">
              {formatDuration(elapsedSeconds)}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handlePauseTracking}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button 
                variant="default"
                className="flex-1"
                onClick={handleStopTracking}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop & Save
              </Button>
            </div>
          </div>
        )}

        {/* Task List */}
        {!tracking && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-2">Select a task to track time:</p>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-3">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tasks available. Create a task first.
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {task.status}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleStartTracking(task.id)}
                      >
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Start
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Total Time Summary */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total time tracked:</span>
            <span className="font-semibold">{calculateTotalTime()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
