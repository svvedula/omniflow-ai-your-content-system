import { Coins, Zap } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function CreditDisplay() {
  const { balance, loading } = useCredits();
  const navigate = useNavigate();

  if (loading || balance === null) return null;

  const isLow = balance < 2;

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono border ${
        isLow 
          ? "bg-destructive/10 border-destructive/30 text-destructive" 
          : "bg-primary/10 border-primary/20 text-primary"
      }`}>
        <Coins className="h-3.5 w-3.5" />
        <span className="font-bold">{balance.toFixed(1)}</span>
        <span className="text-muted-foreground">credits</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/pricing")}
        className="h-7 text-xs gap-1 text-primary hover:text-primary"
      >
        <Zap className="h-3 w-3" /> Get More
      </Button>
    </div>
  );
}
