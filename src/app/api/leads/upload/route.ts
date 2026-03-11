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
    // A simple CSV parser (assuming standard comma-separated with headers)
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) {
      return NextResponse.json({ success: false, error: "File must contain a header row and at least one data row" }, { status: 400 });
    }

    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    
    // Find expected column indices
    const nameIdx = headers.findIndex(h => h.includes("name"));
    const phoneIdx = headers.findIndex(h => h.includes("phone"));
    const emailIdx = headers.findIndex(h => h.includes("email"));

    if (phoneIdx === -1) {
      return NextResponse.json({ success: false, error: "CSV must contain a 'phone' column" }, { status: 400 });
    }

    let insertedCount = 0;
    let errorCount = 0;

    // Process in batches
    const batchSize = 100;
    let currentBatch: any[] = [];

    // Basic CSV splitting that handles quotes (simplified)
    const parseCSVRow = (row: string) => {
        const result = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < row.length; i++) {
            if (row[i] === '"') {
                inQuote = !inQuote;
            } else if (row[i] === ',' && !inQuote) {
                result.push(cur.trim());
                cur = '';
            } else {
                cur += row[i];
            }
        }
        result.push(cur.trim());
        return result;
    };

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        const phoneRaw = row[phoneIdx];
        if (!phoneRaw) continue;

        // Clean phone number
        const phone = phoneRaw.replace(/\D/g, "");
        if (phone.length < 10) continue; 

        let name = nameIdx !== -1 ? row[nameIdx] : null;
        if (name && name.startsWith('"') && name.endsWith('"')) {
            name = name.substring(1, name.length - 1);
        }

        let email = emailIdx !== -1 ? row[emailIdx] : null;

        currentBatch.push({
            user_id: user.id,
            name: name || null,
            phone: phone,
            email: email || null,
            source: 'manual_import',
            status: 'new_visitor',
            custom_attributes: {}
        });

        if (currentBatch.length >= batchSize || i === lines.length - 1) {
            if (currentBatch.length > 0) {
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
