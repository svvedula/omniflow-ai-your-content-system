import { useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "@/hooks/use-toast";

const COST = 2;

interface Props {
  onApplyToModel?: (s: { monthlyRevenue: number; monthlyCosts: number; growthRate: number; runwayMonths: number }) => void;
}

const BankStatementAnalyzer = ({ onApplyToModel }: Props) => {
  const { spend, hasEnough } = useCredits();
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "done" | "error">("idle");
  const [analysis, setAnalysis] = useState<any>(null);
  const [filename, setFilename] = useState("");

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      toast({ title: "Unsupported file", description: "Upload CSV or TXT (export from your bank). PDF coming soon.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    if (!hasEnough(COST)) {
      toast({ title: "Not enough credits", description: `Analysis costs ${COST} credits.`, variant: "destructive" });
      return;
    }

    setFilename(file.name);
    setStatus("uploading");
    try {
      const text = await file.text();
      const ok = await spend(COST, "bank_statement_analysis", `Analyzed ${file.name}`);
      if (!ok) { setStatus("idle"); return; }
      setStatus("analyzing");
      const { data, error } = await supabase.functions.invoke("analyze-bank-statement", {
        body: { statementText: text, filename: file.name },
      });
      if (error) throw error;
      setAnalysis(data?.analysis);
      setStatus("done");
      toast({ title: "Analysis complete", description: "Transactions extracted and insights ready." });
    } catch (err: any) {
      setStatus("error");
      toast({ title: "Failed", description: err.message || "Analysis failed", variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  const apply = () => {
    if (!analysis?.modeler_suggestions || !onApplyToModel) return;
    onApplyToModel(analysis.modeler_suggestions);
    toast({ title: "Applied", description: "Bank-derived numbers loaded into the modeler." });
  };

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-emerald-500/15 p-2"><FileText className="h-4 w-4 text-emerald-400" /></div>
        <div className="flex-1">
          <h3 className="text-sm font-bold flex items-center gap-2">
            Bank Statement Analyzer
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">{COST} cr</span>
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            Drop a CSV/TXT bank export. AI extracts transactions, categorizes spending, computes burn & runway,
            and auto-fills the modeler with your real numbers.
          </p>
        </div>
      </div>

      <div className="border-2 border-dashed border-emerald-500/30 rounded-lg p-4 text-center">
        <input type="file" accept=".csv,.txt" onChange={handle} disabled={status === "uploading" || status === "analyzing"} className="hidden" id="bs-upload" />
        <label htmlFor="bs-upload" className="cursor-pointer block">
          {status === "idle" && (<><Upload className="h-6 w-6 mx-auto text-emerald-400 mb-2" /><p className="text-xs font-medium">Click to upload statement</p><p className="text-[10px] text-muted-foreground">CSV or TXT · max 10MB</p></>)}
          {(status === "uploading" || status === "analyzing") && (<><Loader2 className="h-6 w-6 mx-auto text-emerald-400 animate-spin mb-2" /><p className="text-xs">{status === "uploading" ? "Reading file..." : "AI analyzing..."}</p><p className="text-[10px] text-muted-foreground">{filename}</p></>)}
          {status === "done" && (<><CheckCircle2 className="h-6 w-6 mx-auto text-emerald-400 mb-2" /><p className="text-xs">Done · upload another</p></>)}
          {status === "error" && (<><AlertCircle className="h-6 w-6 mx-auto text-destructive mb-2" /><p className="text-xs">Failed · retry</p></>)}
        </label>
      </div>

      {analysis?.summary && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Stat label="Income" value={`$${(analysis.summary.total_income || 0).toLocaleString()}`} icon={<TrendingUp className="h-3 w-3 text-emerald-400" />} />
            <Stat label="Expenses" value={`$${(analysis.summary.total_expenses || 0).toLocaleString()}`} icon={<TrendingDown className="h-3 w-3 text-destructive" />} />
            <Stat label="Net cash flow" value={`$${(analysis.summary.net_cash_flow || 0).toLocaleString()}`} />
            <Stat label="Runway (mo)" value={analysis.summary.runway_months?.toFixed?.(1) ?? "—"} />
          </div>

          {analysis.summary.top_categories?.length > 0 && (
            <div className="rounded-lg border border-border/30 bg-secondary/20 p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Top spend categories</p>
              <div className="space-y-1.5">
                {analysis.summary.top_categories.slice(0, 5).map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="capitalize w-24 truncate">{c.name}</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, c.pct || 0)}%` }} />
                    </div>
                    <span className="font-mono text-muted-foreground tabular-nums">${(c.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.insights?.length > 0 && (
            <div className="rounded-lg border border-border/30 bg-secondary/20 p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">AI Insights</p>
              <ul className="space-y-1.5">
                {analysis.insights.slice(0, 4).map((ins: any, i: number) => (
                  <li key={i} className="text-xs flex gap-2">
                    <span className={`mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 ${ins.priority === "high" ? "bg-destructive" : ins.priority === "medium" ? "bg-amber-400" : "bg-muted-foreground"}`} />
                    <div>
                      <span className="font-medium text-foreground">{ins.title}</span>{" "}
                      <span className="text-muted-foreground">{ins.description}</span>
                      {ins.potential_savings ? <span className="text-emerald-400 ml-1">· save ${ins.potential_savings.toLocaleString()}/mo</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.modeler_suggestions && onApplyToModel && (
            <Button onClick={apply} size="sm" className="w-full gap-2">
              <Sparkles className="h-3 w-3" /> Apply to financial model
            </Button>
          )}

          {analysis.transactions?.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View {analysis.transactions.length} transactions</summary>
              <div className="mt-2 max-h-64 overflow-auto rounded border border-border/30">
                <table className="w-full text-[11px]">
                  <thead className="bg-secondary/40 sticky top-0">
                    <tr><th className="text-left p-1.5">Date</th><th className="text-left p-1.5">Description</th><th className="text-left p-1.5">Cat</th><th className="text-right p-1.5">Amount</th></tr>
                  </thead>
                  <tbody>
                    {analysis.transactions.map((t: any, i: number) => (
                      <tr key={i} className="border-t border-border/20">
                        <td className="p-1.5 font-mono text-muted-foreground">{t.date}</td>
                        <td className="p-1.5 truncate max-w-[200px]">{t.description}</td>
                        <td className="p-1.5 text-muted-foreground capitalize">{t.category}</td>
                        <td className={`p-1.5 text-right font-mono ${t.type === "income" ? "text-emerald-400" : "text-destructive"}`}>
                          {t.type === "income" ? "+" : "-"}${Math.abs(t.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) => (
  <div className="rounded-lg border border-border/30 bg-secondary/30 p-2">
    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">{icon}{label}</p>
    <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
  </div>
);

export default BankStatementAnalyzer;
