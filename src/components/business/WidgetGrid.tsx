import { useNavigate } from "react-router-dom";
import { Calculator, Eye, Presentation, Search, Construction } from "lucide-react";

const WIDGETS = [
  {
    id: "modeler",
    title: "Financial Modeler",
    description: "Project revenue, runway, LTV/CAC, and break-even.",
    icon: Calculator,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    path: "/business/modeler",
  },
  {
    id: "watchtower",
    title: "Competitive Watchtower",
    description: "Track competitor pages and get diff alerts.",
    icon: Eye,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    path: "/business/watchtower",
  },
  {
    id: "deck",
    title: "Pitch Deck Creator",
    description: "Generate a 10-slide investor deck in 60 seconds.",
    icon: Presentation,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    path: "/business/pitch-deck",
  },
  {
    id: "leads",
    title: "Lead Finder",
    description: "Niche-specific business contacts with CSV export.",
    icon: Search,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    path: null,
    wip: true,
  },
] as const;

export const WidgetGrid = () => {
  const navigate = useNavigate();
  return (
    <div>
      <h2 className="text-sm font-bold text-foreground mb-3">Tools</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {WIDGETS.map((w) => {
          const Icon = w.icon;
          const disabled = w.wip;
          return (
            <button
              key={w.id}
              onClick={() => w.path && navigate(w.path)}
              disabled={disabled}
              className={`group text-left p-4 rounded-xl border ${w.border} ${w.bg} transition-all ${
                disabled ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02]"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${w.bg}`}>
                  <Icon className={`h-4 w-4 ${w.color}`} />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{w.title}</h3>
                {w.wip && (
                  <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground flex items-center gap-1">
                    <Construction className="h-2.5 w-2.5" /> WIP
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{w.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
