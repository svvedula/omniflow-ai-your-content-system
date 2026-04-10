import {
  Lightbulb, Zap, FileText, Hash, Palette, MessageSquare, BookOpen, Image,
} from "lucide-react";
import { OutputSection, CopyableBlock } from "@/components/OutputSection";
import { BrandingImageSection } from "@/components/output/BrandingImageSection";
import { ContentEditor } from "@/components/output/ContentEditor";
import { VideoPromptsSection } from "@/components/output/VideoPromptsSection";
import { ExpandableScript } from "@/components/output/ExpandableScript";
import { motion } from "framer-motion";
import type { ContentSystem } from "@/lib/types";

interface CreatorOutputProps {
  data: ContentSystem;
  onUpdateData: (data: ContentSystem) => void;
}

export function CreatorOutput({ data, onUpdateData }: CreatorOutputProps) {
  const handleBrandingUpdate = (updates: Partial<ContentSystem["branding"]>) => {
    onUpdateData({
      ...data,
      branding: { ...data.branding, ...updates },
    });
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
          <div className="space-y-6">
            {data.longFormScripts.map((script, i) => (
              <ExpandableScript
                key={i}
                index={i}
                title={script.title}
                content={script.content}
                niche={data.niche}
                audience={data.audience}
                platform={data.platform}
              />
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
          <BrandingImageSection
            type="logo"
            concept={data.branding.logoConcept}
            imageUrl={data.branding.logoUrl}
            brandName={data.branding.names[0] || data.niche}
            niche={data.niche}
            onUpdate={handleBrandingUpdate}
          />
          <BrandingImageSection
            type="banner"
            concept={data.branding.bannerConcept}
            imageUrl={data.branding.bannerUrl}
            brandName={data.branding.names[0] || data.niche}
            niche={data.niche}
            onUpdate={handleBrandingUpdate}
          />
        </div>
      </OutputSection>

      {/* Video Prompts */}
      <VideoPromptsSection data={data} onUpdateData={onUpdateData} />

      {/* AI Content Editor */}
      <ContentEditor data={data} onUpdateData={onUpdateData} />
    </motion.div>
  );
}
