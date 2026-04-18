import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Lock, Mail, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const PLANS = [
  { days: 30, label: "1 month", priceUsd: 19 },
  { days: 90, label: "3 months", priceUsd: 49 },
  { days: 365, label: "1 year", priceUsd: 149 },
];

type GiftRow = {
  id: string;
  recipient_email: string | null;
  recipient_name: string | null;
  pro_days: number;
  status: string;
  created_at: string;
};

const Gift = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState(30);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingGifts, setPendingGifts] = useState<GiftRow[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("gift_purchases")
      .select("id,recipient_email,recipient_name,pro_days,status,created_at")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setPendingGifts((data as GiftRow[]) ?? []));
  }, [user]);

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("gift_purchases").insert({
        buyer_id: user.id,
        recipient_email: recipientEmail || null,
        recipient_name: recipientName || null,
        message: message || null,
        pro_days: selectedDays,
        status: "pending",
      });
      if (error) throw error;
      toast({
        title: "Gift reserved",
        description: "Checkout isn't live yet. We'll email you to complete payment once Stripe is enabled.",
      });
      setRecipientEmail(""); setRecipientName(""); setMessage("");
      // refresh
      const { data } = await supabase
        .from("gift_purchases").select("id,recipient_email,recipient_name,pro_days,status,created_at")
        .eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(10);
      setPendingGifts((data as GiftRow[]) ?? []);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary">
          <Gift className="h-3.5 w-3.5" /> Gift Ascend Pro
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Send Pro to someone you ❤</h1>
        <p className="text-muted-foreground">Pick a Pro plan, add a note, and we'll generate a one-time gift code for the recipient.</p>
      </motion.div>

      <Card className="p-4 border-primary/30 bg-primary/5 flex items-start gap-3">
        <Lock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="text-sm">
          <strong>Checkout coming soon.</strong> Stripe payments aren't enabled yet. You can reserve a gift now — we'll notify you to complete payment once it's live.
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <form onSubmit={handleReserve} className="space-y-6">
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Choose a plan</Label>
            <div className="grid grid-cols-3 gap-3">
              {PLANS.map((p) => (
                <button
                  type="button"
                  key={p.days}
                  onClick={() => setSelectedDays(p.days)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedDays === p.days
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-xs font-mono uppercase text-muted-foreground">{p.label}</div>
                  <div className="text-xl font-bold mt-1">${p.priceUsd}</div>
                  <div className="text-[10px] text-muted-foreground">{p.days} days of Pro</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rname" className="text-xs text-muted-foreground">Recipient name (optional)</Label>
              <Input id="rname" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Their name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remail" className="text-xs text-muted-foreground">Recipient email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="remail" type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="them@example.com" className="pl-10" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg" className="text-xs text-muted-foreground">Personal message (optional)</Label>
            <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} placeholder="Hope you love it!" />
          </div>

          <Button type="submit" variant="glow" size="lg" className="w-full h-12 gap-2" disabled={submitting}>
            <Gift className="h-4 w-4" />
            {submitting ? "Reserving..." : `Reserve gift — $${PLANS.find((p) => p.days === selectedDays)?.priceUsd}`}
          </Button>
        </form>
      </Card>

      {pendingGifts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Your gift history</h2>
          <div className="space-y-2">
            {pendingGifts.map((g) => (
              <Card key={g.id} className="p-4 flex items-center justify-between bg-card/50">
                <div>
                  <div className="text-sm font-medium">{g.recipient_name || g.recipient_email || "Unnamed gift"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {g.pro_days} days</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(g.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Badge variant={g.status === "redeemed" ? "default" : g.status === "paid" ? "secondary" : "outline"}>
                  {g.status}
                </Badge>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Gift;
