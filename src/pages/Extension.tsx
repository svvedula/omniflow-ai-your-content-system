import { useEffect, useState } from "react";
import { Download, Chrome, Sparkles, Table2, MessageSquare, Search, FileText, Check, Lock, Key, Copy, Loader2, Coins, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const steps = [
  "Click Download below to get the .zip",
  "Unzip the file anywhere on your computer",
  "Open chrome://extensions in Chrome (or Edge/Brave/Arc)",
  "Toggle Developer mode ON (top-right corner)",
  "Click Load unpacked → select the unzipped folder",
  "Click the puzzle-piece 🧩 icon in Chrome's toolbar → pin OmniFlow → click the O icon → paste your key below",
];

const features = [
  { icon: Table2, title: "Make tables", desc: "Extract any data on screen into a clean table." },
  { icon: MessageSquare, title: "Draft replies", desc: "Reply to emails, DMs, or comments visible on your screen." },
  { icon: Search, title: "Find outliers", desc: "Spot anomalies in dashboards, databases, and reports." },
  { icon: FileText, title: "Summarize anything", desc: "Pages, threads, docs, search results — instantly distilled." },
];

interface ExtKey { id: string; api_key: string; created_at: string; }
interface AccessRow { unlocked_for: string; source: string; }

export default function Extension() {
  const { user } = useAuth();
  const { balance, refresh } = useCredits();
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ExtKey[]>([]);
  const [todayAccess, setTodayAccess] = useState<AccessRow | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [generating, setGenerating] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const [keysRes, accessRes, profileRes] = await Promise.all([
        supabase.from("extension_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("extension_access").select("unlocked_for, source").eq("user_id", user.id).eq("unlocked_for", today).maybeSingle(),
        supabase.from("profiles").select("pro_until").eq("user_id", user.id).maybeSingle(),
      ]);
      setKeys(keysRes.data || []);
      setTodayAccess(accessRes.data || null);
      setIsPro(!!profileRes.data?.pro_until && new Date(profileRes.data.pro_until) > new Date());
      setLoading(false);
    })();
  }, [user, today]);

  const handleDownload = () => {
    fetch("/omniflow-copilot.zip")
      .then((r) => { if (!r.ok) throw new Error("Download failed"); return r.blob(); })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "omniflow-copilot.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }));
  };

  const generateKey = async () => {
    if (!user) return navigate("/auth");
    setGenerating(true);
    const newKey = "omf_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const { data, error } = await supabase.from("extension_keys").insert({ user_id: user.id, api_key: newKey }).select().single();
    setGenerating(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setKeys([data, ...keys]);
    toast({ title: "Key generated", description: "Copy it and paste into the extension." });
  };

  const unlockToday = async () => {
    if (!user) return navigate("/auth");
    setUnlocking(true);
    const { data, error } = await supabase.rpc("unlock_extension_day");
    setUnlocking(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    const result = data as any;
    if (!result.success) {
      toast({ title: "Can't unlock", description: result.error, variant: "destructive" });
      if (result.error?.includes("10 credits")) navigate("/pricing");
      return;
    }
    setTodayAccess({ unlocked_for: today, source: result.source });
    refresh();
    toast({ title: "Unlocked!", description: result.source === "pro" ? "Free with your Pro plan." : "10 credits spent. Access until midnight." });
  };

  const copyKey = (k: string) => {
    navigator.clipboard.writeText(k);
    toast({ title: "Copied!" });
  };

  const hasAccess = isPro || !!todayAccess;

  return (
    <div className="h-[calc(100vh-3rem)] overflow-auto p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-mono">
            <Chrome className="h-4 w-4" /> Browser Extension
          </div>
          <h1 className="text-3xl font-bold text-foreground">OmniFlow Copilot</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Pop it open on any tab. Tell it what you need. It reads your screen and answers — tables, replies, outliers, summaries.
          </p>
          <Button onClick={handleDownload} size="lg" className="gap-2 mt-4">
            <Download className="h-4 w-4" /> Download Extension (.zip)
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {features.map((f) => (
            <div key={f.title} className="p-4 rounded-xl border border-border/30 bg-secondary/20">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-primary/10"><f.icon className="h-4 w-4 text-primary" /></div>
                <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Access gate */}
        <div className="p-5 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Daily Access
            </h2>
            {hasAccess ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                <Check className="h-3 w-3" /> Unlocked today {isPro && "• Pro"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            The extension costs <span className="text-foreground font-semibold">10 credits/day</span> to use.
            Unused daily credits roll over (up to 50/month), or go <span className="text-primary font-semibold">Pro</span> for unlimited daily access.
          </p>

          {!user ? (
            <Button onClick={() => navigate("/auth")} className="w-full">Sign in to unlock</Button>
          ) : !hasAccess ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={unlockToday} disabled={unlocking || (balance ?? 0) < 10} className="gap-2 flex-1">
                {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                Unlock today (10 credits) {balance !== null && <span className="opacity-70">· {balance.toFixed(1)} avail</span>}
              </Button>
              <Button onClick={() => navigate("/pricing")} variant="outline" className="gap-2">
                <Crown className="h-4 w-4" /> Go Pro
              </Button>
            </div>
          ) : null}
        </div>

        {/* Key management */}
        {user && hasAccess && (
          <div className="p-5 rounded-xl border border-border/30 bg-secondary/10 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" /> Your Extension Key
              </h2>
              <Button onClick={generateKey} disabled={generating} size="sm" variant="outline" className="gap-1.5">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} New Key
              </Button>
            </div>
            {keys.length === 0 ? (
              <p className="text-sm text-muted-foreground">Generate a key to paste into the extension popup.</p>
            ) : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div key={k.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border/30">
                    <code className="flex-1 text-xs font-mono text-foreground truncate">{k.api_key}</code>
                    <Button onClick={() => copyKey(k.api_key)} size="sm" variant="ghost" className="h-7 gap-1.5">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Video slot */}
        <div className="rounded-xl border border-border/30 bg-secondary/10 overflow-hidden">
          <div className="aspect-video bg-secondary/30 flex items-center justify-center text-center p-6">
            <div className="space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                <Chrome className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">📹 Demo video coming soon</p>
              <p className="text-xs text-muted-foreground/60">Replace this section with your video embed.</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border/30 bg-secondary/10 space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Install in 60 seconds
          </h2>
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground/70 pt-2 border-t border-border/30">
            Works in Chrome, Edge, Brave, Arc, Opera — any Chromium browser.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
          <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <span className="text-emerald-400 font-semibold">Credits roll over.</span> You earn 5/day capped at 50/month. Save them up for a few days, then unlock the extension when you need it.
          </div>
        </div>
      </div>
    </div>
  );
}
