export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;

    // 🔎 Walidacja UUID
    if (!leadId || !/^[0-9a-fA-F-]{36}$/.test(leadId)) {
      return NextResponse.json(
        { error: "Invalid lead ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename") || "file";
    const contentType = req.headers.get("content-type") ?? null;

    if (!req.body) {
      return NextResponse.json(
        { error: "Empty body" },
        { status: 400 }
      );
    }

    // 1️⃣ Zapis do Vercel Blob
    const blob = await put(
      `leads/${leadId}/${Date.now()}-${filename}`,
      req.body,
      {
        access: "private",
        contentType: contentType ?? undefined,
      }
    );

    console.log("Blob saved:", blob.url);

    // 2️⃣ Zapis metadanych do Supabase
    const { data, error } = await supabase
      .from("lead_files")
      .insert({
        id: crypto.randomUUID(),
        lead_id: leadId,
        filename,
        content_type: contentType,
        blob_url: blob.url,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("Insert OK:", data);

    return NextResponse.json({
      success: true,
      file: data,
    });

  } catch (e: any) {
    console.error("UPLOAD ERROR:", e);
    return NextResponse.json(
      { error: e?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}


