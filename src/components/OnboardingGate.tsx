// Onboarding is now opt-in via the Dashboard "Get Started" button.
// This component is kept as a passthrough to avoid touching App.tsx wiring.
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
