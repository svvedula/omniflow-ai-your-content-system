import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !user) return;
    const done = localStorage.getItem(`ascend_onboarded_${user.id}`);
    if (!done && location.pathname !== "/onboarding" && location.pathname !== "/auth") {
      navigate("/onboarding", { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  return <>{children}</>;
}
