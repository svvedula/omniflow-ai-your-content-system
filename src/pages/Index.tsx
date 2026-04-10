import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CreatorInput } from "@/components/CreatorInput";
import { CreatorOutput } from "@/components/CreatorOutput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSession } from "@/hooks/useSession";
import type { ContentSystem } from "@/lib/types";

const Index = () => {
  const [result, setResult] = useState<ContentSystem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { createSession, saveMessage, loadSession } = useSession();

  // Load session from URL param on mount
  useEffect(() => {
    const sid = searchParams.get("session");
    if (sid && user) {
      loadSession(sid).then(({ session, messages }) => {
        if (!session || session.mode !== "creator") return;
        // Find the assistant message which contains the generated content
        const assistantMsg = messages.find((m) => m.role === "assistant");
        if (assistantMsg) {
          try {
            const parsed = JSON.parse(assistantMsg.content);
            setResult(parsed as ContentSystem);
            setSessionId(sid);
          } catch {
            console.error("Failed to parse saved creator session");
          }
        }
      });
    }
  }, [searchParams, user]);

  const handleGenerate = async (data: { niche: string; audience: string; platform: string }) => {
    setIsLoading(true);

    try {
      const { data: responseData, error } = await supabase.functions.invoke("generate-content", {
        body: { niche: data.niche, audience: data.audience, platform: data.platform },
      });

      if (error) throw new Error(error.message || "Failed to generate content");
      if (responseData?.error) throw new Error(responseData.error);

      const system: ContentSystem = {
        niche: data.niche,
        audience: data.audience,
        platform: data.platform,
        ideas: responseData.ideas || [],
        hooks: responseData.hooks || [],
        scripts: responseData.scripts || [],
        longFormScripts: responseData.longFormScripts || [],
        captions: responseData.captions || [],
        hashtags: responseData.hashtags || [],
        branding: {
          names: responseData.branding?.names || [],
          styleDirection: responseData.branding?.styleDirection || "",
          logoConcept: responseData.branding?.logoConcept || "",
          bannerConcept: responseData.branding?.bannerConcept || "",
        },
      };

      setResult(system);

      // Save to database if user is authenticated
      if (user) {
        const title = `${data.niche} — ${data.platform}`;
        const sid = await createSession("creator", title);
        if (sid) {
          setSessionId(sid);
          // Save the input as user message
          await saveMessage(sid, "user", JSON.stringify(data));
          // Save the output as assistant message
          await saveMessage(sid, "assistant", JSON.stringify(system));
          setSearchParams({ session: sid }, { replace: true });
        }
      }
    } catch (err) {
      console.error("Generation error:", err);
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Generation Failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateData = async (updated: ContentSystem) => {
    setResult(updated);
    // Persist update
    if (user && sessionId) {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("session_id", sessionId)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(1);
      if (msgs && msgs[0]) {
        await supabase
          .from("chat_messages")
          .update({ content: JSON.stringify(updated) })
          .eq("id", msgs[0].id);
      }
    }
  };

  return (
    <div className="p-6 md:p-10">
      {result ? (
        <div>
          <button
            onClick={() => {
              setResult(null);
              setSessionId(null);
              setSearchParams({}, { replace: true });
            }}
            className="mb-6 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            ← New System
          </button>
          <CreatorOutput data={result} onUpdateData={handleUpdateData} />
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
          <CreatorInput onGenerate={handleGenerate} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
};

export default Index;
