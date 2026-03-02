"use client";

import { useEffect, useRef, useState } from "react";

type LeadFile = {
  id: string;
  lead_id: string;
  filename: string;
  content_type: string | null;
  size: number | null;
  blob_url: string;
  created_at: string;
};

export function LeadAttachments({ leadId }: { leadId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<LeadFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isValidUUID = (id: string) =>
    /^[0-9a-fA-F-]{36}$/.test(id);

  async function refresh() {
    try {
      setErr(null);

      if (!leadId || !isValidUUID(leadId)) {
        setFiles([]);
        return;
      }

      const res = await fetch(`/api/leads/${leadId}/files`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error ?? "Błąd pobierania plików");
      }

      setFiles(json?.files ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Błąd pobierania");
    }
  }

  useEffect(() => {
    if (!leadId) return;
    refresh();
  }, [leadId]);

  async function uploadSelected() {
    try {
      setErr(null);

      const file = inputRef.current?.files?.[0];
      if (!file) return;

      if (!isValidUUID(leadId)) {
        throw new Error("Nieprawidłowe ID leada");
      }

      setBusy(true);

      const res = await fetch(
        `/api/leads/${leadId}/files/upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          body: file,
          headers: {
            "content-type": file.type || "application/octet-stream",
          },
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error ?? "Upload nieudany");
      }

      if (inputRef.current) inputRef.current.value = "";

      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Błąd uploadu");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">Załączniki</div>

        <div className="flex items-center gap-2">
          <input ref={inputRef} type="file" className="text-sm" />
          <button
            onClick={uploadSelected}
            disabled={busy}
            className="px-3 py-2 rounded-xl border text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            {busy ? "Wysyłam..." : "Dodaj plik"}
          </button>
        </div>
      </div>

      {err && (
        <div className="text-sm text-red-600">{err}</div>
      )}

      {files.length === 0 ? (
        <div className="text-sm text-gray-500">
          Brak plików dla tego leada.
        </div>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-xl border p-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {f.filename}
                </div>
                <div className="text-xs text-gray-500">
                  {f.content_type ?? "plik"} ·{" "}
                  {f.size
                    ? `${Math.round(f.size / 1024)} KB`
                    : "—"}{" "}
                  ·{" "}
                  {new Date(f.created_at).toLocaleString("pl-PL")}
                </div>
              </div>

              <a
  className="text-sm font-semibold underline whitespace-nowrap"
  href={`/api/file?pathname=${encodeURIComponent(
    new URL(f.blob_url).pathname.slice(1)
  )}`}
  target="_blank"
  rel="noreferrer"
>
  Otwórz
</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}