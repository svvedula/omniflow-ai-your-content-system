import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Plus, RefreshCw, Loader2, Trash2, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const COST = 1;

interface Target {
  id: string;
  url: string;
  label: string | null;
  last_snapshot: string | null;
  last_checked_at: string | null;
  last_change_summary: string | null;
}

const Watchtower = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const { spend, hasEnough } = useCredits();
  const [targets, setTargets] = useState<Target[]>([]);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, any>>({});

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("watchtower_targets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTargets((data as Target[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user || !url.trim()) return;
    const { data } = await supabase.from("watchtower_targets").insert({ user_id: user.id, url: url.trim(), label: label.trim() || null }).select().single();
    if (data) setTargets((p) => [data as Target, ...p]);
    setUrl(""); setLabel("");
  };

  const remove = async (id: string) => {
    setTargets((p) => p.filter((t) => t.id !== id));
    await supabase.from("watchtower_targets").delete().eq("id", id);
  };

  const scan = async (t: Target) => {
    if (!hasEnough(COST)) {
      toast({ title: "Not enough credits", variant: "destructive" });
      return nav("/pricing");
    }
    const ok = await spend(COST, "watchtower_scan", `Watchtower: ${t.label || t.url}`);
    if (!ok) return;
    setScanningId(t.id);
    try {
      const { data, error } = await supabase.functions.invoke("business-watchtower-scan", {
        body: { url: t.url, lastSnapshot: t.last_snapshot },
      });
      if (error) throw error;
      const a = data?.analysis;
      const snap = data?.snapshot;
      setAnalysis((p) => ({ ...p, [t.id]: a }));
      await supabase.from("watchtower_targets").update({
        last_snapshot: snap,
        last_checked_at: new Date().toISOString(),
        last_change_summary: a?.changes_since_last?.join("; ") || null,
      }).eq("id", t.id);
      
      load();
      toast({ title: "Scan complete", description: a?.headline || "Done." });
    } catch (e) {
      toast({ title: "Scan failed", variant: "destructive" });
    } finally {
      setScanningId(null);
    }
  };

  return (
    <div className="h-[calc(100vh-3rem)] overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <Eye className="h-5 w-5 text-rose-400" />
          <h1 className="text-2xl font-bold">Competitive Watchtower</h1>
          <span className="text-xs text-muted-foreground ml-2">{COST} credit / scan</span>
        </div>

        <div className="rounded-xl border border-border/30 bg-secondary/20 p-4">
          <p className="text-sm text-foreground font-medium mb-1">What this does</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Track your competitors' pricing, feature, and landing pages. Each scan snapshots the page, then on every re-scan we
            diff it against the last snapshot and use AI to summarize what changed, rate the threat level, and recommend a
            counter-move — so you never get blindsided by a launch or pricing shift.
          </p>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
          <p className="text-xs text-muted-foreground">Add competitor pages (pricing, features, blog). Scan anytime to detect changes vs. last snapshot.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://competitor.com/pricing" className="bg-secondary/30 flex-1" />
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className="bg-secondary/30 sm:max-w-[180px]" />
            <Button onClick={add} disabled={!url.trim()} className="gap-1.5"><Plus className="h-4 w-4" /> Add</Button>
          </div>
        </div>

        <div className="space-y-3">
          {targets.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No targets yet. Add a competitor URL above.</p>}
          {targets.map((t) => {
            const a = analysis[t.id];
            return (
              <div key={t.id} className="rounded-xl border border-border/30 bg-secondary/20 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a href={t.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-foreground truncate hover:text-primary flex items-center gap-1">
                        {t.label || t.url} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">
                      {t.last_checked_at ? `Checked ${formatDistanceToNow(new Date(t.last_checked_at))} ago` : "Never checked"}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => scan(t)} disabled={scanningId === t.id} className="gap-1.5">
                    {scanningId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Scan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>

                {(a || t.last_change_summary) && (
                  <div className="border-t border-border/30 pt-3 space-y-2">
                    {a?.headline && <p className="text-sm text-foreground">{a.headline}</p>}
                    {a?.threat_level && (
                      <span className={`inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                        a.threat_level === "high" ? "bg-destructive/20 text-destructive" :
                        a.threat_level === "medium" ? "bg-amber-500/20 text-amber-400" :
                        "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {a.threat_level} threat
                      </span>
                    )}
                    {a?.changes_since_last?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Changes</p>
                        <ul className="text-xs list-disc pl-5 mt-1 text-muted-foreground">{a.changes_since_last.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
                      </div>
                    )}
                    {a?.recommended_action && <p className="text-xs text-foreground italic">→ {a.recommended_action}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Watchtower;
