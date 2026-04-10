import { useState } from "react";
import { ChevronDown, ChevronUp, Expand, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyableBlock } from "@/components/OutputSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ExpandedScript {
  hook: string;
  fullScript: string;
  stageDirections: string;
  notes: string;
}

interface ExpandableScriptProps {
  index: number;
  title: string;
  content: string;
  niche: string;
  audience: string;
  platform: string;
}

export function ExpandableScript({ index, title, content, niche, audience, platform }: ExpandableScriptProps) {
  const [expanded, setExpanded] = useState<ExpandedScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);

  const handleExpand = async () => {
    if (expanded) {
      setShowExpanded(true);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("expand-script", {
        body: { title, content, niche, audience, platform },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setExpanded(data);
      setShowExpanded(true);
    } catch (err) {
      console.error("Expand script error:", err);
      toast({
        title: "Failed to expand script",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-mono uppercase tracking-wider text-primary mb-2">
        Long-Form {index + 1}: {title}
      </p>

      {!showExpanded ? (
        <>
          <CopyableBlock text={content} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExpand}
            disabled={loading}
            className="text-xs mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Expanding script...
              </>
            ) : (
              <>
                <Expand className="h-3.5 w-3.5 mr-1.5" />
                {expanded ? "View Full Script" : "Expand into Full Script"}
              </>
            )}
          </Button>
        </>
      ) : expanded ? (
        <div className="space-y-4 border border-primary/20 rounded-lg p-4 bg-primary/5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-primary">Full Production Script</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExpanded(false)}
              className="text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Summary
            </Button>
          </div>

          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              🎣 Opening Hook
            </p>
            <CopyableBlock text={expanded.hook} />
          </div>

          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              📝 Full Script
            </p>
            <CopyableBlock text={expanded.fullScript} />
          </div>

          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              🎬 Stage & Production Directions
            </p>
            <CopyableBlock text={expanded.stageDirections} />
          </div>

          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              📌 Production Notes & Tips
            </p>
            <CopyableBlock text={expanded.notes} />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExpanded(false)}
            className="text-xs w-full"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back to Summary
          </Button>
        </div>
      ) : null}
    </div>
  );
}
