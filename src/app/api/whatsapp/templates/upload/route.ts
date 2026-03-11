import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "ai-files";
const SUPPORTED_TYPES = new Set(["IMAGE", "VIDEO", "DOCUMENT"]);

const MIME_WHITELIST: Record<string, string[]> = {
  IMAGE: ["image/jpeg", "image/png"],
  VIDEO: ["video/mp4", "video/3gpp", "video/quicktime"],
  DOCUMENT: ["application/pdf"],
};

const MAX_BYTES: Record<string, number> = {
  IMAGE: 5 * 1024 * 1024, // 5 MB per Meta docs
  VIDEO: 16 * 1024 * 1024, // 16 MB per Meta docs
  DOCUMENT: 100 * 1024 * 1024, // 100 MB per Meta docs
};

function sanitizeFileName(name: string): string {
  const parts = name.split(".");
  const ext = parts.length > 1 ? parts.pop() : undefined;
  const base = parts.join(".");
  const safeBase = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const safeExt = ext ? ext.toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  return `${safeBase || "file"}.${safeExt || "bin"}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ai_id: aiId, header_type: headerTypeRaw = "", file_name, file_type, file_size } = body;
    const headerType = headerTypeRaw.toUpperCase();

    if (!aiId) {
      return NextResponse.json({ success: false, error: "Missing ai_id" }, { status: 400 });
    }

    if (!SUPPORTED_TYPES.has(headerType)) {
      return NextResponse.json({ success: false, error: "Unsupported header type" }, { status: 400 });
    }

    if (!file_name || !file_type || file_size == null) {
      return NextResponse.json({ success: false, error: "Missing file metadata" }, { status: 400 });
    }

    // Ensure the AI belongs to the authenticated user
    const { data: aiRecord } = await supabase
      .from("business_info")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", aiId)
      .maybeSingle();

    if (!aiRecord) {
      return NextResponse.json({ success: false, error: "Invalid AI selection" }, { status: 403 });
    }

    const mimeType = file_type || "application/octet-stream";
    const allowedMimes = MIME_WHITELIST[headerType];
    if (!allowedMimes.includes(mimeType)) {
      return NextResponse.json({ success: false, error: "Unsupported file type" }, { status: 415 });
    }

    const maxBytes = MAX_BYTES[headerType];
    if (maxBytes && file_size > maxBytes) {
      return NextResponse.json({ success: false, error: "File too large" }, { status: 413 });
    }

    const fileName = sanitizeFileName(file_name || `${headerType.toLowerCase()}-sample`);
    const storagePath = `whatsapp-templates/${user.id}/${aiId}/${Date.now()}-${fileName}`;

    const { data, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (uploadError || !data?.signedUrl) {
      console.error("[Template Upload] Storage error:", uploadError);
      return NextResponse.json({ success: false, error: "Failed to create upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      token: data.token,
      path: storagePath,
      content_type: mimeType,
      file_name: file_name,
    });
  } catch (error) {
    console.error("[Template Upload] Unexpected error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
