import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { context, niche } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `You are a chief-of-staff with deep market knowledge. Suggest 5 high-leverage action items tailored to the user's specific niche, referencing what's working in that market right now (based on patterns you know from training).

User niche/business: ${niche || "general"}
Recent context: ${context || "n/a"}

REQUIREMENTS:
- Each task must reference a niche-specific lever (channel, tactic, partner type, content angle that actually works in this vertical).
- "why" must mention the market reality: a competitor pattern, a buyer behavior, a channel that's currently underpriced, etc.
- No generic "post on social media" fluff. Be specific: which platform, which format, which angle, why now.

Return ONLY JSON:
{
  "tasks": [
    {"title": "short verb-led task (max 8 words)", "priority": "high|medium|low", "why": "1-2 sentences with market-specific reasoning"}
  ]
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
    const result = JSON.parse(c);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("action-suggestions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
