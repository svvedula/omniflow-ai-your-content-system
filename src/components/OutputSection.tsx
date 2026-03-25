import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { useState, type ReactNode } from "react";

interface OutputSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  delay?: number;
}

export function OutputSection({ title, icon, children, delay = 0 }: OutputSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border/50 bg-secondary/30">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="p-5">
        {children}
      </div>
    </motion.div>
  );
}

export function CopyableBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative bg-background/40 rounded-lg p-4 border border-border/30 hover:border-primary/20 transition-colors">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-secondary/50 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap pr-8">{text}</p>
    </div>
  );
}
