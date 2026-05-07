import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
      throw new Error("Server not configured");
    }

    const apiKey = req.headers.get("x-extension-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing x-extension-key header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: access, error: accessErr } = await admin.rpc("check_extension_access", { p_api_key: apiKey });
    if (accessErr) throw accessErr;
    if (!access?.valid) {
      return new Response(JSON.stringify({ error: access?.error || "Access denied", code: "ACCESS_REQUIRED" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, screenshot, pageUrl, pageTitle, history } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are OmniFlow's browser copilot. The user is viewing a webpage and needs help.

You can:
- Extract structured data (tables, lists) from what's on screen
- Draft replies to messages/emails visible on screen
- Find outliers, patterns, or specific items in dashboards/databases shown
- Summarize, analyze, or reformat anything visible
- Refine your previous output when the user asks for tweaks (keep unchanged parts intact, only modify what's requested)

If prior assistant messages exist in history, treat the user's new message as a refinement of that output. Return the FULL updated result (not just the diff) in the same JSON shape.

Respond in this JSON format:
{
  "type": "text" | "table" | "reply" | "list",
  "title": "short title",
  "content": "main response text (use markdown)",
  "table": { "columns": ["col1","col2"], "rows": [["a","b"]] } | null,
  "items": ["item1","item2"] | null,
  "actions": ["copy","insert"] | []
}

Be concise, useful, and direct.`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (Array.isArray(history)) {
      for (const m of history.slice(-8)) {
        if (m?.role && typeof m.content === "string") {
          messages.push({ role: m.role, content: m.content });
        }
      }
    }
    const userParts: any[] = [
      { type: "text", text: `Page: ${pageTitle || "Unknown"}\nURL: ${pageUrl || "N/A"}\n\nUser request: ${prompt}` },
    ];
    if (screenshot) userParts.push({ type: "image_url", image_url: { url: screenshot } });
    messages.push({ role: "user", content: userParts });

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI [${aiRes.status}]: ${errText}`);
    }

    const data = await aiRes.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\n?|```/g, "").replace(/[\u0000-\u001F]/g, " ").trim();
    let result;
    try { result = JSON.parse(cleaned); }
    catch { result = { type: "text", title: "Response", content: raw, table: null, items: null, actions: [] }; }

    return new Response(JSON.stringify({ ...result, _source: access.source }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("extension-assistant error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
