import {
  Lightbulb, Zap, FileText, Hash, Palette, MessageSquare, BookOpen, Image,
} from "lucide-react";
import { OutputSection, CopyableBlock } from "@/components/OutputSection";
import { motion } from "framer-motion";
import type { ContentSystem } from "@/lib/types";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface CreatorOutputProps {
  data: ContentSystem;
  onUpdateData: (data: ContentSystem) => void;
}

export function CreatorOutput({ data, onUpdateData }: CreatorOutputProps) {
  const [generatingLogo, setGeneratingLogo] = useState(false);
  const [generatingBanner, setGeneratingBanner] = useState(false);

  const handleGenerateImage = async (type: "logo" | "banner") => {
    const setter = type === "logo" ? setGeneratingLogo : setGeneratingBanner;
    setter(true);

    try {
      const brandName = data.branding.names[0] || data.niche;
      const concept = type === "logo" ? data.branding.logoConcept : data.branding.bannerConcept;

      const { data: responseData, error } = await supabase.functions.invoke("generate-logo", {
        body: { type, concept, brandName, niche: data.niche },
      });

      if (error) throw new Error(error.message);
      if (responseData?.error) throw new Error(responseData.error);

      const updated = {
        ...data,
        branding: {
          ...data.branding,
          [type === "logo" ? "logoUrl" : "bannerUrl"]: responseData.imageUrl,
        },
      };
      onUpdateData(updated);
    } catch (err) {
      console.error(`${type} generation error:`, err);
      toast({
        title: `${type === "logo" ? "Logo" : "Banner"} Generation Failed`,
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setter(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Your Content System is Ready
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {data.niche} • {data.platform} • {data.audience}
        </p>
      </div>

      {/* Video Ideas */}
      <OutputSection title="Viral Video Ideas" icon={<Lightbulb className="h-4 w-4" />} delay={0.1}>
        <div className="space-y-2">
          {data.ideas.map((idea, i) => (
            <div key={i} className="flex gap-3 items-start bg-background/40 rounded-lg p-3 border border-border/30">
              <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-md bg-primary/10 text-primary text-xs font-mono font-bold">
                {i + 1}
              </span>
              <p className="text-sm text-foreground/90">{idea}</p>
            </div>
          ))}
        </div>
      </OutputSection>

      {/* Hooks */}
      <OutputSection title="Attention-Grabbing Hooks" icon={<Zap className="h-4 w-4" />} delay={0.2}>
        <div className="space-y-2">
          {data.hooks.map((hook, i) => (
            <CopyableBlock key={i} text={hook} />
          ))}
        </div>
      </OutputSection>

      {/* Short-Form Scripts */}
      <OutputSection title="Short-Form Scripts" icon={<FileText className="h-4 w-4" />} delay={0.3}>
        <div className="space-y-4">
          {data.scripts.map((script, i) => (
            <div key={i}>
              <p className="text-xs font-mono uppercase tracking-wider text-primary mb-2">
                Script {i + 1}: {script.title}
              </p>
              <CopyableBlock text={script.content} />
            </div>
          ))}
        </div>
      </OutputSection>

      {/* Long-Form Scripts */}
      {data.longFormScripts.length > 0 && (
        <OutputSection title={`Long-Form ${data.platform === "YouTube" ? "YouTube" : ""} Scripts`} icon={<BookOpen className="h-4 w-4" />} delay={0.35}>
          <div className="space-y-4">
            {data.longFormScripts.map((script, i) => (
              <div key={i}>
                <p className="text-xs font-mono uppercase tracking-wider text-primary mb-2">
                  Long-Form {i + 1}: {script.title}
                </p>
                <CopyableBlock text={script.content} />
              </div>
            ))}
          </div>
        </OutputSection>
      )}

      {/* Captions */}
      <OutputSection title="SEO-Optimized Captions" icon={<MessageSquare className="h-4 w-4" />} delay={0.4}>
        <div className="space-y-2">
          {data.captions.map((caption, i) => (
            <CopyableBlock key={i} text={caption} />
          ))}
        </div>
      </OutputSection>

      {/* Hashtags */}
      <OutputSection title="Hashtags" icon={<Hash className="h-4 w-4" />} delay={0.45}>
        <div className="flex flex-wrap gap-2">
          {data.hashtags.map((tag, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono"
            >
              #{tag}
            </span>
          ))}
        </div>
      </OutputSection>

      {/* Branding */}
      <OutputSection title="Branding Suggestions" icon={<Palette className="h-4 w-4" />} delay={0.5}>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Name Ideas (Original & Untaken)</p>
            <div className="flex flex-wrap gap-2">
              {data.branding.names.map((name, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-secondary border border-border/50 text-sm font-medium text-foreground">
                  {name}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Style Direction</p>
            <p className="text-sm text-foreground/90 bg-background/40 rounded-lg p-4 border border-border/30">
              {data.branding.styleDirection}
            </p>
          </div>
        </div>
      </OutputSection>

      {/* Logo & Banner */}
      <OutputSection title="Logo & Banner" icon={<Image className="h-4 w-4" />} delay={0.55}>
        <div className="space-y-6">
          {/* Logo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Logo</p>
              {!data.branding.logoUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateImage("logo")}
                  disabled={generatingLogo}
                  className="text-xs"
                >
                  {generatingLogo ? "Generating..." : "Generate Logo"}
                </Button>
              )}
            </div>
            {data.branding.logoConcept && !data.branding.logoUrl && (
              <p className="text-sm text-muted-foreground bg-background/40 rounded-lg p-3 border border-border/30 mb-2">
                Concept: {data.branding.logoConcept}
              </p>
            )}
            {data.branding.logoUrl && (
              <div className="rounded-lg overflow-hidden border border-border/30 bg-background/40 p-4 flex justify-center">
                <img src={data.branding.logoUrl} alt="Generated logo" className="max-h-48 object-contain rounded-lg" />
              </div>
            )}
          </div>

          {/* Banner */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Banner</p>
              {!data.branding.bannerUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateImage("banner")}
                  disabled={generatingBanner}
                  className="text-xs"
                >
                  {generatingBanner ? "Generating..." : "Generate Banner"}
                </Button>
              )}
            </div>
            {data.branding.bannerConcept && !data.branding.bannerUrl && (
              <p className="text-sm text-muted-foreground bg-background/40 rounded-lg p-3 border border-border/30 mb-2">
                Concept: {data.branding.bannerConcept}
              </p>
            )}
            {data.branding.bannerUrl && (
              <div className="rounded-lg overflow-hidden border border-border/30 bg-background/40 p-2">
                <img src={data.branding.bannerUrl} alt="Generated banner" className="w-full object-cover rounded-lg" />
              </div>
            )}
          </div>
        </div>
      </OutputSection>
    </motion.div>
  );
}
