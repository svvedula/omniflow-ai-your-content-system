import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Briefcase, TrendingUp, Target, Rocket, Send, Bot, User, Loader2,
  BarChart3, Megaphone, ClipboardList, Lightbulb, X, Signal,
} from "lucide-react";
import ProfitFeed from "@/components/business/ProfitFeed";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSession } from "@/hooks/useSession";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string; id?: string };
type Section = "planning" | "marketing" | "projects" | "general";

const SECTIONS = [
  {
    id: "planning" as Section,
    title: "Business Planning",
    icon: Lightbulb,
    description: "Plans, pitches & strategy",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    prompts: [
      "Generate a lean business plan for a SaaS startup",
      "Create a competitive analysis framework",
      "Help me calculate unit economics",
    ],
  },
  {
    id: "marketing" as Section,
    title: "Marketing & Growth",
    icon: Megaphone,
    description: "Campaigns, SEO & content",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    prompts: [
      "Create a 30-day social media calendar",
      "Write a launch email sequence",
      "Build an SEO keyword strategy",
    ],
  },
  {
    id: "projects" as Section,
    title: "Project Management",
    icon: ClipboardList,
    description: "Tasks, timelines & goals",
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/20",
    prompts: [
      "Break my MVP into a 4-week sprint plan",
      "Create OKRs for next quarter",
      "Design a workflow for content production",
    ],
  },
];

const Business = () => {
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { createSession, saveMessage, loadSession } = useSession();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-assistant`;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load session from URL
  useEffect(() => {
    const sid = searchParams.get("session");
    if (sid && user) {
      loadSession(sid).then(({ session, messages: msgs }) => {
        if (!session || session.mode !== "business") return;
        setSessionId(sid);
        setActiveSection((session as any).tags?.[0] as Section || "general");
        setMessages(
          msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content, id: m.id }))
        );
      });
    }
  }, [searchParams, user]);

  const ensureSession = async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (!user) return null;
    const sid = await createSession("business", `Business — ${activeSection || "general"}`);
    if (sid) {
      setSessionId(sid);
      setSearchParams({ session: sid }, { replace: true });
    }
    return sid;
  };

  const handleSend = async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || isLoading) return;

    if (!activeSection) setActiveSection("general");

    const userMsg: Message = { role: "user", content: msgText };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    const sid = await ensureSession();
    if (sid) {
      const msgId = await saveMessage(sid, "user", msgText);
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
          section: activeSection || "general",
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

      if (sid && assistantSoFar) {
        const aId = await saveMessage(sid, "assistant", assistantSoFar);
        if (aId) {
          setMessages((prev) =>
            prev.map((m, i) => (i === prev.length - 1 && m.role === "assistant" ? { ...m, id: aId } : m))
          );
        }
      }
    } catch (err) {
      console.error("Business assistant error:", err);
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setActiveSection(null);
    setSearchParams({}, { replace: true });
  };

  // Dashboard view when no section is active
  if (!activeSection && messages.length === 0) {
    return (
      <div className="h-[calc(100vh-3rem)] overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-mono">
              <Briefcase className="h-4 w-4" />
              Business Hub
            </div>
            <h1 className="text-3xl font-bold text-foreground">What are we building today?</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Pick a focus area to get AI-powered help with your business
            </p>
          </div>

          {/* Section Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`group text-left p-6 rounded-xl border ${section.borderColor} ${section.bgColor} hover:scale-[1.02] transition-all duration-200`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${section.bgColor}`}>
                    <section.icon className={`h-5 w-5 ${section.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{section.title}</h3>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {section.prompts.map((prompt, i) => (
                    <div
                      key={i}
                      className="text-xs text-muted-foreground/70 flex items-start gap-2"
                    >
                      <Rocket className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{prompt}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Quick Stats / Inspirational */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: BarChart3, label: "Plans Generated", value: "∞", color: "text-amber-400" },
              { icon: TrendingUp, label: "Growth Ideas", value: "∞", color: "text-emerald-400" },
              { icon: Target, label: "Goals Tracked", value: "∞", color: "text-sky-400" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 p-4 rounded-lg bg-secondary/30 border border-border/30">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Chat view when a section is active
  const currentSection = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Section Header Bar */}
      <div className="px-4 py-3 border-b border-border/30 bg-secondary/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentSection && (
            <>
              <div className={`p-1.5 rounded-lg ${currentSection.bgColor}`}>
                <currentSection.icon className={`h-4 w-4 ${currentSection.color}`} />
              </div>
              <span className="text-sm font-semibold text-foreground">{currentSection.title}</span>
            </>
          )}
          {!currentSection && (
            <>
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Business Chat</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Section switcher pills */}
          <div className="flex gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  activeSection === s.id
                    ? `${s.bgColor} ${s.color} border ${s.borderColor}`
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                }`}
              >
                {s.id.slice(0, 4)}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={handleNewChat} className="h-7 text-xs text-muted-foreground">
            <X className="h-3 w-3 mr-1" /> New
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && currentSection && (
          <div className="space-y-3 max-w-lg mx-auto mt-8">
            <p className="text-sm text-muted-foreground text-center mb-4">Quick start prompts:</p>
            {currentSection.prompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className={`w-full text-left p-3 rounded-lg border ${currentSection.borderColor} ${currentSection.bgColor} hover:scale-[1.01] transition-all text-sm text-foreground`}
              >
                <Rocket className={`h-3 w-3 inline mr-2 ${currentSection.color}`} />
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 mt-1">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 border border-border/30 text-foreground"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary/50 border border-border/30 mt-1">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-secondary/50 border border-border/30 rounded-xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/30 bg-secondary/10">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${currentSection?.title.toLowerCase() || "your business"}...`}
            className="min-h-[44px] max-h-32 resize-none bg-secondary/30 border-border/30 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Business;
