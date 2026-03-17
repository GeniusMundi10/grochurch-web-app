import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();

    const Papa = (await import("papaparse")).default;
    const { data: records, errors, meta } = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.toLowerCase().trim()
    });

    if (records.length === 0) {
      return NextResponse.json({ success: false, error: "No valid data rows found in CSV." }, { status: 400 });
    }

    let insertedCount = 0;
    let errorCount = 0;

    // Process in batches
    const batchSize = 100;
    let currentBatch: any[] = [];

    for (const record of records as any[]) {
      // Flexible matching for phone column names
      const phoneKey = Object.keys(record).find(k => k.includes("phone") || k.includes("number") || k.includes("mobile") || k.includes("contact"));
      if (!phoneKey) continue;
      
      const phoneRaw = record[phoneKey];
      if (!phoneRaw) continue;

      // Clean phone number
      const phone = String(phoneRaw).replace(/\D/g, "");
      if (phone.length < 10) continue; 

      // Flexible matching for name
      const nameKey = Object.keys(record).find(k => k.includes("name") || k.includes("first") || k.includes("last"));
      let name = nameKey ? record[nameKey] : null;

      // Flexible matching for email
      const emailKey = Object.keys(record).find(k => k.includes("email") || k.includes("mail"));
      let email = emailKey ? record[emailKey] : null;

      currentBatch.push({
          user_id: user.id,
          name: name || null,
          phone: phone,
          email: email || null,
          source: 'manual_import',
          status: 'new_visitor',
          custom_attributes: {} // Could spread other columns here if needed
      });

      if (currentBatch.length >= batchSize) {
          const { error } = await supabase.from('leads').upsert(currentBatch, { onConflict: 'user_id, phone' });
          if (error) {
              console.error("Batch insert error:", error);
              errorCount += currentBatch.length;
          } else {
              insertedCount += currentBatch.length;
          }
          currentBatch = [];
      }
    }

    // Insert remaining
    if (currentBatch.length > 0) {
      const { error } = await supabase.from('leads').upsert(currentBatch, { onConflict: 'user_id, phone' });
      if (error) {
          console.error("Batch insert error:", error);
          errorCount += currentBatch.length;
      } else {
          insertedCount += currentBatch.length;
      }
    }

    return NextResponse.json({
        success: true,
        message: `Successfully processed CSV. Uploaded ${insertedCount} leads.`,
        inserted: insertedCount,
        failed: errorCount
    });

  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to parse file" }, { status: 500 });
  }
}
