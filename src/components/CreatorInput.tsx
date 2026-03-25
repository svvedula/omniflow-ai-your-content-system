import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";

const platforms = ["TikTok", "YouTube", "Instagram", "Twitter/X", "LinkedIn"];

interface CreatorInputProps {
  onGenerate: (data: { niche: string; audience: string; platform: string }) => void;
  isLoading: boolean;
}

export function CreatorInput({ onGenerate, isLoading }: CreatorInputProps) {
  const [niche, setNiche] = useState("");
  const [audience, setAudience] = useState("");
  const [platform, setPlatform] = useState("");

  const canSubmit = niche.trim() && audience.trim() && platform;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono tracking-wider uppercase mb-4">
          <Sparkles className="h-3 w-3" />
          Creator Mode
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Build Your Content System
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Tell us about your content goals. We'll generate viral ideas, scripts, captions, and branding — everything you need to dominate your platform.
        </p>
      </div>

      <div className="glass rounded-xl p-6 space-y-5">
        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Content Niche
          </Label>
          <Input
            placeholder="e.g. Personal Finance, Fitness, Tech Reviews..."
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Target Audience
          </Label>
          <Input
            placeholder="e.g. Gen Z students, busy professionals, new parents..."
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Platform
          </Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="bg-background/50 border-border/50">
              <SelectValue placeholder="Choose your platform" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="glow"
          size="lg"
          className="w-full mt-2"
          disabled={!canSubmit || isLoading}
          onClick={() => onGenerate({ niche, audience, platform })}
        >
          {isLoading ? (
            <>
              <Sparkles className="h-4 w-4 animate-pulse-glow" />
              Generating Your System...
            </>
          ) : (
            <>
              Build My Content System
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
