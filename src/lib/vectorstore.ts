// Utility to trigger vectorstore creation via worker endpoint
export async function triggerVectorstoreCreation(aiId: string, sessionCookie?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(
      "https://growbro-vectorstore-worker.fly.dev/create-vectorstore",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionCookie ? { "Cookie": sessionCookie } : {})
        },
        body: JSON.stringify({ ai_id: aiId, session_cookie: sessionCookie })
      }
    );
    if (!res.ok) {
      const msg = await res.text();
      return { success: false, message: msg };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || "Unknown error" };
  }
}
