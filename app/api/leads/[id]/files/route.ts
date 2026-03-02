import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../../lib/supabaseServer";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

// GET /api/leads/:id/files  -> lista plików leada
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const leadId = params.id;

  const { data, error } = await supabaseServer
    .from("lead_files")
    .select("id, lead_id, filename, content_type, size, blob_url, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) return json({ error: error.message }, 500);

  return json({ files: data ?? [] });
}


