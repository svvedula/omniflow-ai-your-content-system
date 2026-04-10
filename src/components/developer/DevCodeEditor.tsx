import { useState } from "react";
import { Code2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/themes/prism-tomorrow.css";

const LANGUAGES: Record<string, string> = {
  javascript: "JavaScript", typescript: "TypeScript", python: "Python",
  java: "Java", go: "Go", rust: "Rust", html: "HTML", css: "CSS",
  bash: "Bash", json: "JSON",
};

interface DevCodeEditorProps {
  code: string;
  language: string;
  onCodeChange: (v: string) => void;
}

export function DevCodeEditor({ code, language, onCodeChange }: DevCodeEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightCode = (c: string) => {
    const prismLang = language === "html" ? "markup" : language;
    const grammar = Prism.languages[prismLang] || Prism.languages.javascript;
    return Prism.highlight(c, grammar, prismLang);
  };

  return (
    <div className="w-1/2 flex flex-col bg-[hsl(228,14%,6%)]">
      <div className="px-4 py-3 border-b border-border/30 bg-secondary/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            {LANGUAGES[language] || language}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1.5 text-muted-foreground">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-0">
        <Editor
          value={code}
          onValueChange={onCodeChange}
          highlight={highlightCode}
          padding={16}
          className="min-h-full font-mono text-sm leading-relaxed"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            minHeight: "100%",
            background: "transparent",
            color: "hsl(210, 20%, 92%)",
          }}
        />
      </div>
    </div>
  );
}
