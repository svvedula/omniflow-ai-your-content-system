import { useState } from "react";
import { Video, Wand2, ExternalLink } from "lucide-react";
import { OutputSection, CopyableBlock } from "@/components/OutputSection";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ContentSystem } from "@/lib/types";

interface VideoPromptsSectionProps {
  data: ContentSystem;
  onUpdateData: (data: ContentSystem) => void;
}

export function VideoPromptsSection({ data, onUpdateData }: VideoPromptsSectionProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: responseData, error } = await supabase.functions.invoke("generate-video-prompts", {
        body: {
          niche: data.niche,
          audience: data.audience,
          platform: data.platform,
          ideas: data.ideas.slice(0, 3),
        },
      });
      if (error) throw new Error(error.message);
      if (responseData?.error) throw new Error(responseData.error);

      onUpdateData({
        ...data,
        videoPrompts: responseData.prompts || [],
      });
    } catch (err) {
      console.error("Video prompt generation error:", err);
      toast({
        title: "Video Prompt Generation Failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <OutputSection title="AI Video Creation Prompts" icon={<Video className="h-4 w-4" />} delay={0.6}>
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Generate highly detailed prompts you can use with YouTube's Dream Screen, InVideo AI, or other AI video tools.
        </p>

        {(!data.videoPrompts || data.videoPrompts.length === 0) ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs"
          >
            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            {generating ? "Generating prompts..." : "Generate Video Prompts"}
          </Button>
        ) : (
          <div className="space-y-4">
            {data.videoPrompts.map((prompt, i) => (
              <div key={i}>
                <p className="text-xs font-mono uppercase tracking-wider text-primary mb-2">
                  {prompt.title}
                </p>
                <CopyableBlock text={prompt.prompt} />
                {prompt.tool && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Best for: <span className="text-foreground/80">{prompt.tool}</span>
                  </p>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs"
            >
              {generating ? "Regenerating..." : "Regenerate Prompts"}
            </Button>
          </div>
        )}

        <div className="border-t border-border/30 pt-3 mt-3">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Recommended AI Video Tools</p>
          <div className="flex flex-wrap gap-2">
            <a href="https://www.youtube.com/dream_screen" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary border border-border/50 text-xs font-medium text-foreground hover:border-primary/30 transition-colors">
              YouTube Dream Screen <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://invideo.io" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary border border-border/50 text-xs font-medium text-foreground hover:border-primary/30 transition-colors">
              InVideo AI <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://runwayml.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary border border-border/50 text-xs font-medium text-foreground hover:border-primary/30 transition-colors">
              Runway <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </OutputSection>
  );
}
