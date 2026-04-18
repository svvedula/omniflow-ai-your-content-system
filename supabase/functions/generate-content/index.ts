import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a viral content strategist AI with deep knowledge of current events, trending topics, and cultural moments. Given a content niche, target audience, and platform, generate a complete content system.

You MUST respond by calling the "generate_content_system" tool. Do not respond with plain text.

Be creative, specific, and platform-aware.

TREND & RESEARCH RULES (CRITICAL):
- You MUST incorporate CURRENT trending topics, recent news, and viral moments relevant to the niche.
- Reference specific real-world events, controversies, breakthroughs, or cultural shifts from 2024-2026 that relate to the niche.
- For documentary-style content: suggest fascinating historical events, unsolved mysteries, lesser-known stories, and pivotal moments that would make compelling videos.
- Mix evergreen content ideas with timely, trend-driven ideas. At least 4 out of 10 ideas should reference specific real events or trends.
- Include trending angles like "What [recent event] means for [niche]" or "The untold story of [historical moment]".

BRAND NAME RULES (CRITICAL):
- Suggest names that are ORIGINAL, UNIQUE, and NOT already taken by existing brands, companies, or popular creators.
- Do NOT suggest names that match existing businesses, YouTube channels, Instagram accounts, or TikTok creators.
- Each name should be distinctive enough to be trademarkable. Combine unexpected words, use wordplay, neologisms, or creative portmanteaus.
- Before suggesting a name, mentally check: "Would I find an existing brand if I searched this?" If yes, don't suggest it.

SCRIPT RULES:
- Short-form scripts should be 60-90 seconds, punchy, fast-paced.
- If the platform is YouTube, ALSO generate 3 long-form video scripts (8-15 minutes) with detailed outlines including INTRO, multiple SECTIONS with talking points, EXAMPLES, and OUTRO with CTA.
- For non-YouTube platforms, still generate long-form scripts but label them as "Podcast/Long-form" adaptations.

Hooks should be attention-grabbing opening lines. Captions should be SEO-optimized for the specified platform. Hashtags should mix trending and niche-specific tags.`;

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

    const isYouTube = platform.toLowerCase().includes("youtube");

    const today = new Date();
    const currentDate = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const currentYear = today.getFullYear();
    const nextYear = currentYear + 1;

    const userPrompt = `TODAY'S DATE: ${currentDate} (Year ${currentYear})

Generate a complete content system for:
- Niche: ${niche}
- Target Audience: ${audience}
- Platform: ${platform}

CRITICAL TIMELINESS REQUIREMENT:
- The current year is ${currentYear}. DO NOT reference outdated years like 2024 or 2025 as if they are current — they are in the past.
- Anchor trending ideas in ${currentYear} and forward-looking ${nextYear} predictions.
- Reference recent events, news, and cultural moments from the last 6-12 months relative to ${currentDate}.
- If your training data is older, focus on evergreen angles + extrapolated ${currentYear} predictions rather than naming stale events.
- At least 4 ideas should reference real, current trends, ${currentYear} news, or historically relevant events that resonate today.

Provide:
1. 10 viral video ideas (creative, specific titles — mix trending/current event topics with evergreen ideas)
2. 10 attention-grabbing hooks (opening lines)
3. 3 SHORT-FORM video scripts with titles (each with HOOK, SETUP, CONTENT, CTA sections — 60-90 second format)
4. 3 LONG-FORM video scripts with titles (${isYouTube ? "YouTube format, 8-15 minutes each" : "Podcast/long-form adaptations"}) — each must have: INTRO (with hook), 3-5 detailed SECTIONS with talking points and examples, and OUTRO with CTA
5. 3 SEO-optimized captions for ${platform}
6. 12 relevant hashtags (no # prefix)
7. Branding: 5 COMPLETELY ORIGINAL channel/brand name ideas that are NOT already taken by any existing brand, creator, or company + a style direction paragraph
8. A brief logo concept description (what the logo should look like — colors, shapes, style)
9. A brief banner/thumbnail concept description (visual direction for channel art)`;

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
                    description: "3 short-form video scripts (60-90 seconds)",
                  },
                  longFormScripts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "string" },
                      },
                      required: ["title", "content"],
                    },
                    description: "3 long-form video scripts (8-15 minutes for YouTube, or podcast-style)",
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
                    description: "5 completely original, untaken brand/channel name suggestions",
                  },
                  brandingStyleDirection: {
                    type: "string",
                    description: "A paragraph describing the visual style direction",
                  },
                  logoConcept: {
                    type: "string",
                    description: "Brief description of what the logo should look like (colors, shapes, style)",
                  },
                  bannerConcept: {
                    type: "string",
                    description: "Brief description of what the channel banner/thumbnail style should look like",
                  },
                },
                required: ["ideas", "hooks", "scripts", "longFormScripts", "captions", "hashtags", "brandingNames", "brandingStyleDirection", "logoConcept", "bannerConcept"],
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

    const contentSystem = {
      ideas: result.ideas || [],
      hooks: result.hooks || [],
      scripts: result.scripts || [],
      longFormScripts: result.longFormScripts || [],
      captions: result.captions || [],
      hashtags: result.hashtags || [],
      branding: {
        names: result.brandingNames || [],
        styleDirection: result.brandingStyleDirection || "",
        logoConcept: result.logoConcept || "",
        bannerConcept: result.bannerConcept || "",
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
