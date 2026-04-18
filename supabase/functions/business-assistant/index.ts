import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TAILORING_PROTOCOL = `

CRITICAL TAILORING PROTOCOL — READ CAREFULLY:
Before producing any plan, strategy, content, or detailed recommendation, you MUST first interview the user to tailor the output to their specific situation.

Rules:
1. On the FIRST user message in a conversation, do NOT immediately deliver the full deliverable.
2. Instead, ask 2-4 short, high-leverage clarifying questions tailored to what they asked. Examples of good questions: target audience, budget, current stage (idea / pre-launch / launched / scaling), industry/niche, geography, timeline, biggest current bottleneck, preferred tone, available resources, monetization model.
3. Format the questions as a numbered list, each on its own line, so the user can answer inline. Keep each question one sentence. Add a brief one-line intro like: "Quick — to tailor this to you, a few questions:".
4. End by inviting the user to answer however much they want ("Answer what you can — skip anything that doesn't apply.").
5. ONLY after the user responds (even partially) should you produce the full deliverable, explicitly weaving their answers into the output.
6. If the user's first message ALREADY contains rich context (industry + audience + stage + goal), skip the interview and deliver immediately, but still acknowledge the context you used.
7. If the user explicitly says "skip questions", "just give it to me", "no questions", or similar — comply immediately and deliver based on reasonable assumptions, listing the assumptions at the top.
8. After the deliverable, you may ask 1-2 follow-up questions to refine further.

Never ask more than 4 questions in one turn. Never repeat a question they've already answered.`;

const SYSTEM_PROMPTS: Record<string, string> = {
  planning: `You are an expert business strategist and startup advisor. Help users with:
- Business plan generation (executive summary, market analysis, revenue models)
- Product ideation and validation strategies
- Competitive analysis and positioning
- Financial projections and unit economics
- Pitch deck content and investor-ready narratives

Be actionable and specific. Use bullet points and structured formats. When generating plans, include concrete numbers and timelines where possible.${TAILORING_PROTOCOL}`,

  marketing: `You are an expert digital marketer and growth strategist. Help users with:
- Marketing strategy (channels, budgets, timelines)
- Social media content calendars and campaigns
- SEO strategy and keyword research guidance
- Email marketing sequences and copy
- Ad copy and creative briefs
- Brand voice and messaging frameworks

Provide specific, ready-to-use content whenever possible. Include metrics to track and KPIs.${TAILORING_PROTOCOL}`,

  projects: `You are an expert project manager and operations consultant. Help users with:
- Breaking down goals into actionable tasks and milestones
- Creating project timelines and roadmaps
- Resource planning and team structure
- Risk assessment and mitigation strategies
- Process optimization and workflow design
- OKRs and KPI frameworks

Be structured and practical. Use tables, checklists, and timelines in your responses.${TAILORING_PROTOCOL}`,

  general: `You are an all-in-one business AI assistant. You help entrepreneurs and business owners with planning, marketing, project management, and strategic decision-making. Be concise, actionable, and data-driven in your responses.${TAILORING_PROTOCOL}`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, section } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Missing messages array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemContent = SYSTEM_PROMPTS[section] || SYSTEM_PROMPTS.general;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("business-assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
