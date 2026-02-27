import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

// (zostawiamy Twoją autoryzację jak była)
async function requireUser(request: Request) {
  const res = await fetch(new URL("/api/whoami", request.url), {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
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
  const filename = searchParams.get("filename");
  const leadId = searchParams.get("leadId");

  if (!filename || !leadId) {
    return NextResponse.json(
      { error: "Missing filename or leadId" },
      { status: 400 }
    );
  }

  // upload do Vercel Blob (private)
  const blob = await put(`leads/${leadId}/${filename}`, request.body, {
    access: "private",
    addRandomSuffix: true,
    contentType: request.headers.get("content-type") ?? undefined,
  });

  return NextResponse.json(blob);
}
