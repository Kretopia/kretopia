import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Award, TrendingUp, Target, Trophy, Briefcase, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface IndustryStat {
  id: string;
  stat_type: string;
  title: string;
  value: string;
  description: string;
  date_achieved: string;
  issuer: string;
  is_featured: boolean;
}

interface IndustryStatsSectionProps {
  stats: IndustryStat[];
  isOwnProfile: boolean;
  onRefresh: () => void;
}

export const IndustryStatsSection = ({ stats, isOwnProfile, onRefresh }: IndustryStatsSectionProps) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStat, setNewStat] = useState({
    stat_type: "achievement",
    title: "",
    value: "",
    description: "",
    issuer: "",
    date_achieved: ""
  });
  const { toast } = useToast();

  const handleAdd = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('industry_stats').insert({
      user_id: user.id,
      ...newStat
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add stat", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Industry stat added" });
      setIsAddOpen(false);
      setNewStat({ stat_type: "achievement", title: "", value: "", description: "", issuer: "", date_achieved: "" });
      onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('industry_stats').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete stat", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Industry stat deleted" });
      onRefresh();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'award': return <Trophy className="h-5 w-5" />;
      case 'certification': return <Award className="h-5 w-5" />;
      case 'metric': return <TrendingUp className="h-5 w-5" />;
      case 'experience': return <Briefcase className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Industry Stats & Achievements</h3>
        {isOwnProfile && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Stat
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Industry Stat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newStat.stat_type} onValueChange={(v) => setNewStat({ ...newStat, stat_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="achievement">Achievement</SelectItem>
                      <SelectItem value="certification">Certification</SelectItem>
                      <SelectItem value="award">Award</SelectItem>
                      <SelectItem value="metric">Metric</SelectItem>
                      <SelectItem value="experience">Experience</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={newStat.title} onChange={(e) => setNewStat({ ...newStat, title: e.target.value })} placeholder="e.g., Grammy Award Winner" />
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input value={newStat.value} onChange={(e) => setNewStat({ ...newStat, value: e.target.value })} placeholder="e.g., 10M+ streams, 5 years" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newStat.description} onChange={(e) => setNewStat({ ...newStat, description: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Issuer/Organization</Label>
                  <Input value={newStat.issuer} onChange={(e) => setNewStat({ ...newStat, issuer: e.target.value })} placeholder="e.g., Recording Academy" />
                </div>
                <div className="space-y-2">
                  <Label>Date Achieved</Label>
                  <Input type="date" value={newStat.date_achieved} onChange={(e) => setNewStat({ ...newStat, date_achieved: e.target.value })} />
                </div>
                <Button onClick={handleAdd} className="w-full" variant="gradient">Add Stat</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {stats.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Trophy className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold">No stats yet</h3>
          <p className="text-muted-foreground">Add your achievements to build credibility</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.id} className="group rounded-2xl border border-border bg-card p-6 hover:shadow-card transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${stat.is_featured ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                    {getIcon(stat.stat_type)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.stat_type}</p>
                    <h4 className="font-semibold">{stat.title}</h4>
                  </div>
                </div>
                {isOwnProfile && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(stat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {stat.value && (
                <p className="text-2xl font-bold text-primary mb-2">{stat.value}</p>
              )}
              <p className="text-sm text-muted-foreground mb-2">{stat.description}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{stat.issuer}</span>
                {stat.date_achieved && (
                  <span>{new Date(stat.date_achieved).getFullYear()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
