import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";

// TODO: import Twojej funkcji która sprawdza sesję (Supabase auth cookie)
// np. z Twojego pliku auth utils
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
  
    // dopasuj do tego co zwraca whoami:
    // najczęściej: { user: { id: ... } } albo { id: ... }
    const userId = data?.user?.id ?? data?.id ?? null;
    if (!userId) return null;
  
    return { id: String(userId) };
  }

export async function POST(request: Request) {
  // 1) autoryzacja
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) handleUpload tworzy podpisany token dla klienta
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // pathname będzie w stylu: leads/<leadId>/<filename>
        // możesz dodatkowo walidować leadId, typy plików itd.

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
          ],
          tokenPayload: JSON.stringify({
            // payload trafia potem do onUploadCompleted
            userId: user.id,
          }),
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // tutaj NIC nie zapisujemy do Supabase, bo ten callback bywa odpalany
        // w innym kontekście; zapis zrobimy “normalnie” po stronie API (krok 4)
        // ale możemy to zostawić puste:
        void tokenPayload;
        void blob;
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Upload error" },
      { status: 400 }
    );
  }
}