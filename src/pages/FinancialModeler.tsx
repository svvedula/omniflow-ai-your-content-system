import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Loader2, Save, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "@/hooks/use-toast";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import BankStatementAnalyzer from "@/components/business/BankStatementAnalyzer";

const COST = 2;

const FinancialModeler = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const { spend, hasEnough } = useCredits();
  const [form, setForm] = useState({
    businessName: "", model: "SaaS", monthlyRevenue: 5000, monthlyCosts: 3000,
    growthRate: 8, cac: 50, ltv: 600, runwayMonths: 12, notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const generate = async () => {
    if (!hasEnough(COST)) {
      toast({ title: "Not enough credits", description: `Modeling costs ${COST} credits.`, variant: "destructive" });
      return nav("/pricing");
    }
    const ok = await spend(COST, "financial_model", `Financial model: ${form.businessName || "untitled"}`);
    if (!ok) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-financial-model", { body: form });
      if (error) throw error;
      setResult(data?.result);
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate model", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!user || !result) return;
    await supabase.from("financial_models").insert({
      user_id: user.id,
      title: form.businessName || "Untitled Model",
      inputs: form,
      results: result,
    });
    toast({ title: "Saved", description: "Model saved to your workspace." });
  };

  return (
    <div className="h-[calc(100vh-3rem)] overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <Calculator className="h-5 w-5 text-amber-400" />
          <h1 className="text-2xl font-bold">Financial Modeler</h1>
          <span className="text-xs text-muted-foreground ml-2">{COST} credits / run</span>
        </div>

        <div className="rounded-xl border border-border/30 bg-secondary/20 p-4">
          <p className="text-sm text-foreground font-medium mb-1">What this does</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Plug in your real numbers — revenue, costs, growth, CAC, LTV, runway — and the modeler runs a 12-month projection,
            calculates LTV/CAC ratio, payback period, and break-even month, then surfaces the top risks and concrete recommendations
            tailored to your business model. Save any model to revisit later.
          </p>
        </div>

        <BankStatementAnalyzer
          onApplyToModel={(s) => setForm((p) => ({
            ...p,
            monthlyRevenue: s.monthlyRevenue || p.monthlyRevenue,
            monthlyCosts: s.monthlyCosts || p.monthlyCosts,
            growthRate: s.growthRate || p.growthRate,
            runwayMonths: s.runwayMonths || p.runwayMonths,
          }))}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <div><Label className="text-xs">Business name</Label><Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} className="bg-secondary/30" /></div>
          <div><Label className="text-xs">Model type</Label><Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="SaaS, e-commerce, services..." className="bg-secondary/30" /></div>
          <div><Label className="text-xs">Monthly revenue ($)</Label><Input type="number" value={form.monthlyRevenue} onChange={(e) => set("monthlyRevenue", Number(e.target.value))} className="bg-secondary/30" /></div>
          <div><Label className="text-xs">Monthly costs ($)</Label><Input type="number" value={form.monthlyCosts} onChange={(e) => set("monthlyCosts", Number(e.target.value))} className="bg-secondary/30" /></div>
          <div><Label className="text-xs">Growth rate (% / month)</Label><Input type="number" value={form.growthRate} onChange={(e) => set("growthRate", Number(e.target.value))} className="bg-secondary/30" /></div>
          <div><Label className="text-xs">Runway (months)</Label><Input type="number" value={form.runwayMonths} onChange={(e) => set("runwayMonths", Number(e.target.value))} className="bg-secondary/30" /></div>
          <div><Label className="text-xs">CAC ($)</Label><Input type="number" value={form.cac} onChange={(e) => set("cac", Number(e.target.value))} className="bg-secondary/30" /></div>
          <div><Label className="text-xs">LTV ($)</Label><Input type="number" value={form.ltv} onChange={(e) => set("ltv", Number(e.target.value))} className="bg-secondary/30" /></div>
          <div className="lg:col-span-2"><Label className="text-xs">Context / notes</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="bg-secondary/30 min-h-[60px]" /></div>
          <div className="lg:col-span-2 flex justify-end">
            <Button onClick={generate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              {loading ? "Modeling..." : `Generate Model · ${COST} cr`}
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{result.summary}</p>
              <Button size="sm" variant="outline" onClick={save} className="gap-1.5"><Save className="h-3 w-3" /> Save</Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="LTV / CAC" value={result.ltv_cac_ratio?.toFixed?.(2) ?? "—"} />
              <Stat label="Payback (mo)" value={result.payback_months?.toFixed?.(1) ?? "—"} />
              <Stat label="Break-even mo." value={result.break_even_month ?? "—"} />
              <Stat label="Months projected" value={result.projection?.length ?? 0} />
            </div>

            {result.projection?.length > 0 && (
              <div className="rounded-xl border border-border/30 bg-secondary/20 p-4">
                <h3 className="text-sm font-semibold mb-3">12-Month Projection</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={result.projection}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="costs" stroke="hsl(var(--destructive))" strokeWidth={2} />
                    <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {result.risks?.length > 0 && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Risks</h3>
                <ul className="text-xs space-y-1 list-disc pl-5 text-muted-foreground">
                  {result.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {result.recommendations?.length > 0 && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <h3 className="text-sm font-semibold mb-2">Recommendations</h3>
                <ul className="text-xs space-y-1 list-disc pl-5 text-muted-foreground">
                  {result.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: any }) => (
  <div className="rounded-lg border border-border/30 bg-secondary/30 p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-xl font-bold text-foreground mt-1">{value}</p>
  </div>
);

export default FinancialModeler;
