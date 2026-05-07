import { Download, Chrome, Sparkles, Table2, MessageSquare, Search, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  "Click Download below to get the .zip",
  "Unzip the file anywhere on your computer",
  "Open chrome://extensions in Chrome (or Edge/Brave/Arc)",
  "Toggle Developer mode ON (top-right)",
  "Click Load unpacked → select the unzipped folder",
  "Pin the OmniFlow icon → click it on any page to use",
];

const features = [
  { icon: Table2, title: "Make tables", desc: "Extract any data on screen into a clean table." },
  { icon: MessageSquare, title: "Draft replies", desc: "Reply to emails, DMs, or comments visible on your screen." },
  { icon: Search, title: "Find outliers", desc: "Spot anomalies in dashboards, databases, and reports." },
  { icon: FileText, title: "Summarize anything", desc: "Pages, threads, docs, search results — instantly distilled." },
];

export default function Extension() {
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
      .catch((err) => alert(err.message));
  };

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
            <span className="text-emerald-400 font-semibold">No login required.</span> The extension talks directly to OmniFlow's AI gateway. Screenshots stay on your device unless you choose to send them.
          </div>
        </div>
      </div>
    </div>
  );
}
