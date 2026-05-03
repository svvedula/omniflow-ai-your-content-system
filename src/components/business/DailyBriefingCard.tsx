import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Mail, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const DailyBriefingCard = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [niche, setNiche] = useState("");
  const [hour, setHour] = useState(13);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("briefing_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setEnabled(data.enabled);
        setNiche(data.niche || "");
        setHour(data.send_hour_utc ?? 13);
      }
      setLoaded(true);
    })();
  }, [user]);

  const save = async (next: Partial<{ enabled: boolean; niche: string; send_hour_utc: number }>) => {
    if (!user) return;
    const payload = { user_id: user.id, enabled, niche, send_hour_utc: hour, ...next };
    await supabase.from("briefing_preferences").upsert(payload, { onConflict: "user_id" });
  };

  const onToggle = async (v: boolean) => {
    setEnabled(v);
    await save({ enabled: v });
    toast({
      title: v ? "Daily Briefing enabled" : "Daily Briefing paused",
      description: v ? "We'll email you each morning with curated opportunities." : "You won't receive briefings until re-enabled.",
    });
  };

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-secondary/20 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Mail className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Daily Briefing Email</h3>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Curated opportunities · delivered daily
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} disabled={!loaded} />
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        We'll scan the market each morning and email you a 60-second briefing: trends, deals, and one action item — tailored to your niche.
      </p>

      {enabled && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Niche</label>
            <Input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              onBlur={() => save({ niche })}
              placeholder="e.g. sneakers, SaaS, e-commerce"
              className="h-8 text-xs bg-secondary/30 mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Send hour (UTC)
            </label>
            <Input
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              onBlur={() => save({ send_hour_utc: hour })}
              className="h-8 text-xs bg-secondary/30 mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
};
