import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { data, image } = await req.json();
    if (!data?.trim() && !image) {
      return new Response(JSON.stringify({ error: "No data provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userContent: any[] = [];
    if (data?.trim()) userContent.push({ type: "text", text: `Analyze this data and provide insights:\n\n${data}` });
    if (image) {
      if (!data?.trim()) userContent.push({ type: "text", text: "Analyze the data in this image and provide insights:" });
      userContent.push({ type: "image_url", image_url: { url: image } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a data analysis AI. The user will paste raw data (numbers, tables, lists, CSV-like content) or provide an image containing data. You must:
1. Identify patterns, trends, and anomalies
2. Calculate key metrics where possible
3. Provide actionable insights
4. Suggest next steps based on the data

Be specific with numbers. Don't be vague. Call the "data_insights" tool.`,
          },
          { role: "user", content: userContent.length === 1 && userContent[0].type === "text" ? userContent[0].text : userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "data_insights",
              description: "Return data analysis insights",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  dataType: { type: "string", description: "What kind of data this is" },
                  keyMetrics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        value: { type: "string" },
                        trend: { type: "string", enum: ["up", "down", "stable", "unknown"] },
                      },
                      required: ["label", "value"],
                      additionalProperties: false,
                    },
                  },
                  patterns: { type: "array", items: { type: "string" } },
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        finding: { type: "string" },
                        impact: { type: "string", enum: ["high", "medium", "low"] },
                        recommendation: { type: "string" },
                      },
                      required: ["finding", "impact", "recommendation"],
                      additionalProperties: false,
                    },
                  },
                  suggestedActions: { type: "array", items: { type: "string" } },
                },
                required: ["title", "dataType", "keyMetrics", "insights", "suggestedActions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "data_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return structured output");

    return new Response(toolCall.function.arguments, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("data-insights error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
