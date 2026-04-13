"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  outOfOffice?: boolean;
  outOfOfficeUntil?: string | null;
  backupUserId?: string | null;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [open, setOpen] = useState(false);
  const [oooMember, setOooMember] = useState<TeamMember | null>(null);
  const [oooUntil, setOooUntil] = useState("");
  const [oooBackup, setOooBackup] = useState<string>("");

  useEffect(() => { fetchTeam(); }, []);

  async function fetchTeam() {
    try {
      const res = await fetch("/api/enterprise/team");
      if (!res.ok) return;
      const text = await res.text();
      setMembers(text ? JSON.parse(text) : []);
    } catch {}
  }

  function openOoo(m: TeamMember) {
    setOooMember(m);
    setOooUntil(m.outOfOfficeUntil ? m.outOfOfficeUntil.slice(0, 10) : "");
    setOooBackup(m.backupUserId || "");
  }

  async function saveOoo(turnOn: boolean) {
    if (!oooMember) return;
    await fetch(`/api/enterprise/team/${oooMember.id}/ooo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outOfOffice: turnOn,
        outOfOfficeUntil: turnOn && oooUntil ? oooUntil : null,
        backupUserId: turnOn && oooBackup ? oooBackup : null,
      }),
    });
    setOooMember(null);
    fetchTeam();
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/enterprise/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
        role: fd.get("role"),
        invitedById: members[0]?.id,
      }),
    });
    setOpen(false);
    fetchTeam();
  }

  async function updateRole(id: string, role: string) {
    await fetch(`/api/enterprise/team/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    fetchTeam();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/enterprise/team/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchTeam();
  }

  return (
    <>
      <Header title="Team Management" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{members.length} team members · {members.filter((m) => m.isActive).length} active</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>+ Add Team Member</DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input name="name" required />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input name="password" type="password" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select name="role" defaultValue="agent">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Add Member</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      <Select value={m.role} onValueChange={(v) => updateRole(m.id, v)}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={m.isActive ? "default" : "destructive"}>
                          {m.isActive ? "Active" : "Disabled"}
                        </Badge>
                        {m.outOfOffice && (
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                            OOO{m.outOfOfficeUntil ? ` until ${new Date(m.outOfOfficeUntil).toLocaleDateString()}` : ""}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString() : "Never"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => toggleActive(m.id, m.isActive)}>
                          {m.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openOoo(m)}>
                          {m.outOfOffice ? "Edit OOO" : "Set OOO"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* OOO dialog */}
      <Dialog open={!!oooMember} onOpenChange={(open) => !open && setOooMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Out of Office · {oooMember?.name}</DialogTitle>
          </DialogHeader>
          {oooMember && (
            <div className="space-y-4">
              <p className="text-[12px] text-muted-foreground">
                When OOO is on, new leads assigned to {oooMember.name} (via routing rules,
                round-robin imports, or auto-creation) will instantly route to the backup user.
                Existing leads stay where they are.
              </p>
              <div className="space-y-2">
                <Label className="text-[11px]">Until (optional)</Label>
                <Input
                  type="date"
                  value={oooUntil}
                  onChange={(e) => setOooUntil(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Leave empty for indefinite OOO. After this date, OOO auto-clears.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px]">Backup user *</Label>
                <Select value={oooBackup} onValueChange={setOooBackup}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Pick a backup…" />
                  </SelectTrigger>
                  <SelectContent>
                    {members
                      .filter((u) => u.id !== oooMember.id && u.isActive)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button variant="outline" onClick={() => setOooMember(null)}>
                  Cancel
                </Button>
                {oooMember.outOfOffice && (
                  <Button variant="destructive" onClick={() => saveOoo(false)}>
                    Turn OOO off
                  </Button>
                )}
                <Button onClick={() => saveOoo(true)} disabled={!oooBackup}>
                  Turn OOO on
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
