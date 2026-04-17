import { useState, useRef, useEffect } from "react";
import {
  TrendingUp, Newspaper, Lightbulb, ArrowRightLeft, ExternalLink,
  ChevronDown, ChevronUp, DollarSign, Zap, Star, Bot, Send, Loader2, Sparkles, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

export type Opportunity = {
  title: string;
  category: "deal_arbitrage" | "trending_product" | "news_opportunity" | "business_idea";
  sourceInsight: string;
  whyProfitable: string;
  actionPlan: string[];
  monetizationStrategy: string;
  estimatedProfit: string;
  difficulty: "easy" | "medium" | "hard";
  links: { label: string; url: string }[];
};

const CATEGORY_META: Record<
  Opportunity["category"],
  { label: string; icon: typeof TrendingUp; color: string; bg: string; border: string }
> = {
  deal_arbitrage: { label: "Deal / Arbitrage", icon: ArrowRightLeft, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  trending_product: { label: "Trending Product", icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  news_opportunity: { label: "News-Based Opportunity", icon: Newspaper, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  business_idea: { label: "Business Idea", icon: Lightbulb, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  hard: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

type CoachMessage = { role: "user" | "assistant"; content: string };

export const OpportunityCard = ({ opp }: { opp: Opportunity }) => {
  const [expanded, setExpanded] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [coachInput, setCoachInput] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { spend, hasEnough } = useCredits();
  const navigate = useNavigate();

  const meta = CATEGORY_META[opp.category] || CATEGORY_META.business_idea;
  const Icon = meta.icon;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [coachMessages]);

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (unlocked) {
      setExpanded(true);
      return;
    }
    if (!hasEnough(1)) {
      toast({ title: "Not enough credits", description: "Viewing details costs 1 credit.", variant: "destructive" });
      navigate("/pricing");
      return;
    }
    const ok = await spend(1, "opportunity_view", `Viewed action plan: ${opp.title}`);
    if (ok) {
      setUnlocked(true);
      setExpanded(true);
    }
  };

  const handleCoachSend = async (text?: string) => {
    const msgText = (text || coachInput).trim();
    if (!msgText || coachLoading) return;

    if (!hasEnough(0.3)) {
      toast({ title: "Not enough credits", description: "Each coach message costs 0.3 credits.", variant: "destructive" });
      navigate("/pricing");
      return;
    }
    const ok = await spend(0.3, "opportunity_coach", `Coach msg: ${opp.title}`);
    if (!ok) return;

    const userMsg: CoachMessage = { role: "user", content: msgText };
    const allMessages = [...coachMessages, userMsg];
    setCoachMessages(allMessages);
    setCoachInput("");
    setCoachLoading(true);

    let assistantSoFar = "";
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/opportunity-coach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ opportunity: opp, messages: allMessages }),
        }
      );

      if (resp.status === 429) {
        toast({ title: "Rate Limited", description: "Try again shortly.", variant: "destructive" });
        return;
      }
      if (resp.status === 402) {
        toast({ title: "AI Credits Exhausted", variant: "destructive" });
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Coach failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(j);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) {
              assistantSoFar += c;
              setCoachMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (err) {
      console.error("Coach error:", err);
      toast({ title: "Error", description: "Coach failed", variant: "destructive" });
    } finally {
      setCoachLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border ${meta.border} ${meta.bg} overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2 rounded-lg ${meta.bg} shrink-0 mt-0.5`}>
              <Icon className={`h-4 w-4 ${meta.color}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm leading-tight">{opp.title}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.border} ${meta.color}`}>
                  {meta.label}
                </span>
                <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[opp.difficulty]}`}>
                  {opp.difficulty}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 whitespace-nowrap">{opp.estimatedProfit}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{opp.sourceInsight}</p>

        <div className="bg-secondary/30 rounded-lg p-3 border border-border/20">
          <p className="text-xs font-medium text-foreground/90 flex items-start gap-2">
            <Star className="h-3 w-3 mt-0.5 shrink-0 text-amber-400" />
            {opp.whyProfitable}
          </p>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={handleExpand}
        className="w-full px-4 py-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border/10"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded
          ? "Hide details"
          : unlocked
          ? "View action plan & strategy"
          : "View action plan & strategy · 1 credit"}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Action Plan */}
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Action Plan</h4>
            <ol className="space-y-1.5">
              {opp.actionPlan.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <span className={`shrink-0 w-5 h-5 rounded-full ${meta.bg} border ${meta.border} flex items-center justify-center text-[10px] font-bold ${meta.color}`}>
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Monetization */}
          <div className="bg-secondary/20 rounded-lg p-3 border border-border/10">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <Zap className="h-3 w-3" /> Monetization Strategy
            </h4>
            <p className="text-xs text-foreground/80">{opp.monetizationStrategy}</p>
          </div>

          {/* Links */}
          {opp.links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {opp.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border ${meta.border} ${meta.color} hover:bg-secondary/30 transition-colors`}
                >
                  <ExternalLink className="h-3 w-3" />
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {/* AI Coach */}
          <div className="border-t border-border/10 pt-4 space-y-3">
            <button
              onClick={() => {
                setCoachOpen(!coachOpen);
                if (!coachOpen && coachMessages.length === 0) {
                  handleCoachSend("Walk me through how to start this opportunity step by step.");
                }
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${meta.border} ${meta.bg} hover:scale-[1.01] transition-all`}
            >
              <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Sparkles className={`h-3.5 w-3.5 ${meta.color}`} />
                Ask AI Coach to walk me through this
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Free · 0.3 cr / msg
              </span>
            </button>

            {coachOpen && (
              <div className="rounded-lg border border-border/20 bg-background/40 overflow-hidden">
                <div className="max-h-72 overflow-auto p-3 space-y-3">
                  {coachMessages.length === 0 && !coachLoading && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Ask the coach anything about executing this opportunity.
                    </p>
                  )}
                  {coachMessages.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                      {m.role === "assistant" && (
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${meta.bg} border ${meta.border} mt-0.5`}>
                          <Bot className={`h-3 w-3 ${meta.color}`} />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/50 border border-border/20 text-foreground"
                      }`}>
                        {m.role === "assistant" ? (
                          <div className="prose prose-xs prose-invert max-w-none [&_p]:my-1 [&_ol]:my-1 [&_ul]:my-1">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        ) : (
                          m.content
                        )}
                      </div>
                      {m.role === "user" && (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary/50 border border-border/20 mt-0.5">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {coachLoading && coachMessages[coachMessages.length - 1]?.role !== "assistant" && (
                    <div className="flex gap-2">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${meta.bg} border ${meta.border}`}>
                        <Bot className={`h-3 w-3 ${meta.color}`} />
                      </div>
                      <div className="bg-secondary/50 border border-border/20 rounded-lg px-3 py-2">
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="border-t border-border/20 p-2 flex gap-2">
                  <Textarea
                    value={coachInput}
                    onChange={(e) => setCoachInput(e.target.value)}
                    placeholder="Ask a follow-up..."
                    className="min-h-[36px] max-h-24 resize-none bg-secondary/30 border-border/30 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCoachSend(); }
                    }}
                  />
                  <Button
                    onClick={() => handleCoachSend()}
                    disabled={!coachInput.trim() || coachLoading}
                    size="icon"
                    className="h-9 w-9 shrink-0"
                  >
                    {coachLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
