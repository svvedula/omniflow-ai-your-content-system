import { Check, Zap, Crown, Rocket, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const PLANS = [
  { name: "Starter", credits: 100, price: 20, icon: Zap, popular: false },
  { name: "Pro", credits: 300, price: 50, icon: Star, popular: true },
  { name: "Business", credits: 600, price: 100, icon: Crown, popular: false },
  { name: "Enterprise", credits: 1000, price: 200, icon: Rocket, popular: false },
];

export default function Pricing() {
  const { balance } = useCredits();
  const { user } = useAuth();

  const handleSubscribe = (plan: typeof PLANS[0]) => {
    // Placeholder — Stripe integration will go here
    toast({
      title: "Coming Soon",
      description: `${plan.name} plan ($${plan.price}/mo for ${plan.credits} credits) — payment integration coming soon!`,
    });
  };

  return (
    <div className="h-[calc(100vh-3rem)] overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-mono">
            <Zap className="h-4 w-4" /> Credits & Plans
          </div>
          <h1 className="text-3xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            You get <span className="font-semibold text-primary">5 free credits daily</span>. 
            Need more? Pick a plan below.
          </p>
          {balance !== null && (
            <p className="text-sm text-muted-foreground">
              Current balance: <span className="font-bold text-foreground">{balance.toFixed(1)} credits</span>
            </p>
          )}
        </div>

        {/* Cost breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/30 text-center">
            <p className="text-2xl font-bold text-foreground">1.5</p>
            <p className="text-xs text-muted-foreground">credits per tool selection</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/30 text-center">
            <p className="text-2xl font-bold text-foreground">0.5</p>
            <p className="text-xs text-muted-foreground">credits per interaction</p>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-xl border transition-all ${
                plan.popular
                  ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]"
                  : "border-border/30 bg-secondary/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  Most Popular
                </div>
              )}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <plan.icon className={`h-5 w-5 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                  <h3 className="font-semibold text-foreground">{plan.name}</h3>
                </div>
                <div>
                  <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{plan.credits}</span> credits per month
                </p>
                <p className="text-xs text-muted-foreground">
                  ${(plan.price / plan.credits).toFixed(2)} per credit
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" /> All workspace tools
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" /> Image analysis
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" /> Priority processing
                  </li>
                  {plan.credits >= 600 && (
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary" /> API access
                    </li>
                  )}
                </ul>
                <Button
                  onClick={() => handleSubscribe(plan)}
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  Subscribe
                </Button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          All plans include 5 free daily credits. Unused purchased credits roll over for 30 days.
        </p>
      </div>
    </div>
  );
}
