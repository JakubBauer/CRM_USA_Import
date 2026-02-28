export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  const filename = searchParams.get("filename") ?? "file";
  const contentType = req.headers.get("content-type") ?? undefined;

  if (!leadId) {
    return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
  }

  if (!req.body) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  const blob = await put(`leads/${leadId}/${Date.now()}-${filename}`, req.body, {
    access: "private",
    contentType,
    addRandomSuffix: false,
  });

  return NextResponse.json(blob);
}