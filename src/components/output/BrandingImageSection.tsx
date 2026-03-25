import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Pencil, Check, X } from "lucide-react";
import type { ContentSystem } from "@/lib/types";

interface BrandingImageSectionProps {
  type: "logo" | "banner";
  concept: string;
  imageUrl?: string;
  brandName: string;
  niche: string;
  onUpdate: (updates: Partial<ContentSystem["branding"]>) => void;
}

export function BrandingImageSection({ type, concept, imageUrl, brandName, niche, onUpdate }: BrandingImageSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedConcept, setEditedConcept] = useState(concept);

  const conceptKey = type === "logo" ? "logoConcept" : "bannerConcept";
  const urlKey = type === "logo" ? "logoUrl" : "bannerUrl";
  const label = type === "logo" ? "Logo" : "Banner";

  const handleSaveConcept = () => {
    onUpdate({ [conceptKey]: editedConcept });
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedConcept(concept);
    setEditing(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: responseData, error } = await supabase.functions.invoke("generate-logo", {
        body: { type, concept: editedConcept || concept, brandName, niche },
      });
      if (error) throw new Error(error.message);
      if (responseData?.error) throw new Error(responseData.error);
      onUpdate({ [urlKey]: responseData.imageUrl });
    } catch (err) {
      console.error(`${type} generation error:`, err);
      toast({
        title: `${label} Generation Failed`,
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    onUpdate({ [urlKey]: undefined });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="flex gap-2">
          {imageUrl && (
            <Button variant="outline" size="sm" onClick={handleRegenerate} className="text-xs">
              Regenerate
            </Button>
          )}
          {!imageUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs"
            >
              {generating ? "Generating..." : `Generate ${label}`}
            </Button>
          )}
        </div>
      </div>

      {/* Editable concept */}
      {!imageUrl && (
        <div className="mb-2">
          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={editedConcept}
                onChange={(e) => setEditedConcept(e.target.value)}
                className="text-sm min-h-[80px] bg-background/40 border-border/30"
                placeholder={`Describe what you want the ${type} to look like...`}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSaveConcept} className="text-xs">
                  <Check className="h-3 w-3 mr-1" /> Save
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-xs">
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="group/concept relative text-sm text-muted-foreground bg-background/40 rounded-lg p-3 border border-border/30 cursor-pointer hover:border-primary/20 transition-colors"
              onClick={() => setEditing(true)}
            >
              <span>Concept: {concept}</span>
              <Pencil className="absolute top-2 right-2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/concept:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      )}

      {imageUrl && (
        <div className={`rounded-lg overflow-hidden border border-border/30 bg-background/40 ${type === "logo" ? "p-4 flex justify-center" : "p-2"}`}>
          <img
            src={imageUrl}
            alt={`Generated ${type}`}
            className={type === "logo" ? "max-h-48 object-contain rounded-lg" : "w-full object-cover rounded-lg"}
          />
        </div>
      )}
    </div>
  );
}
