import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a viral content strategist AI. Given a content niche, target audience, and platform, generate a complete content system.

You MUST respond by calling the "generate_content_system" tool. Do not respond with plain text.

Be creative, specific, and platform-aware. Hooks should be attention-grabbing opening lines. Scripts should be detailed with sections (HOOK, SETUP, CONTENT, CTA). Captions should be SEO-optimized for the specified platform. Hashtags should mix trending and niche-specific tags.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { niche, audience, platform } = await req.json();

    if (!niche || !audience || !platform) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: niche, audience, platform" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userPrompt = `Generate a complete content system for:
- Niche: ${niche}
- Target Audience: ${audience}
- Platform: ${platform}

Provide:
1. 10 viral video ideas (creative, specific titles)
2. 10 attention-grabbing hooks (opening lines)
3. 3 full video scripts with titles (each with HOOK, SETUP, CONTENT, CTA sections)
4. 3 SEO-optimized captions for ${platform}
5. 12 relevant hashtags (no # prefix)
6. Branding: 5 channel/brand name ideas + a style direction paragraph`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_content_system",
              description: "Generate a structured content system with ideas, hooks, scripts, captions, hashtags, and branding",
              parameters: {
                type: "object",
                properties: {
                  ideas: {
                    type: "array",
                    items: { type: "string" },
                    description: "10 viral video idea titles",
                  },
                  hooks: {
                    type: "array",
                    items: { type: "string" },
                    description: "10 attention-grabbing hook lines",
                  },
                  scripts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "string" },
                      },
                      required: ["title", "content"],
                    },
                    description: "3 full video scripts",
                  },
                  captions: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 SEO-optimized captions",
                  },
                  hashtags: {
                    type: "array",
                    items: { type: "string" },
                    description: "12 relevant hashtags without # prefix",
                  },
                  brandingNames: {
                    type: "array",
                    items: { type: "string" },
                    description: "5 brand/channel name suggestions",
                  },
                  brandingStyleDirection: {
                    type: "string",
                    description: "A paragraph describing the visual style direction",
                  },
                },
                required: ["ideas", "hooks", "scripts", "captions", "hashtags", "brandingNames", "brandingStyleDirection"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_content_system" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output");
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Normalize into our ContentSystem shape
    const contentSystem = {
      ideas: result.ideas || [],
      hooks: result.hooks || [],
      scripts: result.scripts || [],
      captions: result.captions || [],
      hashtags: result.hashtags || [],
      branding: {
        names: result.brandingNames || [],
        styleDirection: result.brandingStyleDirection || "",
      },
    };

    return new Response(JSON.stringify(contentSystem), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-content error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
