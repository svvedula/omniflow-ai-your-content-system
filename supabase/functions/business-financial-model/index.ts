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

    const prompt = `You are a CFO + market analyst hybrid. You combine financial modeling with deep knowledge of industry benchmarks, competitive dynamics, and market patterns. Build a NICHE-AWARE 12-month financial model.

USER INPUT
Business: ${businessName || "Unnamed"}
Model / Niche: ${model || "SaaS"}
Starting MRR/Revenue: $${monthlyRevenue || 0}
Monthly Costs: $${monthlyCosts || 0}
User's expected monthly growth: ${growthRate || 5}%
CAC: $${cac || 0}
LTV: $${ltv || 0}
Current runway: ${runwayMonths || 0} months
Context: ${notes || "n/a"}

ANALYSIS REQUIREMENTS — DO ALL OF THESE BEFORE PROJECTING:
1. Identify the specific niche/sub-vertical (e.g. "vertical SaaS for dentists", "DTC skincare", "B2B fintech infra"). State it in market_context.niche.
2. Recall typical benchmarks for that niche from your training: median monthly growth rate, typical CAC, typical LTV, median gross margin, churn patterns, seasonality. Compare USER numbers to benchmarks and flag discrepancies.
3. Recall the major competitor patterns and recent moves (incumbents, well-known startups, common new entrants) — even if you don't have today's news, you know how this market behaves.
4. Build the projection using a BLENDED growth curve (not just user's flat % per month):
   - Apply realistic seasonality if the niche has it (e-comm Q4 spike, B2B summer slowdown, etc.)
   - Apply a growth decay curve as the business scales (early growth rarely sustains)
   - Bake in 1-2 plausible competitive shocks (e.g. "month 4: competitor likely launches Y → revenue dip 8%") as part of the projection narrative, not just risks.
5. Risks must be SPECIFIC to the niche and reference real competitor archetypes or market dynamics by name where possible. No generic "market may change" fluff.
6. Recommendations must be tactical and niche-specific.

Return ONLY a JSON object (no markdown):
{
  "summary": "1-2 sentence health verdict that references the niche and how user's numbers compare to benchmarks",
  "market_context": {
    "niche": "string — specific sub-vertical",
    "benchmark_growth_pct": number,
    "benchmark_cac": number,
    "benchmark_ltv_cac": number,
    "user_vs_benchmark": "1-2 sentences comparing user's numbers to typical for this niche",
    "competitor_landscape": "2-3 sentences on who dominates, who's disrupting, what moves are common"
  },
  "ltv_cac_ratio": number,
  "payback_months": number,
  "break_even_month": number | null,
  "projection": [{"month": 1, "revenue": number, "costs": number, "profit": number, "cumulative_profit": number, "note": "optional — competitor/seasonal event affecting this month"}],
  "risks": ["niche-specific risk referencing actual market dynamics"],
  "recommendations": ["tactical, niche-specific action"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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
