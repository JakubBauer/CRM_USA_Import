export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

async function requireUser(request: Request): Promise<{ id: string } | null> {
  const res = await fetch(new URL("/api/whoami", request.url), {
    method: "GET",
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  const userId = data?.user?.id ?? data?.id ?? null;
  return userId ? { id: String(userId) } : null;
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

  // ✅ FIX: request.body może być null
  if (!request.body) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  const blob = await put(`leads/${leadId}/${filename}`, request.body, {
    access: "private",
    addRandomSuffix: true,
    contentType: request.headers.get("content-type") ?? undefined,
  });

  return NextResponse.json(blob);
}