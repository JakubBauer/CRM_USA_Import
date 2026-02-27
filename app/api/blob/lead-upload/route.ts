import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

async function requireUser(request: Request) {
  const res = await fetch(new URL("/api/whoami", request.url), {
    method: "GET",
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  const userId = data?.user?.id ?? data?.id ?? null;
  if (!userId) return null;

  return { id: String(userId) };
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");
  const filename = searchParams.get("filename");

  if (!leadId || !filename) {
    return NextResponse.json({ error: "Missing leadId or filename" }, { status: 400 });
  }

  // (opcjonalnie) prosta walidacja leadId żeby nie dało się wstrzyknąć ścieżek
  if (!/^[a-zA-Z0-9_-]+$/.test(leadId)) {
    return NextResponse.json({ error: "Invalid leadId" }, { status: 400 });
  }

  // Uwaga: request.body to stream z pliku (idealne do put)
  const pathname = `leads/${leadId}/${Date.now()}-${filename}`;

  try {
    const blob = await put(pathname, request.body, {
      access: "private", // albo "public" jeśli chcesz linki bez podpisu
      // contentType: request.headers.get("content-type") ?? undefined, // możesz zostawić
    });

    // TU na razie tylko zwracamy blob. Zapis do Supabase zrobimy osobnym endpointem (albo od razu tutaj, jeśli chcesz).
    return NextResponse.json(blob);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Upload error" }, { status: 400 });
  }
}
