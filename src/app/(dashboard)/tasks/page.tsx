"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, CheckCircle2, Circle, Calendar, Trash2, Flame } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

const priorityMeta: Record<string, { color: string; label: string }> = {
  high: { color: "text-rose-400", label: "High" },
  medium: { color: "text-amber-400", label: "Medium" },
  low: { color: "text-slate-400", label: "Low" },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  async function fetchTasks() {
    const res = await fetch(`/api/tasks?status=${filter}`);
    setTasks(await res.json());
  }

  async function toggleDone(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    fetchTasks();
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchTasks();
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        description: fd.get("description") || null,
        priority: fd.get("priority"),
        dueDate: fd.get("dueDate") || null,
      }),
    });
    setOpen(false);
    fetchTasks();
  }

  const openCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;
  const overdueCount = tasks.filter(
    (t) => !t.done && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  return (
    <>
      <Header
        title="Tasks"
        subtitle={`${openCount} open · ${overdueCount} overdue · ${doneCount} done`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <button className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90" />
              }
            >
              <Plus className="w-3.5 h-3.5" /> New Task
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input name="title" required placeholder="Call John about contract" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea name="description" rows={2} placeholder="Optional notes..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select name="priority" defaultValue="medium">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due date</Label>
                    <Input name="dueDate" type="date" />
                  </div>
                </div>
                <Button type="submit" className="w-full">Create task</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1000px]">
        {/* Filter tabs */}
        <div className="flex gap-px bg-muted rounded-md p-0.5 w-fit">
          {[
            { key: "open", label: `Open (${openCount})` },
            { key: "done", label: `Done (${doneCount})` },
            { key: "all", label: "All" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as "open" | "done" | "all")}
              className={cn(
                "h-8 px-3 text-[12px] font-semibold rounded transition-all",
                filter === f.key ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tasks list */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
          {tasks.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-[14px] font-semibold text-muted-foreground">
                {filter === "done" ? "No completed tasks yet" : "No open tasks"}
              </p>
              <p className="text-[12px] text-muted-foreground/70 mt-1">
                {filter === "open" ? "Click + New Task to create one" : "Get back to work!"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {tasks.map((task) => {
                const overdue = !task.done && task.dueDate && new Date(task.dueDate) < new Date();
                const meta = priorityMeta[task.priority] || priorityMeta.medium;
                return (
                  <div
                    key={task.id}
                    className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors group"
                  >
                    <button onClick={() => toggleDone(task)} className="mt-0.5 flex-shrink-0">
                      {task.done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[13px] font-semibold", task.done && "line-through text-muted-foreground")}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                        <span className={cn("font-semibold flex items-center gap-1", meta.color)}>
                          <Flame className="w-2.5 h-2.5" />
                          {meta.label}
                        </span>
                        {task.dueDate && (
                          <span className={cn("flex items-center gap-1", overdue ? "text-rose-400 font-semibold" : "text-muted-foreground")}>
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            {overdue && " · overdue"}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-rose-400 hover:bg-rose-500/10 p-1.5 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
