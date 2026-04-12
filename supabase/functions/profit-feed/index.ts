import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { niche } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const nicheContext = niche
      ? `The user is interested in: "${niche}". Tailor opportunities to this niche.`
      : `Generate high-potential general opportunities across diverse categories.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an elite business intelligence AI that scans markets, trends, news, and deals to find profitable opportunities. You analyze price discrepancies across platforms, trending products, breaking news that creates opportunities, and viable business ideas.

${nicheContext}

Generate 4-6 realistic, actionable, and current profit opportunities. Each must be specific with real platforms, real product categories, and realistic numbers. Avoid vague or generic suggestions. Think like a shrewd entrepreneur scanning the internet for money-making angles.

Focus on:
- Retail/online arbitrage (price gaps between platforms like Amazon, eBay, Walmart, AliExpress, StockX, GOAT)
- Trending products gaining momentum (TikTok trends, seasonal spikes, new releases)
- News-driven opportunities (policy changes, supply chain shifts, cultural events)
- Low-capital business ideas based on current market gaps

Be specific with numbers, platforms, and strategies. Every opportunity should feel immediately actionable.`,
          },
          {
            role: "user",
            content: `Scan the market right now. Find me the best profit opportunities available today. Be specific, realistic, and actionable.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_opportunities",
              description: "Return discovered profit opportunities",
              parameters: {
                type: "object",
                properties: {
                  opportunities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Compelling opportunity headline" },
                        category: {
                          type: "string",
                          enum: ["deal_arbitrage", "trending_product", "news_opportunity", "business_idea"],
                        },
                        sourceInsight: { type: "string", description: "What was found - the raw data/trend/event" },
                        whyProfitable: { type: "string", description: "Clear explanation of the money-making potential with numbers" },
                        actionPlan: {
                          type: "array",
                          items: { type: "string" },
                          description: "Step-by-step instructions",
                        },
                        monetizationStrategy: { type: "string", description: "Exactly how to make money from this" },
                        estimatedProfit: { type: "string", description: "Estimated profit range e.g. '$50-200 per unit'" },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        links: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              label: { type: "string" },
                              url: { type: "string" },
                            },
                            required: ["label", "url"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["title", "category", "sourceInsight", "whyProfitable", "actionPlan", "monetizationStrategy", "estimatedProfit", "difficulty", "links"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["opportunities"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_opportunities" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ opportunities: parsed.opportunities }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ opportunities: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("profit-feed error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
