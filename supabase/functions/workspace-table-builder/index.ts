import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { data } = await req.json();
    if (!data?.trim()) {
      return new Response(JSON.stringify({ error: "No data provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a data structuring AI. The user will paste messy, unstructured data. You must:
1. Detect what type of data it is
2. Identify logical columns
3. Clean and normalize every value
4. Return structured JSON

You MUST call the "structured_table" tool with the result.`,
          },
          { role: "user", content: `Clean and structure this data into a table:\n\n${data}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "structured_table",
              description: "Return cleaned, structured table data",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "A descriptive title for this table" },
                  columns: {
                    type: "array",
                    items: { type: "object", properties: { key: { type: "string" }, label: { type: "string" }, type: { type: "string", enum: ["text", "number", "date", "currency", "url", "email"] } }, required: ["key", "label", "type"] },
                  },
                  rows: { type: "array", items: { type: "object", additionalProperties: true } },
                  summary: { type: "string", description: "Brief summary of what was detected and cleaned" },
                },
                required: ["title", "columns", "rows", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "structured_table" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    console.error("table-builder error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
