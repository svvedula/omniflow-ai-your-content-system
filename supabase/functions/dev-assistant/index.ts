import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert senior software developer AI assistant. You help users with:

1. **Code Generation** — Write clean, production-ready code in any language or framework the user specifies.
2. **Code Review** — Analyze code for bugs, security issues, performance problems, and style improvements.
3. **Debugging** — Help diagnose and fix errors. Ask clarifying questions when needed.
4. **Documentation & Learning** — Explain concepts, APIs, and patterns clearly.

RULES:
- Always provide code in fenced code blocks with the language specified (e.g. \`\`\`typescript).
- When generating code, make it complete and runnable — no placeholders like "// TODO".
- When reviewing, be specific: point to exact lines/patterns and explain WHY something is an issue.
- When debugging, think step-by-step through the error.
- Keep explanations concise but thorough. Use bullet points for multiple issues.
- If the user provides code in the editor, reference it in your response.
- Suggest best practices and modern patterns.
- If the user's question is ambiguous, ask a clarifying question before guessing.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language, currentCode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Missing messages array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context-aware system message
    let systemContent = SYSTEM_PROMPT;
    if (language) {
      systemContent += `\n\nThe user is currently working in ${language}. Default to this language for code generation unless they specify otherwise.`;
    }
    if (currentCode && currentCode.trim() && !currentCode.startsWith("// Paste your code")) {
      systemContent += `\n\nThe user currently has this code in their editor:\n\`\`\`${language || ""}\n${currentCode}\n\`\`\`\nReference this code when relevant to the conversation.`;
    }

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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("dev-assistant error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
