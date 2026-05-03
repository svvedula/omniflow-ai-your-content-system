import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { businessName, model, monthlyRevenue, monthlyCosts, growthRate, cac, ltv, runwayMonths, notes } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `You are a CFO-grade financial analyst. Build a 12-month financial model for the following business.

Business: ${businessName || "Unnamed"}
Model: ${model || "SaaS"}
Starting MRR/Revenue: $${monthlyRevenue || 0}
Monthly Costs: $${monthlyCosts || 0}
Expected monthly growth: ${growthRate || 5}%
CAC: $${cac || 0}
LTV: $${ltv || 0}
Current runway: ${runwayMonths || 0} months
Notes: ${notes || "n/a"}

Return ONLY a JSON object (no markdown) of shape:
{
  "summary": "1-2 sentence health verdict",
  "ltv_cac_ratio": number,
  "payback_months": number,
  "break_even_month": number | null,
  "projection": [{"month": 1, "revenue": number, "costs": number, "profit": number, "cumulative_profit": number}],
  "risks": ["string"],
  "recommendations": ["string"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) throw new Error(`AI error ${response.status}`);

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "{}";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").replace(/[\u0000-\u001F]+/g, " ");
    const result = JSON.parse(content);

    return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("financial-model error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
