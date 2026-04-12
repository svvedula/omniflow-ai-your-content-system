import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { notes, image } = await req.json();
    if (!notes?.trim() && !image) {
      return new Response(JSON.stringify({ error: "No notes provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userContent: any[] = [];
    if (notes?.trim()) userContent.push({ type: "text", text: notes });
    if (image) {
      if (!notes?.trim()) userContent.push({ type: "text", text: "Summarize and create a plan from the content in this image:" });
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
            content: `You are a planning AI. The user will paste chaotic, messy notes or provide an image. You must:
1. Summarize the key points clearly
2. Organize them into logical categories
3. Create an actionable step-by-step plan with timeline suggestions
4. Identify any gaps or missing information

Be concise but thorough. Call the "summarize_and_plan" tool.`,
          },
          { role: "user", content: userContent.length === 1 && userContent[0].type === "text" ? userContent[0].text : userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "summarize_and_plan",
              description: "Return organized summary and plan from messy notes",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "A title for this plan" },
                  summary: { type: "string", description: "Clear summary of the notes" },
                  categories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        points: { type: "array", items: { type: "string" } },
                      },
                      required: ["name", "points"],
                      additionalProperties: false,
                    },
                  },
                  plan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        step: { type: "number" },
                        action: { type: "string" },
                        timeline: { type: "string" },
                        details: { type: "string" },
                      },
                      required: ["step", "action"],
                      additionalProperties: false,
                    },
                  },
                  gaps: { type: "array", items: { type: "string" } },
                },
                required: ["title", "summary", "categories", "plan"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "summarize_and_plan" } },
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
    console.error("summarize-plan error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
