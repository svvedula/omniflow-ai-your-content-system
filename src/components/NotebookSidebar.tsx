import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Pin, MessageSquare, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type PinnedMsg = { id: string; content: string; role: string; created_at: string };
type RecentSession = { id: string; title: string; mode: string; updated_at: string };

export function NotebookPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [pinned, setPinned] = useState<PinnedMsg[]>([]);
  const [sessions, setSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    if (!user || !open) return;
    const load = async () => {
      const [p, s] = await Promise.all([
        supabase.from("chat_messages").select("id, content, role, created_at").eq("is_pinned", true).order("created_at", { ascending: false }).limit(10),
        supabase.from("chat_sessions").select("id, title, mode, updated_at").order("updated_at", { ascending: false }).limit(10),
      ]);
      if (p.data) setPinned(p.data as PinnedMsg[]);
      if (s.data) setSessions(s.data as RecentSession[]);
    };
    load();
  }, [user, open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[360px] bg-card border-l border-border/50 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Notebook</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {/* Pinned Messages */}
                <div>
                  <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1.5">
                    <Pin className="h-3 w-3" /> Pinned Messages
                  </h3>
                  {pinned.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 italic">No pinned messages</p>
                  ) : (
                    <div className="space-y-2">
                      {pinned.map((msg) => (
                        <div key={msg.id} className="glass rounded-lg p-3 border-l-2 border-l-primary/40">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">{msg.role}</Badge>
                            <span className="text-[9px] text-muted-foreground">{format(new Date(msg.created_at), "MMM d")}</span>
                          </div>
                          <p className="text-xs text-foreground/80 line-clamp-2">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Sessions */}
                <div>
                  <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3" /> Recent Sessions
                  </h3>
                  {sessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 italic">No sessions yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {sessions.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{s.title}</p>
                            <span className="text-[9px] text-muted-foreground">{s.mode} · {format(new Date(s.updated_at), "MMM d")}</span>
                          </div>
                          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border/30">
              <a href="/notebook" className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline">
                Open full notebook <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
