import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ContentSystem } from "@/lib/types";

interface ContentEditorProps {
  data: ContentSystem;
  onUpdateData: (data: ContentSystem) => void;
}

type Message = { role: "user" | "assistant"; content: string };

export function ContentEditor({ data, onUpdateData }: ContentEditorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: responseData, error } = await supabase.functions.invoke("edit-content", {
        body: {
          message: text,
          currentContent: data,
          chatHistory: messages,
        },
      });

      if (error) throw new Error(error.message);
      if (responseData?.error) throw new Error(responseData.error);

      const assistantMsg: Message = { role: "assistant", content: responseData.reply };
      setMessages((prev) => [...prev, assistantMsg]);

      if (responseData.updatedContent) {
        onUpdateData(responseData.updatedContent);
        toast({ title: "Content Updated", description: "Your content has been modified based on your request." });
      }
    } catch (err) {
      console.error("Edit error:", err);
      toast({
        title: "Edit Failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 border border-border/50 rounded-xl bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 bg-secondary/30">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          AI Content Editor
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tell the AI what to change — e.g. "Make the hooks more aggressive" or "Replace idea #3 with something about AI trends"
        </p>
      </div>

      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-64 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 items-start ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <span className="shrink-0 h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </span>
              )}
              <div className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}>
                {msg.content}
              </div>
              {msg.role === "user" && (
                <span className="shrink-0 h-6 w-6 rounded-md bg-muted flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 items-center">
              <span className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </span>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      <div className="p-3 border-t border-border/30 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell the AI what to change about your content..."
          className="min-h-[40px] max-h-[100px] resize-none text-sm"
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
  );
}
