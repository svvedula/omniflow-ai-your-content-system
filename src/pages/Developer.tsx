import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Code2, Copy, Check, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
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

type Message = { role: "user" | "assistant"; content: string };

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "bash", label: "Bash" },
  { value: "json", label: "JSON" },
];

const Developer = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("// Paste your code here or let the AI generate some...\n");
  const [language, setLanguage] = useState("typescript");
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dev-assistant`;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightCode = (code: string) => {
    const prismLang = language === "html" ? "markup" : language;
    const grammar = Prism.languages[prismLang] || Prism.languages.javascript;
    return Prism.highlight(code, grammar, prismLang);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          language,
          currentCode: code,
        }),
      });

      if (resp.status === 429) {
        toast({ title: "Rate Limited", description: "Too many requests. Please wait a moment.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast({ title: "Credits Exhausted", description: "Please add funds in Settings → Workspace → Usage.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let codeExtracted = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Extract code blocks from the response and put them in the editor
      const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
      let lastMatch: RegExpExecArray | null = null;
      let match;
      while ((match = codeBlockRegex.exec(assistantSoFar)) !== null) {
        lastMatch = match;
      }
      if (lastMatch) {
        setCode(lastMatch[1].trim());
      }
    } catch (err) {
      console.error("Dev assistant error:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
      {/* Chat Panel */}
      <div className="w-1/2 flex flex-col border-r border-border/50">
        <div className="px-4 py-3 border-b border-border/30 bg-secondary/30 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              AI Developer Assistant
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              Code generation • Review • Debug • Docs
            </p>
          </div>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <Settings2 className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value} className="text-xs">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
              <Code2 className="h-12 w-12 text-primary/40" />
              <div>
                <p className="text-sm font-medium text-foreground">Developer Mode</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Ask me to generate code, review your code, debug errors, or explain concepts. 
                  Paste code in the editor or in the chat.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 w-full max-w-sm">
                {[
                  "Generate a REST API endpoint",
                  "Review my code for bugs",
                  "Explain this error message",
                  "Write unit tests for this function",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-[11px] text-left px-3 py-2 rounded-lg border border-border/50 bg-card/50 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 items-start ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <span className="shrink-0 h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center mt-1">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </span>
              )}
              <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/80 text-foreground"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_pre]:bg-background/50 [&_pre]:rounded-md [&_pre]:p-2 [&_pre]:text-xs [&_code]:text-primary [&_code]:text-xs">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
              {msg.role === "user" && (
                <span className="shrink-0 h-6 w-6 rounded-md bg-muted flex items-center justify-center mt-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2 items-center">
              <span className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </span>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border/30 flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me to write, review, or debug code..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm font-mono"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()} className="shrink-0 self-end">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Code Editor Panel */}
      <div className="w-1/2 flex flex-col bg-[hsl(228,14%,6%)]">
        <div className="px-4 py-3 border-b border-border/30 bg-secondary/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              {LANGUAGES.find((l) => l.value === language)?.label || language}
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
            onValueChange={setCode}
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
    </div>
  );
};

export default Developer;
