"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Upload,
  FileSpreadsheet,
  Users as UsersIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  UserCheck,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  status: string;
  leadScore: number | null;
  source: string | null;
  createdAt: string;
  lastContactedAt: string | null;
  ownerId: string | null;
  owner: { id: string; name: string; email: string } | null;
}

const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
function isStale(c: Contact): boolean {
  if (c.status !== "lead") return false; // only flag leads
  if (!c.lastContactedAt) return true;
  return Date.now() - new Date(c.lastContactedAt).getTime() > STALE_THRESHOLD_MS;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  invalid: number;
  errors: { row: number; reason: string }[];
  distribution?: { userId: string; name: string; count: number }[];
}

export default function ContactsPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as { id?: string; role?: string } | undefined;
  const isAdminUser = currentUser?.role === "admin";

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all"); // "all" | "mine" | "unassigned" | <userId>
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleSelectAll(visible: Contact[]) {
    if (selectedIds.size === visible.length && visible.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map((c) => c.id)));
    }
  }

  async function bulkAction(action: string, status?: string, ownerId?: string | null) {
    if (selectedIds.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selectedIds.size} contacts?`)) return;

    await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids: Array.from(selectedIds), status, ownerId }),
    });
    setSelectedIds(new Set());
    fetchContacts();
  }

  function exportCsv() {
    window.location.href = "/api/contacts/export";
  }

  useEffect(() => {
    fetchContacts();
    if (isAdminUser) {
      fetch("/api/enterprise/team")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setTeam(Array.isArray(data) ? data : []))
        .catch(() => setTeam([]));
    }
  }, [isAdminUser]);

  async function fetchContacts() {
    try {
      const res = await fetch("/api/contacts");
      if (!res.ok) {
        setContacts([]);
        return;
      }
      const text = await res.text();
      setContacts(text ? JSON.parse(text) : []);
    } catch {
      setContacts([]);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone") || null,
          whatsappPhone: formData.get("whatsappPhone") || null,
          company: formData.get("company") || null,
          status: formData.get("status") || "lead",
          source: formData.get("source") || null,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `Failed to create contact (${res.status})`;
        try {
          const parsed = errText ? JSON.parse(errText) : null;
          if (parsed?.error) errMsg = parsed.error;
        } catch {}
        alert(errMsg);
        return;
      }

      setCreateOpen(false);
      fetchContacts();
    } catch (err) {
      alert(`Network error: ${String(err)}`);
    }
  }

  async function handleImportFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a CSV file");
      return;
    }

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/contacts/import", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setImportResult(data);
    setImporting(false);
    if (data.imported > 0) fetchContacts();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImportFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImportFile(file);
  }

  function downloadSample() {
    const sample =
      "name,email,phone,company,status,source\n" +
      "John Doe,john@example.com,+91 9876543210,Acme Inc,lead,Website\n" +
      "Jane Smith,jane@example.com,+91 9876543211,TechCorp,customer,Referral\n";
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = contacts.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (ownerFilter === "mine") {
      if (c.ownerId !== currentUser?.id) return false;
    } else if (ownerFilter === "unassigned") {
      if (c.ownerId !== null) return false;
    } else if (ownerFilter !== "all") {
      if (c.ownerId !== ownerFilter) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        (c.company && c.company.toLowerCase().includes(s))
      );
    }
    return true;
  });

  const statusColors: Record<string, { bg: string; dot: string }> = {
    customer: { bg: "bg-emerald-500/10 text-emerald-300", dot: "bg-emerald-500" },
    lead: { bg: "bg-blue-500/10 text-blue-300", dot: "bg-blue-500" },
    churned: { bg: "bg-rose-500/10 text-rose-300", dot: "bg-rose-500" },
  };

  const stats = {
    total: contacts.length,
    leads: contacts.filter((c) => c.status === "lead").length,
    customers: contacts.filter((c) => c.status === "customer").length,
    churned: contacts.filter((c) => c.status === "churned").length,
  };

  return (
    <>
      <Header
        title="Contacts"
        subtitle={`${stats.total} total · ${stats.leads} leads · ${stats.customers} customers`}
        actions={
          <>
            <button
              onClick={exportCsv}
              className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger
                render={
                  <button className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-border hover:bg-accent text-foreground transition-colors" />
                }
              >
                <Upload className="w-3.5 h-3.5" /> Import CSV
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Import contacts from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-xl bg-primary/10 ring-1 ring-primary/20 mx-auto mb-3 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-[14px] font-semibold">
                      {importing ? "Importing..." : "Drop your CSV here"}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      or <span className="text-primary font-semibold">click to browse</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-3">
                      Required column: <code className="bg-muted px-1 rounded">email</code>
                      {" · "}Optional: name, phone, company, status, source, notes
                    </p>
                  </div>

                  {/* Sample download */}
                  <button
                    onClick={downloadSample}
                    className="w-full text-[12px] text-primary hover:underline font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download sample CSV template
                  </button>

                  {/* Result */}
                  {importResult && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-emerald-300 nums-tabular">
                            {importResult.imported}
                          </p>
                          <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mt-0.5">
                            Imported
                          </p>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-amber-300 nums-tabular">
                            {importResult.skipped}
                          </p>
                          <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mt-0.5">
                            Duplicates
                          </p>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-rose-300 nums-tabular">
                            {importResult.invalid}
                          </p>
                          <p className="text-[10px] font-bold text-rose-300 uppercase tracking-wider mt-0.5">
                            Invalid
                          </p>
                        </div>
                      </div>

                      {importResult.imported > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-2 flex items-start gap-2 text-[12px]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>{importResult.imported}</strong> new contacts added.{" "}
                            {importResult.skipped > 0 && (
                              <>
                                <strong>{importResult.skipped}</strong> duplicates skipped.
                              </>
                            )}
                          </span>
                        </div>
                      )}

                      {importResult.distribution && importResult.distribution.length > 0 && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2.5 text-[11px]">
                          <div className="flex items-center gap-1.5 font-bold text-blue-300 uppercase tracking-wider mb-2">
                            <UserCheck className="w-3.5 h-3.5" />
                            Distributed across {importResult.distribution.length}{" "}
                            user{importResult.distribution.length !== 1 ? "s" : ""}
                          </div>
                          <div className="space-y-1">
                            {importResult.distribution.map((d) => (
                              <div key={d.userId} className="flex items-center justify-between">
                                <span className="text-foreground">{d.name}</span>
                                <span className="font-bold nums-tabular text-blue-300">
                                  {d.count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {importResult.errors.length > 0 && (
                        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg px-3 py-2 text-[11px]">
                          <div className="flex items-center gap-2 font-semibold mb-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                            First {importResult.errors.length} errors:
                          </div>
                          <ul className="space-y-0.5 ml-6 list-disc">
                            {importResult.errors.map((err, i) => (
                              <li key={i}>
                                Row {err.row}: {err.reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => {
                          setImportResult(null);
                          setImportOpen(false);
                        }}
                        className="w-full"
                      >
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger
                render={
                  <button className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-semibold bg-foreground text-background hover:opacity-90 transition-opacity" />
                }
              >
                <Plus className="w-3.5 h-3.5" /> Add Contact
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add new contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" name="email" type="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsappPhone">WhatsApp</Label>
                      <Input id="whatsappPhone" name="whatsappPhone" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" name="company" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue="lead">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="churned">Churned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="source">Source</Label>
                      <Input id="source" name="source" placeholder="e.g. Website, Referral, LinkedIn" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Create contact
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="p-8 space-y-5 animate-fade-in max-w-[1400px]">
        {/* ── Stat tiles ─────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              statusFilter === "all" ? "border-primary shadow-glow ring-1 ring-primary/20" : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">All</span>
              <UsersIcon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold nums-tabular">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Total contacts</p>
          </button>

          <button
            onClick={() => setStatusFilter("lead")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              statusFilter === "lead" ? "border-blue-500 shadow-glow ring-1 ring-blue-500/20" : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Leads</span>
              <span className="status-dot bg-blue-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-blue-300">{stats.leads}</p>
            <p className="text-[10px] text-muted-foreground mt-1">In pipeline</p>
          </button>

          <button
            onClick={() => setStatusFilter("customer")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              statusFilter === "customer" ? "border-emerald-500 shadow-glow ring-1 ring-emerald-500/20" : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Customers</span>
              <span className="status-dot bg-emerald-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-emerald-300">{stats.customers}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Paying customers</p>
          </button>

          <button
            onClick={() => setStatusFilter("churned")}
            className={cn(
              "text-left bg-card rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer",
              statusFilter === "churned" ? "border-rose-500 shadow-glow ring-1 ring-rose-500/20" : "border-border/60 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Churned</span>
              <span className="status-dot bg-rose-500" />
            </div>
            <p className="text-2xl font-bold nums-tabular text-rose-300">{stats.churned}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Lost customers</p>
          </button>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in flex-wrap">
            <p className="text-[13px] font-bold text-foreground">
              {selectedIds.size} contact{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
            <div className="flex-1" />
            <button
              onClick={() => bulkAction("update_status", "lead")}
              className="h-7 px-2.5 rounded-md text-[11px] font-semibold border border-border bg-card hover:bg-accent"
            >
              Mark as Lead
            </button>
            <button
              onClick={() => bulkAction("update_status", "customer")}
              className="h-7 px-2.5 rounded-md text-[11px] font-semibold border border-border bg-card hover:bg-accent"
            >
              Mark as Customer
            </button>
            {isAdminUser && team.length > 0 && (
              <Select
                onValueChange={(value) => {
                  if (value === "__unassign__") bulkAction("assign", undefined, null);
                  else bulkAction("assign", undefined, value);
                }}
              >
                <SelectTrigger className="h-7 w-[150px] text-[11px] bg-card border-border">
                  <UserCheck className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassign__">Unassigned</SelectItem>
                  {team.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button
              onClick={() => bulkAction("delete")}
              className="h-7 px-2.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-7 px-2.5 rounded-md text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Search + table ─────────── */}
        <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, email, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-[13px] rounded-md border border-border bg-background focus:bg-card focus:border-primary focus:outline-none transition-colors text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
            {isAdminUser && (
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="h-9 w-[160px] text-[12px] bg-background border-border">
                  <UserCheck className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All owners</SelectItem>
                  <SelectItem value="mine">Owned by me</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {team.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto">
              <strong className="text-foreground nums-tabular">{filtered.length}</strong> shown
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-[14px] font-semibold text-muted-foreground">No contacts found</p>
              <p className="text-[12px] text-muted-foreground/70 mt-1">
                Add a contact or import a CSV to get started
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {/* Header row */}
              <div className="px-4 py-2 grid grid-cols-12 gap-3 text-[10px] font-bold text-muted-foreground tracking-wider uppercase bg-muted/30 items-center">
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={() => toggleSelectAll(filtered)}
                    className="w-3.5 h-3.5 accent-primary"
                  />
                </div>
                <div className="col-span-2">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Company</div>
                <div className="col-span-2">Owner</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1 text-right">Score</div>
              </div>

              {filtered.map((contact) => {
                const status = statusColors[contact.status] || statusColors.lead;
                const isSelected = selectedIds.has(contact.id);
                return (
                  <div
                    key={contact.id}
                    className={cn(
                      "px-4 py-2.5 grid grid-cols-12 gap-3 hover:bg-muted/50 transition-colors group items-center",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(contact.id);
                        }}
                        className="w-3.5 h-3.5 accent-primary"
                      />
                    </div>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="col-span-2 flex items-center gap-2.5 min-w-0 cursor-pointer"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[11px] font-bold">
                          {contact.name[0]?.toUpperCase()}
                        </div>
                        {isStale(contact) && (
                          <span
                            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-card"
                            title="Stale lead — not contacted in 7+ days"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate group-hover:text-primary transition-colors">
                          {contact.name}
                        </p>
                        {contact.source && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            from {contact.source}
                          </p>
                        )}
                      </div>
                    </Link>
                    <div className="col-span-3 text-[12px] text-muted-foreground truncate">
                      {contact.email}
                    </div>
                    <div className="col-span-2 text-[12px] text-muted-foreground truncate">
                      {contact.company || "—"}
                    </div>
                    <div className="col-span-2 min-w-0">
                      {contact.owner ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                            {contact.owner.name[0]?.toUpperCase()}
                          </div>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {contact.owner.id === currentUser?.id ? "You" : contact.owner.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
                          Unassigned
                        </span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                          status.bg
                        )}
                      >
                        <span className={`status-dot ${status.dot}`} />
                        {contact.status}
                      </span>
                    </div>
                    <div className="col-span-1 text-right text-[12px] font-semibold nums-tabular">
                      {contact.leadScore ?? "—"}
                    </div>
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
