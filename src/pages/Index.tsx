import { useState } from "react";
import { CreatorInput } from "@/components/CreatorInput";
import { CreatorOutput } from "@/components/CreatorOutput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ContentSystem } from "@/lib/types";

const Index = () => {
  const [result, setResult] = useState<ContentSystem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async (data: { niche: string; audience: string; platform: string }) => {
    setIsLoading(true);

    try {
      const { data: responseData, error } = await supabase.functions.invoke("generate-content", {
        body: { niche: data.niche, audience: data.audience, platform: data.platform },
      });

      if (error) {
        throw new Error(error.message || "Failed to generate content");
      }

      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      const system: ContentSystem = {
        niche: data.niche,
        audience: data.audience,
        platform: data.platform,
        ideas: responseData.ideas || [],
        hooks: responseData.hooks || [],
        scripts: responseData.scripts || [],
        captions: responseData.captions || [],
        hashtags: responseData.hashtags || [],
        branding: responseData.branding || { names: [], styleDirection: "" },
      };

      setResult(system);
    } catch (err) {
      console.error("Generation error:", err);
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({
        title: "Generation Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10">
      {result ? (
        <div>
          <button
            onClick={() => setResult(null)}
            className="mb-6 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            ← New System
          </button>
          <CreatorOutput data={result} />
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
