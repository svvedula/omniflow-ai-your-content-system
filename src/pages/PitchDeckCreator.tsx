import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Presentation, Loader2, Save, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "@/hooks/use-toast";

const COST = 3;

const PitchDeckCreator = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const { spend, hasEnough } = useCredits();
  const [form, setForm] = useState({
    company: "", oneLiner: "", problem: "", solution: "", market: "",
    businessModel: "", traction: "", team: "", ask: "",
  });
  const [loading, setLoading] = useState(false);
  const [deck, setDeck] = useState<any>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const generate = async () => {
    if (!form.company.trim()) {
      toast({ title: "Company name required", variant: "destructive" });
      return;
    }
    if (!hasEnough(COST)) {
      toast({ title: "Not enough credits", variant: "destructive" });
      return nav("/pricing");
    }
    const ok = await spend(COST, "pitch_deck", `Pitch deck: ${form.company}`);
    if (!ok) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-pitch-deck", { body: form });
      if (error) throw error;
      setDeck(data?.result);
    } catch (e) {
      toast({ title: "Failed to generate deck", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!user || !deck) return;
    await supabase.from("pitch_decks").insert({
      user_id: user.id, title: deck.title || form.company || "Untitled Deck", inputs: form, slides: deck.slides,
    });
    toast({ title: "Saved", description: "Deck saved." });
  };

  const exportMd = () => {
    if (!deck) return;
    const md = [`# ${deck.title}\n`, ...deck.slides.map((s: any) =>
      `## Slide ${s.number}: ${s.title}\n\n**${s.headline}**\n\n${s.bullets?.map((b: string) => `- ${b}`).join("\n") || ""}\n\n_Speaker notes:_ ${s.speaker_notes || ""}\n`
    )].join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(deck.title || "deck").replace(/\s+/g, "-")}.md`;
    a.click();
  };

  return (
    <div className="h-[calc(100vh-3rem)] overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <Presentation className="h-5 w-5 text-violet-400" />
          <h1 className="text-2xl font-bold">Pitch Deck Creator</h1>
          <span className="text-xs text-muted-foreground ml-2">{COST} credits / deck</span>
        </div>

        <div className="rounded-xl border border-border/30 bg-secondary/20 p-4">
          <p className="text-sm text-foreground font-medium mb-1">What this does</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Drop in the basics about your company — problem, solution, market, traction, ask — and the AI builds a structured
            10-slide investor deck with headlines, bullets, and speaker notes for each slide. Save it to your workspace or
            export the whole thing as Markdown to drop into Google Slides, Notion, or Keynote.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
          {[
            ["company", "Company *"], ["oneLiner", "One-liner"], ["problem", "Problem"],
            ["solution", "Solution"], ["market", "Market size & opportunity"],
            ["businessModel", "Business model"], ["traction", "Traction / metrics"],
            ["team", "Team"], ["ask", "The ask (raise / partnership)"],
          ].map(([k, label]) => (
            <div key={k} className={k === "company" || k === "oneLiner" ? "" : "md:col-span-2"}>
              <Label className="text-xs">{label}</Label>
              {k === "company" || k === "oneLiner" ? (
                <Input value={(form as any)[k]} onChange={(e) => set(k, e.target.value)} className="bg-secondary/30" />
              ) : (
                <Textarea value={(form as any)[k]} onChange={(e) => set(k, e.target.value)} className="bg-secondary/30 min-h-[60px]" />
              )}
            </div>
          ))}
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={generate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Building deck..." : `Generate Deck · ${COST} cr`}
            </Button>
          </div>
        </div>

        {deck && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{deck.title}</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={save} className="gap-1.5"><Save className="h-3 w-3" /> Save</Button>
                <Button size="sm" variant="outline" onClick={exportMd} className="gap-1.5"><Download className="h-3 w-3" /> Export .md</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deck.slides?.map((s: any) => (
                <div key={s.number} className="rounded-xl border border-border/30 bg-gradient-to-br from-secondary/40 to-secondary/10 p-5 aspect-[4/3] flex flex-col">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400 mb-2">Slide {s.number} · {s.title}</div>
                  <h3 className="text-lg font-bold text-foreground mb-3 leading-tight">{s.headline}</h3>
                  <ul className="text-xs text-muted-foreground space-y-1 flex-1 list-disc pl-4">
                    {s.bullets?.map((b: string, i: number) => <li key={i}>{b}</li>)}
                  </ul>
                  {s.speaker_notes && <p className="text-[10px] text-muted-foreground/70 italic mt-3 border-t border-border/30 pt-2">💬 {s.speaker_notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PitchDeckCreator;
