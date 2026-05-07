import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Lightweight scan: fetch URL, extract text, ask AI to compare to last snapshot.
// Firecrawl is wired separately by the user; this works without it.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url, lastSnapshot } = await req.json();
    if (!url) throw new Error("url required");

    let html = "";
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 OmniFlowBot" } });
      html = await r.text();
    } catch (e) {
      throw new Error("Failed to fetch URL");
    }

    // strip scripts/styles + tags
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `You are a competitive intelligence analyst. Analyze this competitor page, compare against the previous snapshot if provided, AND apply your background knowledge of this competitor (if you recognize them) and their market.

URL: ${url}
CURRENT TEXT:
${text}

PREVIOUS SNAPSHOT:
${lastSnapshot ? lastSnapshot.slice(0, 4000) : "NONE — this is the first scan."}

REQUIREMENTS:
- If you recognize this company from training, add what you know (typical positioning, known funding, usual playbook) into market_context.
- Key signals should call out specific pricing tiers, feature names, or messaging shifts — not vague observations.
- Threat level must be justified by specific evidence in the text.

Return ONLY JSON:
{
  "headline": "1-line summary of what this page is",
  "market_context": "1-2 sentences on who this company is and how they typically operate (only if recognized — else 'unknown competitor')",
  "key_signals": [{"type": "pricing|feature|positioning|messaging|other", "detail": "string"}],
  "changes_since_last": ["string"],
  "threat_level": "low|medium|high",
  "threat_reasoning": "1 sentence on why that level",
  "recommended_action": "specific tactical move the user should make"
}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) throw new Error(`AI ${r.status}`);

    const data = await r.json();
    let c = data.choices?.[0]?.message?.content || "{}";
    c = c.replace(/```json\s*/g, "").replace(/```\s*/g, "").replace(/[\u0000-\u001F]+/g, " ");
    const analysis = JSON.parse(c);

    return new Response(JSON.stringify({ analysis, snapshot: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("watchtower-scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
