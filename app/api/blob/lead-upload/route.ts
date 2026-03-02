export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const leadId = searchParams.get("leadId");
    const filename = searchParams.get("filename") ?? "file";
    const contentType = req.headers.get("content-type") ?? null;

    if (!leadId) {
      return NextResponse.json(
        { error: "Missing leadId" },
        { status: 400 }
      );
    }

    if (!req.body) {
      return NextResponse.json(
        { error: "Empty body" },
        { status: 400 }
      );
    }

    // 1️⃣ Zapis do Blob
    const blob = await put(
      `leads/${leadId}/${Date.now()}-${filename}`,
      req.body,
      {
        access: "private",
        contentType: contentType ?? undefined,
        addRandomSuffix: false,
      }
    );

    // 2️⃣ Zapis do Supabase
    const { error } = await supabase.from("lead_files").insert({
      id: crypto.randomUUID(),
      lead_id: leadId,
      filename,
      content_type: contentType,
      blob_url: blob.url,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error("UPLOAD ERROR:", e);
    return NextResponse.json(
      { error: e?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}