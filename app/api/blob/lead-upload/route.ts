export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const leadId = params.id;

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename") ?? "file";

  const contentType = req.headers.get("content-type") ?? undefined;

  // ✅ FIX: req.body może być null
  if (!req.body) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  const blob = await put(
    `leads/${leadId}/${Date.now()}-${filename}`,
    req.body,
    {
      access: "private",
      contentType,
      addRandomSuffix: false,
    }
  );

  return NextResponse.json(blob);
}