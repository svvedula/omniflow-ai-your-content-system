import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "./use-toast";

export function useCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAndGrantDaily = useCallback(async () => {
    if (!user) { setBalance(null); setLoading(false); return; }
    try {
      const { data, error } = await supabase.rpc("grant_daily_credits", { p_user_id: user.id });
      if (error) throw error;
      setBalance(Number(data));
    } catch (err: any) {
      console.error("Credits error:", err);
      // Try to just read balance
      const { data } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      setBalance(data ? Number(data.balance) : 5);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAndGrantDaily(); }, [fetchAndGrantDaily]);

  const spend = useCallback(async (amount: number, type: string, description: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await supabase.rpc("spend_credits", {
        p_user_id: user.id,
        p_amount: amount,
        p_type: type,
        p_description: description,
      });
      if (error) throw error;
      const newBalance = Number(data);
      if (newBalance < 0) {
        toast({ title: "Not enough credits", description: "Purchase more credits to continue.", variant: "destructive" });
        return false;
      }
      setBalance(newBalance);
      return true;
    } catch (err: any) {
      console.error("Spend credits error:", err);
      toast({ title: "Error", description: "Failed to process credits", variant: "destructive" });
      return false;
    }
  }, [user]);

  const hasEnough = (amount: number) => balance !== null && balance >= amount;

  return { balance, loading, spend, hasEnough, refresh: fetchAndGrantDaily };
}
