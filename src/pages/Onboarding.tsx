import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sparkles, Code2, Briefcase, LayoutGrid, BookOpen, Coins, CreditCard,
  ArrowRight, Check, MessageCircle, Target, Zap, Pin, History, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DISCORD_URL = "https://discord.gg/hvvmRfpDRw";

type Goal = "content" | "code" | "business" | "data" | "everything";

const GOALS: { id: Goal; title: string; desc: string; icon: any; modes: string[] }[] = [
  { id: "content", title: "Create content", desc: "Scripts, hooks, captions, branding for social media", icon: Sparkles, modes: ["creator"] },
  { id: "code", title: "Build software", desc: "Get help writing, debugging, and shipping code", icon: Code2, modes: ["developer"] },
  { id: "business", title: "Grow a business", desc: "Plans, marketing, projects, and real-time opportunities", icon: Briefcase, modes: ["business"] },
  { id: "data", title: "Analyze data", desc: "Spreadsheets, tables, multimodal data work", icon: LayoutGrid, modes: ["workspace"] },
  { id: "everything", title: "All of the above", desc: "I want the full Ascend toolkit", icon: Zap, modes: ["creator", "developer", "business", "workspace"] },
];

const MODE_DETAILS: Record<string, { title: string; icon: any; route: string; features: string[] }> = {
  creator: {
    title: "Creator Mode",
    icon: Sparkles,
    route: "/",
    features: [
      "Generate full content systems: ideas, hooks, short & long scripts",
      "Auto-write captions and trending hashtags for any platform",
      "Build brand kits with names, style direction, logo & banner concepts",
      "Generate AI logos and video prompts ready for Sora / Veo / Runway",
    ],
  },
  developer: {
    title: "Developer Mode",
    icon: Code2,
    route: "/developer",
    features: [
      "Split-pane streaming chat with a live PrismJS code editor",
      "Get full-file rewrites up to 16k+ tokens — no truncation",
      "Debug, refactor, and explain code in any language",
      "Persist every chat to your Notebook for later",
    ],
  },
  business: {
    title: "Business Mode",
    icon: Briefcase,
    route: "/business",
    features: [
      "AI interviews you first, then tailors plans to your exact stage & budget",
      "Three sub-modes: Planning, Marketing, and Project Management",
      "Profit Feed scans the live market for real opportunities",
      "Each Opportunity Card unlocks a step-by-step execution coach",
    ],
  },
  workspace: {
    title: "Workspace Mode",
    icon: LayoutGrid,
    route: "/workspace",
    features: [
      "Multimodal data suite — paste text, upload data, get insights",
      "Auto-build tables and structured outputs from messy input",
      "Summarize plans and extract action items instantly",
      "Powered by Gemini 3 Flash for speed and accuracy",
    ],
  },
};

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [discordVisited, setDiscordVisited] = useState(false);

  const totalSteps = 5;
  const selectedModes = goal ? GOALS.find((g) => g.id === goal)!.modes : [];

  const finish = () => {
    if (user) localStorage.setItem(`ascend_onboarded_${user.id}`, "1");
    const nextParam = searchParams.get("next");
    const dest = nextParam || (selectedModes[0] ? MODE_DETAILS[selectedModes[0]].route : "/");
    navigate(dest, { replace: true });
  };

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />

      <div className="relative max-w-3xl mx-auto px-6 py-10 md:py-16">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                i <= step ? "bg-primary" : "bg-border"
              )}
            />
          ))}
        </div>

        {/* Step 0: Goal */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-2">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">Welcome to Ascend</h1>
              <p className="text-muted-foreground">First — what do you want to do?</p>
            </div>
            <div className="grid gap-3">
              {GOALS.map((g) => {
                const Icon = g.icon;
                const active = goal === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={cn(
                      "text-left p-4 rounded-xl border transition-all flex items-center gap-4",
                      active
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/40 bg-card"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center",
                      active ? "bg-primary/15" : "bg-secondary"
                    )}>
                      <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{g.title}</div>
                      <div className="text-sm text-muted-foreground">{g.desc}</div>
                    </div>
                    {active && <Check className="h-5 w-5 text-primary" />}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button onClick={next} disabled={!goal} size="lg" className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Modes */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <p className="text-xs font-mono uppercase tracking-widest text-primary">Your Toolkit</p>
              <h1 className="text-3xl md:text-4xl font-bold">
                {selectedModes.length === 1 ? "Here's your mode" : "Here's your toolkit"}
              </h1>
              <p className="text-muted-foreground">Everything you can do, based on your goal.</p>
            </div>
            <div className="space-y-4">
              {selectedModes.map((m) => {
                const mode = MODE_DETAILS[m];
                const Icon = mode.icon;
                return (
                  <Card key={m} className="p-5 border-border/60">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{mode.title}</h3>
                        <ul className="space-y-1.5">
                          {mode.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={back}>Back</Button>
              <Button onClick={next} size="lg" className="gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Notebook */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-2">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">Your Notebook</h1>
              <p className="text-muted-foreground">Nothing is ever lost. Every chat, pin, and note lives here.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Card className="p-4 space-y-2">
                <History className="h-5 w-5 text-primary" />
                <div className="font-semibold text-sm">Session History</div>
                <div className="text-xs text-muted-foreground">Every chat across every mode is auto-saved and searchable.</div>
              </Card>
              <Card className="p-4 space-y-2">
                <Pin className="h-5 w-5 text-primary" />
                <div className="font-semibold text-sm">Pins & Highlights</div>
                <div className="text-xs text-muted-foreground">Pin the best AI responses with color-coded highlights.</div>
              </Card>
              <Card className="p-4 space-y-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <div className="font-semibold text-sm">Notes</div>
                <div className="text-xs text-muted-foreground">Add your own notes, tag them, and revisit anytime.</div>
              </Card>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Tap <span className="text-foreground font-medium">Notebook</span> in the top bar from any page.
            </p>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={back}>Back</Button>
              <Button onClick={next} size="lg" className="gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Credits + Pricing */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-2">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">Credits & Plans</h1>
              <p className="text-muted-foreground">How Ascend stays running.</p>
            </div>

            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Free daily credits</h3>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> +5 credits each day you log in</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Capped at 50 free credits per month</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Full tools cost ~1.5 credits, chat messages ~0.5</li>
              </ul>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Need more? Upgrade anytime</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Paid plans give you a much higher monthly credit pool, priority access to advanced models,
                and the ability to top up balance whenever you need it.
              </p>
              <Button variant="outline" size="sm" onClick={() => window.open("/pricing", "_blank")} className="gap-2">
                See pricing <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Card>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={back}>Back</Button>
              <Button onClick={next} size="lg" className="gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Discord (required) */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#5865F2]/15 border border-[#5865F2]/30 mb-2">
                <MessageCircle className="h-6 w-6 text-[#5865F2]" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">Join the Community</h1>
              <p className="text-muted-foreground">
                The Ascend Discord is where you'll get help, share wins, and shape what we build next.
              </p>
            </div>

            <Card className="p-6 space-y-4 border-[#5865F2]/30 bg-[#5865F2]/5">
              <div className="space-y-2">
                <h3 className="font-semibold">You'll get:</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#5865F2] mt-0.5 shrink-0" /> Direct support from the team</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#5865F2] mt-0.5 shrink-0" /> Early access to new modes & features</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#5865F2] mt-0.5 shrink-0" /> A community of creators, devs & founders</li>
                </ul>
              </div>
              <Button
                size="lg"
                onClick={() => {
                  window.open(DISCORD_URL, "_blank", "noopener,noreferrer");
                  setDiscordVisited(true);
                }}
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Join the Discord
              </Button>
              {discordVisited && (
                <p className="text-xs text-center text-muted-foreground">
                  Thanks for joining! You can now finish onboarding.
                </p>
              )}
            </Card>

            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={back}>Back</Button>
              <Button
                onClick={finish}
                disabled={!discordVisited}
                size="lg"
                className="gap-2"
              >
                {discordVisited ? "Enter Ascend" : "Join Discord to continue"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
