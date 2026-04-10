import { useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Code2, Settings2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string; id?: string };

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

interface DevChatPanelProps {
  messages: Message[];
  input: string;
  isLoading: boolean;
  language: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onLanguageChange: (v: string) => void;
  onNewChat: () => void;
}

export function DevChatPanel({ messages, input, isLoading, language, onInputChange, onSend, onLanguageChange, onNewChat }: DevChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="w-1/2 flex flex-col border-r border-border/50">
      <div className="px-4 py-3 border-b border-border/30 bg-secondary/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              AI Developer Assistant
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              Code generation • Review • Debug • Docs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onNewChat} className="h-8 text-xs gap-1.5">
            <Plus className="h-3 w-3" /> New Chat
          </Button>
          <Select value={language} onValueChange={onLanguageChange}>
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
                  onClick={() => onInputChange(suggestion)}
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
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Ask me to write, review, or debug code..."
          className="min-h-[44px] max-h-[120px] resize-none text-sm font-mono"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <Button size="icon" onClick={onSend} disabled={isLoading || !input.trim()} className="shrink-0 self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
