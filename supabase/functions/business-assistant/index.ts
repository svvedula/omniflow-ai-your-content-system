import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  planning: `You are an expert business strategist and startup advisor. Help users with:
- Business plan generation (executive summary, market analysis, revenue models)
- Product ideation and validation strategies
- Competitive analysis and positioning
- Financial projections and unit economics
- Pitch deck content and investor-ready narratives

Be actionable and specific. Use bullet points and structured formats. When generating plans, include concrete numbers and timelines where possible.`,

  marketing: `You are an expert digital marketer and growth strategist. Help users with:
- Marketing strategy (channels, budgets, timelines)
- Social media content calendars and campaigns
- SEO strategy and keyword research guidance
- Email marketing sequences and copy
- Ad copy and creative briefs
- Brand voice and messaging frameworks

Provide specific, ready-to-use content whenever possible. Include metrics to track and KPIs.`,

  projects: `You are an expert project manager and operations consultant. Help users with:
- Breaking down goals into actionable tasks and milestones
- Creating project timelines and roadmaps
- Resource planning and team structure
- Risk assessment and mitigation strategies
- Process optimization and workflow design
- OKRs and KPI frameworks

Be structured and practical. Use tables, checklists, and timelines in your responses.`,

  general: `You are an all-in-one business AI assistant. You help entrepreneurs and business owners with planning, marketing, project management, and strategic decision-making. Be concise, actionable, and data-driven in your responses.`,
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
