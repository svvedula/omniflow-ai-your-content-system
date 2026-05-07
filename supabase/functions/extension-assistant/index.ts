import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { prompt, screenshot, pageUrl, pageTitle } = await req.json();
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
- Answer questions about what's on the page

Respond in this JSON format:
{
  "type": "text" | "table" | "reply" | "list",
  "title": "short title",
  "content": "main response text (use markdown)",
  "table": { "columns": ["col1","col2"], "rows": [["a","b"]] } | null,
  "items": ["item1","item2"] | null,
  "actions": ["copy","insert"] | []
}

Be concise, useful, and direct. If a table fits, return one. If it's a reply draft, put it in content.`;

    const userParts: any[] = [
      { type: "text", text: `Page: ${pageTitle || "Unknown"}\nURL: ${pageUrl || "N/A"}\n\nUser request: ${prompt}` },
    ];
    if (screenshot) {
      userParts.push({ type: "image_url", image_url: { url: screenshot } });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userParts },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit hit. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error [${aiRes.status}]: ${errText}`);
    }

    const data = await aiRes.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\n?|```/g, "").replace(/[\u0000-\u001F]/g, " ").trim();

    let result;
    try { result = JSON.parse(cleaned); }
    catch { result = { type: "text", title: "Response", content: raw, table: null, items: null, actions: [] }; }

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("extension-assistant error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
