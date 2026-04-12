import { useState } from "react";
import {
  LayoutGrid, Table2, ListChecks, FileText, BarChart3,
  Send, Loader2, Download, ArrowLeft, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Clock, User as UserIcon, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Tool = "table" | "actions" | "summarize" | "insights";

interface TableResult {
  title: string;
  columns: { key: string; label: string; type: string }[];
  rows: Record<string, string | number>[];
  summary: string;
}

interface ActionResult {
  summary: string;
  actions: { task: string; owner?: string; deadline?: string; priority: string; context?: string }[];
  decisions?: string[];
  blockers?: string[];
}

interface PlanResult {
  title: string;
  summary: string;
  categories: { name: string; points: string[] }[];
  plan: { step: number; action: string; timeline?: string; details?: string }[];
  gaps?: string[];
}

interface InsightResult {
  title: string;
  dataType: string;
  keyMetrics: { label: string; value: string; trend?: string }[];
  patterns?: string[];
  insights: { finding: string; impact: string; recommendation: string }[];
  suggestedActions: string[];
}

const TOOLS: { id: Tool; title: string; description: string; icon: typeof Table2; placeholder: string; color: string; bgColor: string; borderColor: string }[] = [
  { id: "table", title: "Smart Table Builder", description: "Paste messy data → structured table", icon: Table2, placeholder: "Paste your messy data here...\n\nExamples:\n- CSV data\n- Copied spreadsheet cells\n- Unformatted lists\n- Email with tabular info", color: "text-violet-400", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/20" },
  { id: "actions", title: "Text → Action Extractor", description: "Paste text → action items & deadlines", icon: ListChecks, placeholder: "Paste your email, message, or meeting notes here...\n\nThe AI will extract:\n- Action items\n- Deadlines\n- Priorities\n- Decisions & blockers", color: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/20" },
  { id: "summarize", title: "Mess → Summary → Plan", description: "Paste chaotic notes → organized plan", icon: FileText, placeholder: "Paste your chaotic notes here...\n\nThe AI will:\n- Summarize key points\n- Organize into categories\n- Create an action plan\n- Identify gaps", color: "text-teal-400", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/20" },
  { id: "insights", title: "Data Insight Generator", description: "Paste data → patterns & insights", icon: BarChart3, placeholder: "Paste your data here...\n\nExamples:\n- Sales numbers\n- Survey results\n- Website analytics\n- Any numerical data", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20" },
];

const EDGE_FN_MAP: Record<Tool, string> = {
  table: "workspace-table-builder",
  actions: "workspace-action-extractor",
  summarize: "workspace-summarize-plan",
  insights: "workspace-data-insights",
};

const BODY_KEY_MAP: Record<Tool, string> = {
  table: "data",
  actions: "text",
  summarize: "notes",
  insights: "data",
};

const Workspace = () => {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const currentTool = TOOLS.find((t) => t.id === activeTool);

  const handleProcess = async () => {
    if (!input.trim() || !activeTool || isLoading) return;
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(EDGE_FN_MAP[activeTool], {
        body: { [BODY_KEY_MAP[activeTool]]: input },
      });
      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = (tableData: TableResult) => {
    const header = tableData.columns.map((c) => c.label).join(",");
    const rows = tableData.rows.map((row) => tableData.columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableData.title.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported!", description: "CSV downloaded successfully" });
  };

  const handleBack = () => {
    setActiveTool(null);
    setInput("");
    setResult(null);
  };

  // Dashboard
  if (!activeTool) {
    return (
      <div className="h-[calc(100vh-3rem)] overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-mono">
              <LayoutGrid className="h-4 w-4" />
              Workspace
            </div>
            <h1 className="text-3xl font-bold text-foreground">AI-Powered Workspace Tools</h1>
            <p className="text-muted-foreground max-w-md mx-auto">Paste anything → get structured, actionable results instantly</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`group text-left p-6 rounded-xl border ${tool.borderColor} ${tool.bgColor} hover:scale-[1.02] transition-all duration-200`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2.5 rounded-lg ${tool.bgColor}`}>
                    <tool.icon className={`h-5 w-5 ${tool.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{tool.title}</h3>
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Tool view
  return (
    <div className="h-[calc(100vh-3rem)] overflow-auto flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/30 bg-secondary/20 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={handleBack} className="h-7 text-xs">
          <ArrowLeft className="h-3 w-3 mr-1" /> Back
        </Button>
        {currentTool && (
          <div className={`p-1.5 rounded-lg ${currentTool.bgColor}`}>
            {(() => { const Icon = currentTool.icon; return <Icon className={`h-4 w-4 ${currentTool.color}`} />; })()}
          </div>
        )}
        <span className="text-sm font-semibold text-foreground">{currentTool?.title}</span>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Input */}
          <div className="space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={currentTool?.placeholder}
              className="min-h-[160px] bg-secondary/30 border-border/30 text-sm font-mono"
            />
            <div className="flex justify-end">
              <Button onClick={handleProcess} disabled={!input.trim() || isLoading} className="gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isLoading ? "Processing..." : "Process"}
              </Button>
            </div>
          </div>

          {/* Results */}
          {result && activeTool === "table" && <TableResultView data={result} onExport={exportCSV} />}
          {result && activeTool === "actions" && <ActionResultView data={result} />}
          {result && activeTool === "summarize" && <PlanResultView data={result} />}
          {result && activeTool === "insights" && <InsightResultView data={result} />}
        </div>
      </div>
    </div>
  );
};

// ─── Result Components ────────────────────────────────────────

function TableResultView({ data, onExport }: { data: TableResult; onExport: (d: TableResult) => void }) {
  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{data.title}</h3>
          <p className="text-xs text-muted-foreground">{data.summary}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onExport(data)} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>
      <div className="rounded-lg border border-border/30 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30 bg-secondary/30">
              {data.columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b border-border/10 hover:bg-secondary/20 transition-colors">
                {data.columns.map((col) => (
                  <td key={col.key} className="px-3 py-2 text-foreground">{String(row[col.key] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground/50 font-mono">{data.rows.length} rows × {data.columns.length} columns</p>
    </div>
  );
}

function ActionResultView({ data }: { data: ActionResult }) {
  const priorityStyles: Record<string, string> = {
    high: "bg-red-500/10 text-red-400 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
        <p className="text-sm text-foreground font-medium">{data.summary}</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-rose-400" /> Action Items ({data.actions.length})
        </h3>
        {data.actions.map((action, i) => (
          <div key={i} className="p-3 rounded-lg border border-border/30 bg-secondary/10 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-foreground font-medium">{action.task}</p>
              <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${priorityStyles[action.priority]}`}>
                {action.priority}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {action.owner && <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{action.owner}</span>}
              {action.deadline && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{action.deadline}</span>}
            </div>
            {action.context && <p className="text-xs text-muted-foreground/70">{action.context}</p>}
          </div>
        ))}
      </div>

      {data.decisions && data.decisions.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">Key Decisions</h3>
          {data.decisions.map((d, i) => (
            <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span> {d}
            </p>
          ))}
        </div>
      )}

      {data.blockers && data.blockers.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Blockers
          </h3>
          {data.blockers.map((b, i) => (
            <p key={i} className="text-sm text-muted-foreground">{b}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanResultView({ data }: { data: PlanResult }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-lg font-semibold text-foreground">{data.title}</h3>
      <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
        <p className="text-sm text-foreground">{data.summary}</p>
      </div>

      {data.categories.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Organized Notes</h4>
          {data.categories.map((cat, i) => (
            <div key={i} className="p-3 rounded-lg border border-border/30 bg-secondary/10">
              <p className="text-sm font-medium text-teal-400 mb-1">{cat.name}</p>
              <ul className="space-y-1">
                {cat.points.map((pt, j) => (
                  <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-teal-400/60 mt-0.5">•</span> {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Action Plan</h4>
        {data.plan.map((step) => (
          <button
            key={step.step}
            onClick={() => setExpanded(expanded === step.step ? null : step.step)}
            className="w-full text-left p-3 rounded-lg border border-border/30 bg-secondary/10 hover:bg-secondary/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/10 text-teal-400 text-xs font-bold border border-teal-500/20">
                  {step.step}
                </span>
                <span className="text-sm font-medium text-foreground">{step.action}</span>
              </div>
              <div className="flex items-center gap-2">
                {step.timeline && <span className="text-[10px] text-muted-foreground font-mono">{step.timeline}</span>}
                {expanded === step.step ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
            </div>
            {expanded === step.step && step.details && (
              <p className="mt-2 text-sm text-muted-foreground pl-9">{step.details}</p>
            )}
          </button>
        ))}
      </div>

      {data.gaps && data.gaps.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Gaps Identified
          </h4>
          {data.gaps.map((g, i) => (
            <p key={i} className="text-sm text-muted-foreground">{g}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightResultView({ data }: { data: InsightResult }) {
  const trendIcon = (t?: string) => {
    if (t === "up") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
    if (t === "down") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const impactStyles: Record<string, string> = {
    high: "bg-red-500/10 text-red-400 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{data.title}</h3>
        <p className="text-xs text-muted-foreground font-mono uppercase">{data.dataType}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.keyMetrics.map((m, i) => (
          <div key={i} className="p-3 rounded-lg bg-secondary/30 border border-border/30 space-y-1">
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{m.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">{m.value}</span>
              {trendIcon(m.trend)}
            </div>
          </div>
        ))}
      </div>

      {data.patterns && data.patterns.length > 0 && (
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
          <h4 className="text-sm font-semibold text-foreground mb-2">Patterns Detected</h4>
          {data.patterns.map((p, i) => (
            <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <BarChart3 className="h-3.5 w-3.5 mt-0.5 text-amber-400 shrink-0" /> {p}
            </p>
          ))}
        </div>
      )}

      {/* Insights */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Key Insights</h4>
        {data.insights.map((insight, i) => (
          <div key={i} className="p-3 rounded-lg border border-border/30 bg-secondary/10 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-foreground font-medium">{insight.finding}</p>
              <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${impactStyles[insight.impact]}`}>
                {insight.impact}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">💡 {insight.recommendation}</p>
          </div>
        ))}
      </div>

      {/* Suggested Actions */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="text-sm font-semibold text-primary mb-2">Suggested Next Steps</h4>
        {data.suggestedActions.map((a, i) => (
          <p key={i} className="text-sm text-foreground flex items-start gap-2">
            <span className="text-primary font-bold">{i + 1}.</span> {a}
          </p>
        ))}
      </div>
    </div>
  );
}

export default Workspace;
