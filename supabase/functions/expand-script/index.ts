import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert YouTube scriptwriter and director. The user has a long-form video idea with a brief script. Your job is to MASSIVELY expand it into a full, production-ready document.

You MUST return a JSON object with these exact fields:
{
  "hook": "A compelling 15-30 second opening hook that grabs attention immediately. Write it word-for-word as the creator should say it.",
  "fullScript": "The complete, detailed script broken into clear sections. Include exact dialogue/narration the creator should say. Use [SECTION: Name] markers. Make it 800-1500 words minimum.",
  "stageDirections": "Detailed visual and production directions: camera angles, B-roll suggestions, graphics/text overlays to show, transitions, music mood changes, pacing notes. Format as a numbered list.",
  "notes": "Important production notes: recommended video length, best posting time, thumbnail suggestions, SEO title suggestions, description keywords, and any research sources the creator should reference."
}

RULES:
- The hook must be DIFFERENT from the script opening — it's the attention-grabber before the intro.
- The full script should read like a professional YouTube video — conversational but authoritative.
- Stage directions should be specific enough that a video editor could follow them.
- Notes should include actionable advice for maximizing the video's performance.
- Keep the creator's niche and audience in mind throughout.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, niche, audience, platform } = await req.json();

    if (!title || !content) {
      return new Response(
        JSON.stringify({ error: "Missing title or content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        max_tokens: 16000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Expand this long-form video idea into a full production-ready document.

Niche: ${niche || "general"}
Target Audience: ${audience || "general"}
Platform: ${platform || "YouTube"}

Video Title: ${title}
Current Brief Script:
${content}

Return a JSON object with: hook, fullScript, stageDirections, notes`,
          },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;

    if (!raw) throw new Error("No response from AI");

    // Robust JSON extraction
    let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in response");
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fix common issues: trailing commas, control chars
      cleaned = cleaned
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === "\n" || ch === "\t" ? ch : "");
      parsed = JSON.parse(cleaned);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("expand-script error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
