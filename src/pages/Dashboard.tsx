import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Code2, Briefcase, LayoutGrid, BookOpen, Coins, Rocket, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";

const modes = [
  { title: "Creator", desc: "Generate hooks, scripts, captions & branding kits.", icon: Sparkles, url: "/creator", color: "text-primary" },
  { title: "Developer", desc: "AI pair-programmer with split-pane code editor.", icon: Code2, url: "/developer", color: "text-primary" },
  { title: "Business", desc: "Plans, marketing strategy & profit opportunities.", icon: Briefcase, url: "/business", color: "text-primary" },
  { title: "Workspace", desc: "Multimodal data analysis, tables & insights.", icon: LayoutGrid, url: "/workspace", color: "text-primary" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance } = useCredits();
  const firstName = (user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there").split(" ")[0];

  const hasOnboarded = () => !!user && localStorage.getItem(`ascend_onboarded_${user.id}`) === "1";

  const goToMode = (url: string) => {
    if (user && !hasOnboarded()) {
      navigate(`/onboarding?next=${encodeURIComponent(url)}`);
    } else {
      navigate(url);
    }
  };

  const skipTour = () => {
    if (user) localStorage.setItem(`ascend_onboarded_${user.id}`, "1");
    navigate("/creator");
  };

  return (
    <div className="min-h-full p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-primary/20 glass p-8 md:p-12"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative space-y-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary">
            <Zap className="h-3.5 w-3.5" /> Welcome to Ascend
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              Hey {firstName} — let's build something today.
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
              Your AI workspace for content, code, business strategy and data. Start with a quick tour so you know what every tool can do.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="lg"
              variant="glow"
              onClick={() => navigate("/onboarding")}
              className="h-14 px-8 text-base gap-2"
            >
              <Rocket className="h-5 w-5" />
              Onboarding → learn more
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="ghost" onClick={() => goToMode("/creator")} className="h-14 px-6 text-sm gap-2">
              Skip tour, jump in
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Credits", value: balance !== null ? balance.toFixed(1) : "—", icon: Coins },
          { label: "Modes", value: "4", icon: LayoutGrid },
          { label: "Notebook", value: "Synced", icon: BookOpen },
          { label: "Daily grant", value: "+5", icon: Zap },
        ].map((s) => (
          <Card key={s.label} className="p-4 border-border/60 bg-card/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Modes overview */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Your modes</h2>
            <p className="text-sm text-muted-foreground">Pick a workspace and start creating.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {modes.map((m) => (
            <Card
              key={m.title}
              onClick={() => goToMode(m.url)}
              className="p-5 cursor-pointer border-border/60 bg-card/50 hover:border-primary/40 hover:bg-card/80 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <m.icon className={`h-5 w-5 ${m.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{m.title} Mode</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Notebook + Pricing tile */}
      <section className="grid md:grid-cols-2 gap-4">
        <Card onClick={() => navigate("/notebook")} className="p-5 cursor-pointer border-border/60 bg-card/50 hover:border-primary/40 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Notebook</h3>
          </div>
          <p className="text-sm text-muted-foreground">Every chat, pin and note saved across modes — search and revisit anytime.</p>
        </Card>
        <Card onClick={() => navigate("/pricing")} className="p-5 cursor-pointer border-border/60 bg-card/50 hover:border-primary/40 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <Coins className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Credits & Pricing</h3>
          </div>
          <p className="text-sm text-muted-foreground">5 free credits per login day, capped at 50/month. Upgrade for unlimited power.</p>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;
