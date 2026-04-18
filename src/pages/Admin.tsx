import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, Plus, Copy, Trash2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";

type CodeRow = {
  id: string;
  code: string;
  description: string | null;
  credits_reward: number;
  pro_days_reward: number;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  source: string;
  expires_at: string | null;
  created_at: string;
};

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `ASCEND-${seg(4)}-${seg(4)}`;
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [code, setCode] = useState(randomCode());
  const [description, setDescription] = useState("");
  const [credits, setCredits] = useState(0);
  const [proDays, setProDays] = useState(0);
  const [maxUses, setMaxUses] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    const { data } = await supabase
      .from("redeem_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setCodes((data as CodeRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  if (authLoading || roleLoading) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="p-10 max-w-xl mx-auto">
        <Card className="p-8 text-center space-y-3 border-destructive/30">
          <Shield className="h-10 w-10 mx-auto text-destructive" />
          <h1 className="text-xl font-bold">Admin only</h1>
          <p className="text-sm text-muted-foreground">
            You need the admin role to access this page. Add yourself via the database:
            <code className="block mt-2 p-2 rounded bg-muted text-xs text-left">
              INSERT INTO user_roles (user_id, role) VALUES ('{user.id}', 'admin');
            </code>
          </p>
        </Card>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credits <= 0 && proDays <= 0) {
      toast({ title: "Pick a reward", description: "Credits or Pro days must be > 0", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("redeem_codes").insert({
        code: code.toUpperCase().trim(),
        description: description || null,
        credits_reward: credits,
        pro_days_reward: proDays,
        max_uses: maxUses ? parseInt(maxUses, 10) : null,
        source: "admin",
        created_by: user.id,
      });
      if (error) throw error;
      toast({ title: "Code created", description: code });
      setCode(randomCode()); setDescription(""); setCredits(0); setProDays(0); setMaxUses("");
      refresh();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, next: boolean) => {
    await supabase.from("redeem_codes").update({ is_active: next }).eq("id", id);
    refresh();
  };

  const deleteCode = async (id: string) => {
    if (!confirm("Delete this code? Existing redemptions are kept.")) return;
    await supabase.from("redeem_codes").delete().eq("id", id);
    refresh();
  };

  return (
    <div className="min-h-full p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin · Redeem Codes</h1>
          <p className="text-sm text-muted-foreground">Create, deactivate and audit promo & gift codes.</p>
        </div>
      </header>

      <Card className="p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4" /> Create new code</h2>
        <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Code</Label>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono tracking-widest" required />
              <Button type="button" variant="outline" onClick={() => setCode(randomCode())}>Random</Button>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Description (internal note)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Discord launch promo" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Credits reward</Label>
            <Input type="number" min={0} step="0.5" value={credits} onChange={(e) => setCredits(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Pro days reward</Label>
            <Input type="number" min={0} value={proDays} onChange={(e) => setProDays(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Max uses (blank = unlimited)</Label>
            <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="glow" disabled={submitting} className="w-full">
              {submitting ? "Creating…" : "Create code"}
            </Button>
          </div>
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">All codes ({codes.length})</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No codes yet.</p>
        ) : (
          <div className="space-y-2">
            {codes.map((c) => (
              <Card key={c.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-bold">{c.code}</code>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(c.code); toast({ title: "Copied" }); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Badge variant={c.source === "gift" ? "secondary" : "outline"}>{c.source}</Badge>
                    {!c.is_active && <Badge variant="destructive">inactive</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {c.description || "—"} · {c.credits_reward > 0 && `${c.credits_reward} credits`}
                    {c.credits_reward > 0 && c.pro_days_reward > 0 && " · "}
                    {c.pro_days_reward > 0 && `${c.pro_days_reward}d Pro`}
                    {" · "}{c.use_count}{c.max_uses ? `/${c.max_uses}` : ""} uses
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Power className="h-3 w-3" />
                    <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c.id, v)} />
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteCode(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Admin;
