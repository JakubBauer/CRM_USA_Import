import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// użyj tych samych env co masz w projekcie
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // UWAGA: tylko na serwerze, nie w kliencie
);

async function requireUser(_request: Request) {
  // TODO: Twoje sprawdzanie sesji (jak w kroku 2)
  return { id: "ok" };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
    const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = params.id;

  const body = await request.json();
  const { fileName, contentType, size, blobUrl, blobPathname } = body ?? {};

  if (!blobUrl || !blobPathname || !fileName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lead_attachments")
    .insert({
      lead_id: leadId,
      file_name: fileName,
      content_type: contentType ?? null,
      size: size ?? null,
      blob_url: blobUrl,
      blob_pathname: blobPathname,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, attachment: data });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = params.id;

  const { data, error } = await supabase
    .from("lead_attachments")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ attachments: data ?? [] });
}