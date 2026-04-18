import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Redeem = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("redeem_code", { p_code: code.trim() });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; credits_granted?: number; pro_days_granted?: number };
      if (!result.success) {
        toast({ title: "Couldn't redeem", description: result.error ?? "Unknown error", variant: "destructive" });
        return;
      }
      const parts: string[] = [];
      if (result.credits_granted) parts.push(`+${result.credits_granted} credits`);
      if (result.pro_days_granted) parts.push(`+${result.pro_days_granted} days of Pro`);
      toast({ title: "Code redeemed!", description: parts.join(" • ") || "Reward applied" });
      setCode("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full p-6 md:p-10 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-8 glass border-primary/20">
          <div className="text-center space-y-3 mb-8">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Redeem a Code</h1>
            <p className="text-sm text-muted-foreground">Enter a promo or gift code to claim credits or Pro time.</p>
          </div>
          <form onSubmit={handleRedeem} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-xs text-muted-foreground">Your code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ASCEND-XXXX-XXXX"
                className="h-12 text-center font-mono tracking-widest text-lg uppercase"
                maxLength={64}
                required
              />
            </div>
            <Button type="submit" variant="glow" size="lg" className="w-full h-12 gap-2" disabled={loading || !code.trim()}>
              {loading ? "Redeeming..." : <>Redeem <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>
          <div className="mt-6 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
            <Sparkles className="inline h-3 w-3 mr-1" />
            Codes are case-insensitive. Each user can redeem a code once.
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Redeem;
