import { useState, useEffect, useRef } from "react";
import {
  Scan, RefreshCw, TrendingUp, Newspaper, Lightbulb, ArrowRightLeft,
  ExternalLink, ChevronDown, ChevronUp, DollarSign, Loader2, Zap,
  Signal, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

type Opportunity = {
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

const OpportunityCard = ({ opp }: { opp: Opportunity }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[opp.category] || CATEGORY_META.business_idea;
  const Icon = meta.icon;

  return (
    <div className={`rounded-xl border ${meta.border} ${meta.bg} overflow-hidden transition-all duration-200 hover:scale-[1.01]`}>
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

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border/10"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? "Hide details" : "View action plan & strategy"}
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
        </div>
      )}
    </div>
  );
};

const ProfitFeed = ({ autoScan = false }: { autoScan?: boolean }) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [niche, setNiche] = useState("");
  const [hasScanned, setHasScanned] = useState(false);
  const didAutoScan = useRef(false);

  useEffect(() => {
    if (autoScan && !didAutoScan.current) {
      didAutoScan.current = true;
      scanMarket();
    }
  }, [autoScan]);

  const scanMarket = async () => {
    setIsScanning(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profit-feed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ niche: niche.trim() || null }),
        }
      );

      if (resp.status === 429) {
        toast({ title: "Rate Limited", description: "Too many requests. Please wait.", variant: "destructive" });
        return;
      }
      if (resp.status === 402) {
        toast({ title: "Credits Exhausted", description: "Please add funds.", variant: "destructive" });
        return;
      }
      if (!resp.ok) throw new Error("Scan failed");

      const data = await resp.json();
      setOpportunities(data.opportunities || []);
      setHasScanned(true);
      toast({ title: "Scan Complete", description: `Found ${data.opportunities?.length || 0} opportunities` });
    } catch (err) {
      console.error("Profit feed error:", err);
      toast({ title: "Error", description: "Failed to scan the market", variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero / CTA */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-secondary/20 to-emerald-500/5 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Signal className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Profit Feed</h2>
              <p className="text-xs text-muted-foreground">AI-powered market intelligence</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground max-w-md">
            Scan the internet for underpriced deals, trending products, breaking news opportunities, and actionable business ideas.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Optional: your niche (e.g. sneakers, electronics, vintage)"
              className="bg-secondary/30 border-border/30 text-sm h-10 sm:max-w-xs"
              onKeyDown={(e) => { if (e.key === "Enter") scanMarket(); }}
            />
            <Button
              onClick={scanMarket}
              disabled={isScanning}
              className="h-10 px-6 gap-2 font-semibold"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4" />
                  Scan the Market
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {isScanning && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Scan className="h-7 w-7 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Scanning the market...</p>
            <p className="text-xs text-muted-foreground mt-1">Analyzing deals, trends, and opportunities</p>
          </div>
        </div>
      )}

      {!isScanning && hasScanned && opportunities.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No opportunities found. Try a different niche or refresh.
        </div>
      )}

      {!isScanning && opportunities.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {opportunities.length} Opportunities Found
            </p>
            <Button variant="ghost" size="sm" onClick={scanMarket} className="h-7 text-xs gap-1.5 text-muted-foreground">
              <RefreshCw className="h-3 w-3" /> Refresh Feed
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {opportunities.map((opp, i) => (
              <OpportunityCard key={i} opp={opp} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitFeed;
