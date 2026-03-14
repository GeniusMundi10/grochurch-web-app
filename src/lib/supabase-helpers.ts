import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const WORKER_API_URL = process.env.NEXT_PUBLIC_WORKER_API_URL || "https://growbro-vectorstore-worker.fly.dev";

// ===================== AI SERVICES =====================

export interface AIServices {
  id?: string;
  ai_id: string;
  user_id: string;
  business_services: string;
  differentiation: string;
  profitable_line_items: string;
  best_sales_lines: string;
}

export async function getAIServices(aiId: string, userId: string) {
  const { data, error } = await supabase
    .from("ai_services")
    .select("*")
    .eq("ai_id", aiId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) console.error("getAIServices error:", error);
  return data;
}

export async function upsertAIServices(aiId: string, userId: string, fields: Partial<AIServices>) {
  const { data: existing } = await supabase
    .from("ai_services")
    .select("id")
    .eq("ai_id", aiId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("ai_services")
      .update(fields)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) { console.error("upsertAIServices update error:", error); return null; }
    return data;
  } else {
    const { data, error } = await supabase
      .from("ai_services")
      .insert([{ ...fields, ai_id: aiId, user_id: userId }])
      .select()
      .single();
    if (error) { console.error("upsertAIServices insert error:", error); return null; }
    return data;
  }
}

// ===================== AI GREETINGS =====================

export interface AIGreeting {
  id?: string;
  ai_id?: string;
  user_id: string;
  label: string;
  message: string;
}

export async function getFirstGreeting(aiId: string) {
  const { data, error } = await supabase
    .from("ai_greeting")
    .select("*")
    .eq("ai_id", aiId)
    .eq("label", "First Greeting")
    .maybeSingle();
  if (error) console.error("getFirstGreeting error:", error);
  return data;
}

export async function upsertFirstGreeting(aiId: string, userId: string, message: string) {
  const { data: existing } = await supabase
    .from("ai_greeting")
    .select("id")
    .eq("ai_id", aiId)
    .eq("label", "First Greeting")
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("ai_greeting")
      .update({ message })
      .eq("id", existing.id);
    if (error) { console.error("upsertFirstGreeting update error:", error); return false; }
  } else {
    const { error } = await supabase
      .from("ai_greeting")
      .insert([{ ai_id: aiId, user_id: userId, label: "First Greeting", message }]);
    if (error) { console.error("upsertFirstGreeting insert error:", error); return false; }
  }
  return true;
}

// ===================== AI FILES =====================

export interface AIFile {
  id: string;
  ai_id: string;
  user_id: string;
  url: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at?: string;
}

export async function getAIFiles(aiId: string): Promise<AIFile[]> {
  const { data, error } = await supabase
    .from("ai_files")
    .select("*")
    .eq("ai_id", aiId)
    .order("created_at", { ascending: false });
  if (error) { console.error("getAIFiles error:", error); return []; }
  return data || [];
}

export async function uploadAIFileToStorage(aiId: string, file: File) {
  const fileExt = file.name.split(".").pop();
  const filePath = `${aiId}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from("ai-training-files")
    .upload(filePath, file);

  if (error) { console.error("uploadAIFileToStorage error:", error); return null; }

  const { data: urlData } = supabase.storage
    .from("ai-training-files")
    .getPublicUrl(filePath);

  return { url: urlData.publicUrl, file_path: filePath };
}

export async function upsertAIFile(aiId: string, userId: string, fileInfo: {
  url: string; file_path: string; file_name: string; file_type: string; file_size: number;
}) {
  const { data, error } = await supabase
    .from("ai_files")
    .insert([{ ai_id: aiId, user_id: userId, ...fileInfo }])
    .select()
    .single();
  if (error) { console.error("upsertAIFile error:", error); return null; }
  return data;
}

export async function deleteAIFile(fileId: string, filePath: string) {
  const { error: storageError } = await supabase.storage
    .from("ai-training-files")
    .remove([filePath]);
  if (storageError) console.error("deleteAIFile storage error:", storageError);

  const { error: dbError } = await supabase
    .from("ai_files")
    .delete()
    .eq("id", fileId);
  if (dbError) { console.error("deleteAIFile db error:", dbError); return false; }
  return true;
}

export async function processFilesWithWorker(aiId: string, fileUrls: string[]) {
  try {
    const response = await fetch(`${WORKER_API_URL}/add-files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_id: aiId, file_urls: fileUrls, project: "grochurch" }),
    });
    const result = await response.json();
    return { success: response.ok, result };
  } catch (err: any) {
    return { success: false, result: { message: err?.message || "Unknown error" } };
  }
}

export async function removeFilesFromWorker(aiId: string, fileUrls: string[]) {
  try {
    const response = await fetch(`${WORKER_API_URL}/remove-files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_id: aiId, file_urls: fileUrls, project: "grochurch" }),
    });
    const result = await response.json();
    return { success: response.ok, result };
  } catch (err: any) {
    return { success: false, result: { message: err?.message || "Unknown error" } };
  }
}
