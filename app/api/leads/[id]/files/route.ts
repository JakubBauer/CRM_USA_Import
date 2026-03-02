export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const leadId = ctx.params.id;

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename") || "file";
    const contentType = req.headers.get("content-type") ?? null;

    if (!req.body) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 });
    }

    const blob = await put(`leads/${leadId}/${Date.now()}-${filename}`, req.body, {
      access: "private",
      contentType: contentType ?? undefined,
    });

    const { error } = await supabase.from("lead_files").insert({
      lead_id: leadId,
      filename,
      content_type: contentType,
      blob_url: blob.url,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(blob);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}


