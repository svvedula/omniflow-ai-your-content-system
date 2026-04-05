import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an AI content editor for a creator content system. The user has already generated content (video ideas, hooks, scripts, captions, hashtags, branding) and now wants to modify specific parts.

You will receive the current content system and the user's edit request. You MUST respond by calling the "edit_content" tool.

RULES:
- Only modify what the user asks to change. Keep everything else exactly the same.
- If the user says "replace idea #3", only change that specific idea.
- If the user says "make hooks more aggressive", rewrite all hooks with a more aggressive tone.
- If the request is unclear, set "reply" to a clarifying question and return the content unchanged.
- Always explain what you changed in the "reply" field.
- Be creative and maintain the same quality level as the original content.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, currentContent, chatHistory } = await req.json();

    if (!message || !currentContent) {
      return new Response(
        JSON.stringify({ error: "Missing message or currentContent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contentSummary = JSON.stringify(currentContent, null, 2);

    const messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add chat history for context
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory.slice(-6)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({
      role: "user",
      content: `Here is the current content system:\n\n${contentSummary}\n\nUser request: ${message}`,
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "edit_content",
              description: "Return the edited content system and a reply explaining what changed",
              parameters: {
                type: "object",
                properties: {
                  reply: {
                    type: "string",
                    description: "A brief explanation of what was changed, or a clarifying question",
                  },
                  contentChanged: {
                    type: "boolean",
                    description: "Whether the content was actually modified",
                  },
                  ideas: { type: "array", items: { type: "string" } },
                  hooks: { type: "array", items: { type: "string" } },
                  scripts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { title: { type: "string" }, content: { type: "string" } },
                      required: ["title", "content"],
                    },
                  },
                  longFormScripts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { title: { type: "string" }, content: { type: "string" } },
                      required: ["title", "content"],
                    },
                  },
                  captions: { type: "array", items: { type: "string" } },
                  hashtags: { type: "array", items: { type: "string" } },
                  brandingNames: { type: "array", items: { type: "string" } },
                  brandingStyleDirection: { type: "string" },
                  logoConcept: { type: "string" },
                  bannerConcept: { type: "string" },
                },
                required: ["reply", "contentChanged"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "edit_content" } },
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

    const responseBody: { reply: string; updatedContent?: typeof currentContent } = {
      reply: result.reply,
    };

    if (result.contentChanged) {
      responseBody.updatedContent = {
        ...currentContent,
        ideas: result.ideas || currentContent.ideas,
        hooks: result.hooks || currentContent.hooks,
        scripts: result.scripts || currentContent.scripts,
        longFormScripts: result.longFormScripts || currentContent.longFormScripts,
        captions: result.captions || currentContent.captions,
        hashtags: result.hashtags || currentContent.hashtags,
        branding: {
          ...currentContent.branding,
          names: result.brandingNames || currentContent.branding?.names,
          styleDirection: result.brandingStyleDirection || currentContent.branding?.styleDirection,
          logoConcept: result.logoConcept || currentContent.branding?.logoConcept,
          bannerConcept: result.bannerConcept || currentContent.branding?.bannerConcept,
        },
      };
    }

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("edit-content error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
