import { useState, useEffect, useRef } from "react";
import { Scan, RefreshCw, Loader2, Signal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import { useNavigate } from "react-router-dom";
import { OpportunityCard, type Opportunity } from "./OpportunityCard";

const SCAN_COST = 2;

const ProfitFeed = ({ autoScan = false }: { autoScan?: boolean }) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [niche, setNiche] = useState("");
  const [hasScanned, setHasScanned] = useState(false);
  const didAutoScan = useRef(false);
  const { spend, hasEnough } = useCredits();
  const navigate = useNavigate();

  useEffect(() => {
    if (autoScan && !didAutoScan.current) {
      didAutoScan.current = true;
      scanMarket(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan]);

  const scanMarket = async (isAuto = false) => {
    if (!hasEnough(SCAN_COST)) {
      toast({
        title: "Not enough credits",
        description: `Scanning the market costs ${SCAN_COST} credits.`,
        variant: "destructive",
      });
      if (!isAuto) navigate("/pricing");
      return;
    }

    const ok = await spend(SCAN_COST, "profit_feed_scan", `Profit Feed scan${niche ? `: ${niche}` : ""}`);
    if (!ok) return;

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
              <p className="text-xs text-muted-foreground">AI-powered market intelligence · {SCAN_COST} credits / scan</p>
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
              onClick={() => scanMarket()}
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
                  Scan the Market · {SCAN_COST} cr
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
            <Button variant="ghost" size="sm" onClick={() => scanMarket()} className="h-7 text-xs gap-1.5 text-muted-foreground">
              <RefreshCw className="h-3 w-3" /> Refresh Feed · {SCAN_COST} cr
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
