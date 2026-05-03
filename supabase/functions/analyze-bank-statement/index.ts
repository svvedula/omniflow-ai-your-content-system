import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function extractJson(text: string): any | null {
  if (!text) return null;
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const f = cleaned.indexOf("{"), l = cleaned.lastIndexOf("}");
  if (f !== -1 && l > f) { try { return JSON.parse(cleaned.slice(f, l + 1)); } catch {} }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) throw new Error("Missing auth");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(auth);
    if (authErr || !user) throw new Error("Invalid auth");

    const { statementText, filename } = await req.json();
    if (!statementText || typeof statementText !== "string") {
      return new Response(JSON.stringify({ error: "statementText required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: rec, error: insErr } = await supabase.from("bank_statements").insert({
      user_id: user.id, filename: filename || "statement.txt", processing_status: "processing",
    }).select().single();
    if (insErr) throw insErr;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a financial analyst extracting transactions from bank statements. Return ONLY valid JSON:
{
  "transactions": [{"date":"YYYY-MM-DD","description":"...","amount":123.45,"type":"income"|"expense","category":"food|transport|utilities|payroll|software|marketing|rent|other","merchant":"..."}],
  "summary": {"total_income":0,"total_expenses":0,"net_cash_flow":0,"avg_monthly_burn":0,"runway_months":0,"top_categories":[{"name":"...","amount":0,"pct":0}]},
  "insights": [{"title":"...","description":"...","priority":"high"|"medium"|"low","potential_savings":0}],
  "modeler_suggestions": {"monthlyRevenue":0,"monthlyCosts":0,"growthRate":0,"runwayMonths":0}
}
modeler_suggestions should be derived from the data so user can plug into the financial model.`,
          },
          { role: "user", content: `Statement (${filename}):\n\n${statementText.slice(0, 60000)}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      await supabase.from("bank_statements").update({ processing_status: "error", analysis: { error: t } }).eq("id", rec.id);
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    const analysis = extractJson(aiJson.choices?.[0]?.message?.content ?? "") ?? {};

    await supabase.from("bank_statements").update({ processing_status: "completed", analysis }).eq("id", rec.id);

    return new Response(JSON.stringify({ success: true, analysis, id: rec.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
