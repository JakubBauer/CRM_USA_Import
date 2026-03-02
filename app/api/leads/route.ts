export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

// GET /api/leads?userId=...&role=ADMIN|SALES
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = String(searchParams.get("userId") ?? "").trim();
  const role = String(searchParams.get("role") ?? "").trim();

  if (!userId || !role) return json({ error: "Missing userId or role" }, 400);

  let q = supabaseServer
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  // SALES widzi tylko swoje leady
  if (role !== "ADMIN") {
    q = q.eq("owner_id", userId);
  }

  const { data, error } = await q;
  if (error) return json({ error: error.message }, 500);

  return json({ leads: data ?? [] });
}

// POST /api/leads
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return json({ error: "invalid body" }, 400);

  const actorId = String(body?.actor_id ?? "").trim();
  const actorRole = String(body?.actor_role ?? "").trim(); // "ADMIN" | "SALES"
  if (!actorId || !actorRole) {
    return json({ error: "actor_id and actor_role are required" }, 400);
  }

  const ownerId = String(body?.owner_id ?? actorId).trim();

  // SALES nie może tworzyć leada dla kogoś innego
  if (actorRole !== "ADMIN" && ownerId !== actorId) {
    return json({ error: "Forbidden: owner_id" }, 403);
  }

  const status = body?.status ?? "Kontakt";
  const vin = body?.vin !== undefined ? (String(body.vin).trim() || null) : null;

  const payload: any = {
    name: String(body?.name ?? "").trim(),
    phone: String(body?.phone ?? "").trim(),
    looking_for: body?.looking_for ?? null,
    budget_min: body?.budget_min == null ? null : Number(body.budget_min),
    budget_max: body?.budget_max == null ? null : Number(body.budget_max),
    status,
    potential: body?.potential ?? null,
    next_contact_at: body?.next_contact_at ?? null,
    owner_id: ownerId,
    model: String(body?.model ?? "").trim() || null,
    year: body?.year == null ? null : Number(body.year),
    auction_url: String(body?.auction_url ?? "").trim() || null,
    checklist: body?.checklist ?? {},
    // VIN tylko gdy Kupiony, inaczej null
    vin: status === "Kupiony" ? vin : null,
  };

  const { data, error } = await supabaseServer
    .from("leads")
    .insert(payload)
    .select("*")
    .single();

  if (error) return json({ error: error.message }, 500);
  return json(data);
}