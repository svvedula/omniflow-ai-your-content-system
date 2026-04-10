import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Bot, User, Loader2, Code2, Copy, Check, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSession } from "@/hooks/useSession";
import { DevChatPanel } from "@/components/developer/DevChatPanel";
import { DevCodeEditor } from "@/components/developer/DevCodeEditor";

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

const Developer = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("// Paste your code here or let the AI generate some...\n");
  const [language, setLanguage] = useState("typescript");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { createSession, saveMessage, loadSession } = useSession();
  const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dev-assistant`;

  // Load session from URL
  useEffect(() => {
    const sid = searchParams.get("session");
    if (sid && user) {
      loadSession(sid).then(({ session, messages: msgs }) => {
        if (!session || session.mode !== "developer") return;
        setSessionId(sid);
        setMessages(
          msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content, id: m.id }))
        );
        // Restore last code block from last assistant message
        const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
        if (lastAssistant) {
          const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
          let lastMatch: RegExpExecArray | null = null;
          let match;
          while ((match = codeBlockRegex.exec(lastAssistant.content)) !== null) {
            lastMatch = match;
          }
          if (lastMatch) setCode(lastMatch[1].trim());
        }
      });
    }
  }, [searchParams, user]);

  const ensureSession = async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (!user) return null;
    const sid = await createSession("developer", "Dev Chat — " + new Date().toLocaleDateString());
    if (sid) {
      setSessionId(sid);
      setSearchParams({ session: sid }, { replace: true });
    }
    return sid;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    // Persist user message
    const sid = await ensureSession();
    if (sid) {
      const msgId = await saveMessage(sid, "user", text);
      if (msgId) userMsg.id = msgId;
    }

    let assistantSoFar = "";

    try {
      const resp = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          language,
          currentCode: code,
        }),
      });

      if (resp.status === 429) {
        toast({ title: "Rate Limited", description: "Too many requests. Please wait.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast({ title: "Credits Exhausted", description: "Please add funds.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

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
          if (jsonStr === "[DONE]") { streamDone = true; break; }

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

      // Extract code blocks
      const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
      let lastMatch: RegExpExecArray | null = null;
      let match;
      while ((match = codeBlockRegex.exec(assistantSoFar)) !== null) { lastMatch = match; }
      if (lastMatch) setCode(lastMatch[1].trim());

      // Persist assistant message
      if (sid && assistantSoFar) {
        const aId = await saveMessage(sid, "assistant", assistantSoFar);
        if (aId) {
          setMessages((prev) =>
            prev.map((m, i) => (i === prev.length - 1 && m.role === "assistant" ? { ...m, id: aId } : m))
          );
        }
      }
    } catch (err) {
      console.error("Dev assistant error:", err);
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setCode("// Paste your code here or let the AI generate some...\n");
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
      <DevChatPanel
        messages={messages}
        input={input}
        isLoading={isLoading}
        language={language}
        onInputChange={setInput}
        onSend={handleSend}
        onLanguageChange={setLanguage}
        onNewChat={handleNewChat}
      />
      <DevCodeEditor
        code={code}
        language={language}
        onCodeChange={setCode}
      />
    </div>
  );
};

export default Developer;
