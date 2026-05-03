import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Plus, X, Loader2, ListChecks } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  source: string;
  priority: string;
}

export const ActionOS = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("action_tasks")
      .select("id,title,completed,source,priority")
      .eq("user_id", user.id)
      .order("completed", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(20);
    setTasks((data as Task[]) || []);
  };

  useEffect(() => { load(); }, [user]);

  const add = async (title: string, source = "user", priority = "medium") => {
    if (!user || !title.trim()) return;
    const { data } = await supabase
      .from("action_tasks")
      .insert({ user_id: user.id, title: title.trim(), source, priority })
      .select()
      .single();
    if (data) setTasks((p) => [data as Task, ...p]);
  };

  const toggle = async (t: Task) => {
    const next = !t.completed;
    setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, completed: next } : x)));
    await supabase.from("action_tasks").update({ completed: next }).eq("id", t.id);
  };

  const remove = async (id: string) => {
    setTasks((p) => p.filter((x) => x.id !== id));
    await supabase.from("action_tasks").delete().eq("id", id);
  };

  const suggest = async () => {
    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-action-suggestions", {
        body: { context: tasks.slice(0, 5).map((t) => t.title).join("; ") },
      });
      if (error) throw error;
      const newTasks = data?.tasks || [];
      for (const t of newTasks) await add(t.title, "ai", t.priority || "medium");
      toast({ title: "Added AI suggestions", description: `${newTasks.length} tasks suggested.` });
    } catch (e) {
      toast({ title: "Couldn't suggest tasks", variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    await add(newTitle);
    setNewTitle("");
    setAdding(false);
  };

  const open = tasks.filter((t) => !t.completed);

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <ListChecks className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Action OS</h3>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {open.length} open · {tasks.length - open.length} done
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={suggest} disabled={suggesting} className="h-7 text-xs gap-1.5">
          {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          AI Suggest
        </Button>
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Add a task..."
          className="h-8 text-xs bg-secondary/30"
        />
        <Button size="sm" onClick={handleAdd} disabled={adding || !newTitle.trim()} className="h-8 px-2">
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-1 max-h-48 overflow-auto">
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No tasks yet. Add one or hit AI Suggest.
          </p>
        )}
        {tasks.map((t) => (
          <div key={t.id} className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-secondary/30">
            <Checkbox checked={t.completed} onCheckedChange={() => toggle(t)} />
            <span className={`flex-1 text-xs ${t.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {t.title}
            </span>
            {t.source === "ai" && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">AI</span>
            )}
            {t.priority === "high" && !t.completed && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">!</span>
            )}
            <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 transition">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
