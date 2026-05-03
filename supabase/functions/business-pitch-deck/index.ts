import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { company, oneLiner, problem, solution, market, businessModel, traction, team, ask } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `You are a YC-grade pitch coach. Generate a 10-slide investor pitch deck.

Company: ${company}
One-liner: ${oneLiner || "n/a"}
Problem: ${problem || "n/a"}
Solution: ${solution || "n/a"}
Market: ${market || "n/a"}
Business Model: ${businessModel || "n/a"}
Traction: ${traction || "n/a"}
Team: ${team || "n/a"}
Ask: ${ask || "n/a"}

Return ONLY JSON (no markdown):
{
  "title": "Deck title",
  "slides": [
    {"number": 1, "title": "Slide title", "headline": "Big bold statement", "bullets": ["point", "point"], "speaker_notes": "what to say"}
  ]
}
Generate exactly these 10 slides: Cover, Problem, Solution, Market, Product, Business Model, Traction, Competition, Team, Ask.`;

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
    return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("pitch-deck error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
