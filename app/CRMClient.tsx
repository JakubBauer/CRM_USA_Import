"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ImportCalculatorPage from "./ImportCalculator";
import { LeadAttachments } from "./components/LeadAttachments";

// ========================= UI helpers =========================
const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
    <div className="mx-auto max-w-7xl px-4 py-5">{children}</div>
  </div>
);

function Topbar({
  title,
  subtitle,
  view,
  setView,
  reload,
  logout,
  loading,
  saving,
}: {
  title: string;
  subtitle: React.ReactNode;
  view: "crm" | "calc";
  setView: (v: "crm" | "calc") => void;
  reload: () => void;
  logout: () => void;
  loading: boolean;
  saving: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              view === "crm" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setView("crm")}
            type="button"
          >
            CRM
          </button>
          <button
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              view === "calc" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setView("calc")}
            type="button"
          >
            Kalkulator
          </button>
        </div>

        <button
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          onClick={reload}
          disabled={loading || saving}
          type="button"
        >
          Odśwież
        </button>

        <button
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={logout}
          type="button"
        >
          Wyloguj
        </button>
      </div>
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-1 text-xs font-medium text-slate-600">{children}</div>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  const { className = "", ...rest } = props;
  return (
    <input
      ref={ref}
      {...rest}
      className={
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 " +
        className
      }
    />
  );
});

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  props,
  ref
) {
  const { className = "", ...rest } = props;
  return (
    <select
      ref={ref}
      {...rest}
      className={
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 " +
        className
      }
    />
  );
});

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  props,
  ref
) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      ref={ref}
      {...rest}
      className={
        "w-full min-h-[100px] resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 " +
        className
      }
    />
  );
});

// ========================= Types / helpers =========================
type Role = "ADMIN" | "SALES";
type UserRow = { id: string; name: string; role: Role; phone: string };
type User = { id: string; name: string; role: Role };

type LeadStatus =
  | "Kontakt"
  | "Oferty wysłane"
  | "W trakcie"
  | "Depozyt"
  | "Kupiony"
  | "Wydane"
  | "Zastanawia się"
  | "Nie odbiera"
  | "Odpuszczony";

type ChecklistKey =
  | "umowa"
  | "depozyt"
  | "platnosc"
  | "dokumentyOdprawa"
  | "odprawaZaplacona"
  | "title"
  | "zleconyTransport"
  | "dostarczone"
  | "relist"
  | "czyNaprawiamy"
  | "tlumaczenia"
  | "opinia";

type Lead = {
  id: string;
  createdAt: number;
  name: string;
  phone: string;

  model?: string;
  year?: number;
  auctionUrl?: string;
  vin?: string;

  budgetPln?: number;
  status: LeadStatus;
  lastContactAt?: number;

  notes: string;
  ownerId?: string | null;

  checklist?: Partial<Record<ChecklistKey, boolean>>;
};

const STATUSES: LeadStatus[] = [
  "Kontakt",
  "Oferty wysłane",
  "W trakcie",
  "Depozyt",
  "Kupiony",
  "Wydane",
  "Zastanawia się",
  "Nie odbiera",
  "Odpuszczony",
];

const CHECKLIST: { key: ChecklistKey; label: string }[] = [
  { key: "umowa", label: "Umowa" },
  { key: "depozyt", label: "Depozyt" },
  { key: "platnosc", label: "Płatność" },
  { key: "dokumentyOdprawa", label: "Dokumenty do odprawy" },
  { key: "odprawaZaplacona", label: "Odprawa zapłacona" },
  { key: "title", label: "Title" },
  { key: "zleconyTransport", label: "Zlecony transport" },
  { key: "dostarczone", label: "Dostarczone" },
  { key: "relist", label: "Relist" },
  { key: "czyNaprawiamy", label: "Czy naprawiamy" },
  { key: "tlumaczenia", label: "Tłumaczenia" },
  { key: "opinia", label: "Opinia" },
];

function normalizePhone(p?: string) {
  return (p ?? "").replace(/\D/g, "");
}

function dedupeAndSortUsers(list: UserRow[]) {
  const map = new Map<string, UserRow>();
  for (const u of list) {
    const phoneKey = normalizePhone(u.phone);
    const key = phoneKey || `${u.name}`.trim().toLowerCase() + "|" + u.role;
    if (!map.has(key)) map.set(key, u);
  }
  const arr = Array.from(map.values());
  arr.sort((a, b) => {
    const ap = normalizePhone(a.phone);
    const bp = normalizePhone(b.phone);
    if (ap && bp) return ap.localeCompare(bp, "pl");
    if (ap && !bp) return -1;
    if (!ap && bp) return 1;
    return a.name.localeCompare(b.name, "pl");
  });
  return arr;
}

function formatPLN(n?: number) {
  if (n == null || Number.isNaN(n)) return "";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(ts?: number) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function endOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function badgeBg(status: LeadStatus) {
  const map: Record<LeadStatus, string> = {
    Kontakt: "bg-blue-500/10 text-blue-700 border-blue-200",
    "Oferty wysłane": "bg-amber-500/10 text-amber-800 border-amber-200",
    "W trakcie": "bg-violet-500/10 text-violet-800 border-violet-200",
    Depozyt: "bg-emerald-500/10 text-emerald-800 border-emerald-200",
    Kupiony: "bg-teal-500/10 text-teal-800 border-teal-200",
    Wydane: "bg-sky-500/10 text-sky-800 border-sky-200",
    "Zastanawia się": "bg-slate-500/10 text-slate-800 border-slate-200",
    "Nie odbiera": "bg-rose-500/10 text-rose-800 border-rose-200",
    Odpuszczony: "bg-red-600/10 text-red-800 border-red-200",
  };
  return map[status];
}

function mapFromDb(x: any): Lead {
  return {
    id: x.id,
    createdAt: x.created_at ? new Date(x.created_at).getTime() : Date.now(),
    name: x.name ?? "",
    phone: x.phone ?? "",
    model: x.model ?? "",
    year: x.year ?? undefined,
    auctionUrl: x.auction_url ?? "",
    vin: x.vin ?? "",
    budgetPln: x.budget_min ?? undefined,
    status: ((x.status ?? "Kontakt") as LeadStatus) || "Kontakt",
    lastContactAt: x.next_contact_at ? new Date(x.next_contact_at).getTime() : undefined,
    notes: x.looking_for ?? "",
    ownerId: x.owner_id ?? null,
    checklist: (x.checklist ?? {}) as any,
  };
}

// ========================= Login =========================
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Błąd logowania");
        return;
      }
      onLogin(data as User);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,.06)] p-5">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">CRM Login</h2>
          <p className="mt-1 text-sm text-slate-500">Zaloguj się numerem telefonu i hasłem.</p>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Numer telefonu</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48..." />
          </div>

          <div>
            <Label>Hasło</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
          </div>

          <button
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            onClick={handleLogin}
            disabled={loading}
            type="button"
          >
            {loading ? "Logowanie..." : "Zaloguj"}
          </button>

          {err && <div className="text-sm text-red-600">{err}</div>}
        </div>
      </div>
    </div>
  );
}

// ========================= Main =========================
export default function CRMClient() {
  const [view, setView] = useState<"crm" | "calc">("crm");
  const [user, setUser] = useState<User | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);
  const uniqueUsers = useMemo(() => dedupeAndSortUsers(users), [users]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "Wszystkie">("Wszystkie");
  const [sort, setSort] = useState<"newest" | "oldest" | "name">("newest");
  const [followupView, setFollowupView] = useState<"all" | "today" | "overdue">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("Wszyscy");

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(() => leads.find((l) => l.id === editingId) ?? null, [leads, editingId]);

  // panel załączników
  const [attachmentsLeadId, setAttachmentsLeadId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    budgetPlnText: "",
    status: "Kontakt" as LeadStatus,
    notes: "",
    model: "",
    yearText: "",
    auctionUrl: "",
    vin: "",
    ownerId: "",
    checklist: {} as Partial<Record<ChecklistKey, boolean>>,
  });

  const [adminUnlockClosed, setAdminUnlockClosed] = useState(false);

  useEffect(() => setAdminUnlockClosed(false), [editingId]);
  useEffect(() => {
    if (form.status !== "Wydane") setAdminUnlockClosed(false);
  }, [form.status]);

  const nameRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!editingId) requestAnimationFrame(() => nameRef.current?.focus());
  }, [editingId]);

  const showChecklist = form.status === "Kupiony" || form.status === "Wydane";
  const isClosed = form.status === "Wydane";
  const canEditChecklist = !isClosed || (user?.role === "ADMIN" && adminUnlockClosed);

  // whoami
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/whoami", { cache: "no-store" });
        if (!res.ok) return;
        const me = await res.json();
        if (me?.id) setUser(me as User);
      } catch {}
    })();
  }, []);

  // ustaw ownerId dla nowego leada
  useEffect(() => {
    if (!user) return;
    setForm((p) => ({ ...p, ownerId: p.ownerId || user.id }));
  }, [user]);

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    setUser(null);
  }

  async function reload() {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/leads?userId=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role)}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Błąd pobierania");
      setLeads(Array.isArray(data) ? data.map(mapFromDb) : []);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Błąd pobierania");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  // users (tylko ADMIN)
  useEffect(() => {
    if (!user) return;

    if (user.role !== "ADMIN") {
      setUsers([]);
      return;
    }

    fetch(`/api/users?role=${encodeURIComponent(user.role)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((list) => setUsers(dedupeAndSortUsers(Array.isArray(list) ? (list as UserRow[]) : [])))
      .catch(() => setUsers([]));
  }, [user]);

  // load do edycji
  useEffect(() => {
    if (!user) return;
    if (!editing) return;

    setForm({
      name: editing.name,
      phone: editing.phone,
      budgetPlnText: editing.budgetPln != null ? String(editing.budgetPln) : "",
      status: editing.status,
      notes: editing.notes || "",
      model: editing.model || "",
      yearText: editing.year != null ? String(editing.year) : "",
      auctionUrl: editing.auctionUrl || "",
      vin: editing.vin || "",
      ownerId: (editing.ownerId ?? user.id) || user.id,
      checklist: editing.checklist ?? {},
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  function resetForm() {
    if (!user) return;
    setEditingId(null);
    setAttachmentsLeadId(null);
    setForm({
      name: "",
      phone: "",
      budgetPlnText: "",
      status: "Kontakt",
      notes: "",
      model: "",
      yearText: "",
      auctionUrl: "",
      vin: "",
      ownerId: user.id,
      checklist: {},
    });
  }

  function parseBudget(): number | undefined {
    const budget = form.budgetPlnText.trim() ? Number(form.budgetPlnText.trim()) : undefined;
    return budget != null && !Number.isNaN(budget) ? Math.max(0, Math.round(budget)) : undefined;
  }

  function parseYear(): number | null {
    const y = form.yearText.trim();
    if (!y) return null;
    const n = Number(y);
    if (Number.isNaN(n)) return null;
    return n;
  }

  async function upsertLead() {
    if (!user) return;

    const name = form.name.trim();
    if (!name) return alert("Podaj imię/nazwę leada.");

    const safeBudget = parseBudget();
    const year = parseYear();
    const finalOwnerId = user.role === "ADMIN" ? form.ownerId || user.id : user.id;

    setSaving(true);
    try {
      if (!editing) {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            phone: form.phone.trim(),
            status: form.status,
            budget_min: safeBudget ?? null,
            looking_for: form.notes || null,
            model: form.model.trim() || null,
            year,
            auction_url: form.auctionUrl.trim() || null,
            vin: form.status === "Kupiony" ? form.vin.trim() || null : null,
            owner_id: finalOwnerId,
            checklist: form.checklist ?? {},
            actor_id: user.id,
            actor_role: user.role,
          }),
        });

        const created = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(created?.error || "Błąd zapisu");

        setLeads((prev) => [mapFromDb(created), ...prev]);
        resetForm();
        return;
      }

      const res = await fetch(`/api/leads/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: form.phone.trim(),
          status: form.status,
          budget_min: safeBudget ?? null,
          looking_for: form.notes || null,
          model: form.model.trim() || null,
          year,
          auction_url: form.auctionUrl.trim() || null,
          vin: form.status === "Kupiony" ? form.vin.trim() || null : null,
          owner_id: user.role === "ADMIN" ? finalOwnerId : undefined,
          checklist: form.checklist ?? {},
          actor_id: user.id,
          actor_role: user.role,
        }),
      });

      const updated = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(updated?.error || "Błąd zapisu");

      setLeads((prev) => prev.map((l) => (l.id === editing.id ? mapFromDb(updated) : l)));
      resetForm();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Błąd");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLead(id: string) {
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    if (!confirm(`Usunąć lead: ${l.name}?`)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Błąd usuwania");

      setLeads((prev) => prev.filter((x) => x.id !== id));
      if (editingId === id) resetForm();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Błąd");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(id: string, status: LeadStatus) {
    if (!user) return;

    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, vin: null, actor_id: user.id, actor_role: user.role }),
      });

      const updated = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(updated?.error || "Błąd");
      setLeads((prev) => prev.map((l) => (l.id === id ? mapFromDb(updated) : l)));
    } catch (e) {
      console.error(e);
      await reload();
    }
  }

  async function touchContact(id: string) {
    if (!user) return;

    const iso = new Date().toISOString();
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, lastContactAt: Date.now() } : l)));

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next_contact_at: iso, actor_id: user.id, actor_role: user.role }),
      });

      const updated = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(updated?.error || "Błąd");
      setLeads((prev) => prev.map((l) => (l.id === id ? mapFromDb(updated) : l)));
    } catch (e) {
      console.error(e);
      await reload();
    }
  }

  async function setFollowupInDays(id: string, days: number) {
    if (!user) return;

    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(10, 0, 0, 0);
    const iso = d.toISOString();

    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, lastContactAt: d.getTime() } : l)));

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next_contact_at: iso, actor_id: user.id, actor_role: user.role }),
      });

      const updated = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(updated?.error || "Błąd");
      setLeads((prev) => prev.map((l) => (l.id === id ? mapFromDb(updated) : l)));
    } catch (e) {
      console.error(e);
      await reload();
    }
  }

  async function uploadLeadFile(file: File) {
    if (!editingId) return;
    setUploading(true);
    try {
      const res = await fetch(
        `/api/blob/lead-upload?leadId=${encodeURIComponent(editingId)}&filename=${encodeURIComponent(file.name)}`,
        { method: "POST", body: file }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error(txt);
        alert("Błąd uploadu");
        return;
      }
      alert("Plik wgrany ✅");
      // otwórz panel załączników po uploadzie
      setAttachmentsLeadId(editingId);
    } finally {
      setUploading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...leads];

    if (statusFilter !== "Wszystkie") list = list.filter((l) => l.status === statusFilter);

    if (user?.role === "ADMIN" && ownerFilter !== "Wszyscy") {
      list = list.filter((l) => (l.ownerId || "") === ownerFilter);
    }

    if (followupView !== "all") {
      const now = Date.now();
      const sod = startOfDay(now);
      const eod = endOfDay(now);

      list = list.filter((l) => {
        const due = l.lastContactAt;
        if (!due) return false;
        if (followupView === "today") return due >= sod && due <= eod;
        return due < sod;
      });
    }

    if (q) {
      list = list.filter((l) =>
        `${l.name} ${l.phone} ${l.model ?? ""} ${l.year ?? ""} ${l.auctionUrl ?? ""} ${l.vin ?? ""} ${l.notes}`
          .toLowerCase()
          .includes(q)
      );
    }

    if (sort === "newest") list.sort((a, b) => b.createdAt - a.createdAt);
    if (sort === "oldest") list.sort((a, b) => a.createdAt - b.createdAt);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "pl"));

    return list;
  }, [leads, query, statusFilter, sort, ownerFilter, user?.role, followupView]);

  const stats = useMemo(() => {
    const byStatus = STATUSES.reduce((acc, s) => {
      acc[s] = 0;
      return acc;
    }, {} as Record<LeadStatus, number>);

    let sumBudget = 0;
    let budgetCount = 0;

    for (const l of leads) {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      if (l.budgetPln != null) {
        sumBudget += l.budgetPln;
        budgetCount++;
      }
    }

    const avgBudget = budgetCount ? Math.round(sumBudget / budgetCount) : undefined;
    return { total: leads.length, byStatus, avgBudget };
  }, [leads]);

  // ========================= RENDER =========================
  if (!user) return <Login onLogin={(u) => setUser(u)} />;

  if (view === "calc") {
    return (
      <Shell>
        <Topbar
          title="Kalkulator importu"
          subtitle={
            <>
              Zalogowany: <span className="font-semibold text-slate-900">{user.name}</span>{" "}
              <span className="text-slate-400">({user.role})</span>
            </>
          }
          view={view}
          setView={setView}
          reload={reload}
          logout={logout}
          loading={loading}
          saving={saving}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,.06)]">
          <ImportCalculatorPage />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Topbar
        title="CRM"
        subtitle={
          <>
            Zalogowany: <span className="font-semibold text-slate-900">{user.name}</span>{" "}
            <span className="text-slate-400">({user.role})</span>
          </>
        }
        view={view}
        setView={setView}
        reload={reload}
        logout={logout}
        loading={loading}
        saving={saving}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
          Łącznie: <b className="text-slate-900">{stats.total}</b>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
          Śr. budżet: <b className="text-slate-900">{formatPLN(stats.avgBudget) || "—"}</b>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* LEFT */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,.06)]">
          <div className="flex items-start justify-between gap-3 p-4">
            <div>
              <div className="text-sm font-semibold">{editing ? "Edytuj leada" : "Dodaj leada"}</div>
              <div className="mt-1 text-xs text-slate-500">{editing ? `ID: ${editing.id.slice(0, 10)}…` : ""}</div>
            </div>
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              onClick={resetForm}
              disabled={saving}
              type="button"
            >
              Reset
            </button>
          </div>

          <div className="border-t border-slate-200 p-4 space-y-3">
            <div>
              <Label>Imię / Nazwa</Label>
              <Input ref={nameRef} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div>
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Budżet (PLN)</Label>
                <Input
                  value={form.budgetPlnText}
                  onChange={(e) => setForm((p) => ({ ...p, budgetPlnText: e.target.value.replace(/[^0-9]/g, "") }))}
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label>Etap</Label>
                <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as LeadStatus }))}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {user.role === "ADMIN" && (
              <div>
                <Label>Opiekun (przypisz do)</Label>
                <Select value={form.ownerId} onChange={(e) => setForm((p) => ({ ...p, ownerId: e.target.value }))}>
                  <option value={user.id}>Ja ({user.name})</option>
                  {uniqueUsers
                    .filter((u) => (u.role === "SALES" || u.role === "ADMIN") && u.id !== user.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                </Select>
              </div>
            )}

            <div className="grid grid-cols-[1fr_110px] gap-3">
              <div>
                <Label>Model</Label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                  placeholder="np. BMW 540i G30"
                />
              </div>
              <div>
                <Label>Rocznik</Label>
                <Input
                  value={form.yearText}
                  onChange={(e) => setForm((p) => ({ ...p, yearText: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) }))}
                  inputMode="numeric"
                  placeholder="2019"
                />
              </div>
            </div>

            <div>
              <Label>Link do aukcji</Label>
              <Input
                value={form.auctionUrl}
                onChange={(e) => setForm((p) => ({ ...p, auctionUrl: e.target.value }))}
                placeholder="https://copart.com/lot/..."
              />
            </div>

            {form.status === "Kupiony" && (
              <div>
                <Label>VIN (tylko gdy Kupiony)</Label>
                <Input
                  value={form.vin}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      vin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17),
                    }))
                  }
                  placeholder="17 znaków"
                />
              </div>
            )}

            {showChecklist && (
              <div className="pt-2">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Checklist (import / wydanie)</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {form.status === "Kupiony" ? "Kupiony: checklistę można edytować." : "Wydane: checklist domyślnie zablokowany."}
                    </div>
                  </div>

                  {user.role === "ADMIN" && isClosed && (
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                      <input type="checkbox" checked={adminUnlockClosed} onChange={(e) => setAdminUnlockClosed(e.target.checked)} />
                      Odblokuj edycję
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {CHECKLIST.map((c) => {
                    const checked = !!form.checklist?.[c.key];
                    return (
                      <label
                        key={c.key}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                          canEditChecklist ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200 opacity-80"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canEditChecklist}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setForm((p) => ({ ...p, checklist: { ...(p.checklist ?? {}), [c.key]: next } }));
                          }}
                        />
                        <span className="text-xs text-slate-800">{c.label}</span>
                      </label>
                    );
                  })}
                </div>

                {!canEditChecklist && (
                  <div className="mt-2 text-xs text-slate-500">
                    Checklist zablokowana (status: <b>Wydane</b>).
                    {user.role === "ADMIN" ? " Zaznacz „Odblokuj edycję”, aby zmienić." : ""}
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Notatki</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                onClick={upsertLead}
                disabled={saving}
                type="button"
              >
                {saving ? "Zapis..." : editing ? "Zapisz zmiany" : "Dodaj leada"}
              </button>

              {editing && (
                <>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                    onClick={() => setAttachmentsLeadId(editing.id)}
                    disabled={saving}
                  >
                    Pliki
                  </button>

                  <label className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-60">
                    {uploading ? "Wgrywam..." : "Dodaj plik"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.currentTarget.value = "";
                        if (!file) return;
                        void uploadLeadFile(file);
                      }}
                      disabled={uploading || saving}
                    />
                  </label>

                  <button
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    onClick={() => deleteLead(editing.id)}
                    disabled={saving}
                    type="button"
                  >
                    Usuń
                  </button>
                </>
              )}
            </div>

            {/* Attachments panel */}
            {attachmentsLeadId && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Załączniki</div>
                  <button
                    type="button"
                    onClick={() => setAttachmentsLeadId(null)}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                  >
                    Zamknij
                  </button>
                </div>

                <div className="mt-4">
                  <LeadAttachments leadId={attachmentsLeadId} />
                </div>
              </div>
            )}

            <div className="pt-1 text-xs text-slate-500">
              {loading
                ? "Ładowanie…"
                : user.role === "ADMIN"
                ? "ADMIN: widzisz wszystko."
                : "SALES: widzisz tylko swoje leady (backend)."}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,.06)]">
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input className="flex-1 min-w-[220px]" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj…" />

              <Select className="w-[220px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="Wszystkie">Wszystkie etapy</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>

              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                <button
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    followupView === "all" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => setFollowupView("all")}
                  type="button"
                >
                  Wszystkie
                </button>
                <button
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    followupView === "today" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => setFollowupView("today")}
                  type="button"
                >
                  Dzisiaj
                </button>
                <button
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    followupView === "overdue" ? "bg-red-600 text-white" : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => setFollowupView("overdue")}
                  type="button"
                >
                  Zaległe
                </button>
              </div>

              {user.role === "ADMIN" && (
                <Select className="w-[220px]" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                  <option value="Wszyscy">Wszyscy opiekunowie</option>
                  <option value={user.id}>Ja ({user.name})</option>
                  {uniqueUsers
                    .filter((u) => (u.role === "SALES" || u.role === "ADMIN") && u.id !== user.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                </Select>
              )}

              <Select className="w-[150px]" value={sort} onChange={(e) => setSort(e.target.value as any)}>
                <option value="newest">Najnowsze</option>
                <option value="oldest">Najstarsze</option>
                <option value="name">A→Z</option>
              </Select>
            </div>
          </div>

          <div className="border-t border-slate-200">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-500">Lead</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-500">Etap</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-500">Auto</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-500">Budżet</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-500">Kontakt</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-500">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                        {loading ? "Ładowanie…" : "Brak wyników."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((l) => (
                      <tr
                        key={l.id}
                        onClick={() => {
                          setEditingId(l.id);
                          setAttachmentsLeadId(null);
                        }}
                        className={`cursor-pointer ${editingId === l.id ? "bg-blue-50" : "hover:bg-slate-50"}`}
                      >
                        <td className="border-b border-slate-100 px-4 py-3 align-top">
                          <div className="font-semibold text-slate-900">{l.name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Tel: {l.phone || "—"} • utw.: {formatDate(l.createdAt)}
                          </div>
                          {l.notes ? (
                            <div className="mt-2 text-sm text-slate-700">{l.notes.length > 90 ? l.notes.slice(0, 90) + "…" : l.notes}</div>
                          ) : null}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeBg(l.status)}`}>
                              {l.status}
                            </span>
                            <Select
                              className="w-[170px]"
                              value={l.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => quickStatus(l.id, e.target.value as LeadStatus)}
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3 align-top">
                          <div className="font-semibold text-slate-900">{(l.model || "—") + (l.year ? ` • ${l.year}` : "")}</div>
                          {l.auctionUrl ? (
                            <a
                              href={l.auctionUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 inline-block text-xs font-semibold text-blue-700 hover:underline"
                            >
                              Aukcja ↗
                            </a>
                          ) : (
                            <div className="text-xs text-slate-500">—</div>
                          )}
                          {l.status === "Kupiony" && l.vin ? <div className="mt-1 text-xs text-slate-500">VIN: {l.vin}</div> : null}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3 align-top">
                          <div className="font-semibold text-slate-900">{formatPLN(l.budgetPln) || "—"}</div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3 align-top">
                          <div className="text-xs text-slate-500">Follow-up: {formatDate(l.lastContactAt)}</div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                touchContact(l.id);
                              }}
                              type="button"
                            >
                              Dziś ✅
                            </button>

                            <button
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFollowupInDays(l.id, 1);
                              }}
                              type="button"
                            >
                              +1d
                            </button>

                            <button
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFollowupInDays(l.id, 3);
                              }}
                              type="button"
                            >
                              +3d
                            </button>

                            <button
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFollowupInDays(l.id, 7);
                              }}
                              type="button"
                            >
                              +7d
                            </button>

                            <button
                              className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteLead(l.id);
                              }}
                              type="button"
                            >
                              Usuń
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 text-xs text-slate-500">
              Tip: leady pobierane są z{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">/api/leads?userId=...&role=...</code>.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}