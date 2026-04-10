import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  BookOpen, Pin, MessageSquare, Search, Plus, Tag, Trash2, Clock, Sparkles, Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const NOTE_COLORS = ["cyan", "purple", "amber", "emerald", "rose"];
const COLOR_MAP: Record<string, string> = {
  cyan: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30",
  purple: "from-purple-500/20 to-indigo-500/10 border-purple-500/30",
  amber: "from-amber-500/20 to-orange-500/10 border-amber-500/30",
  emerald: "from-emerald-500/20 to-green-500/10 border-emerald-500/30",
  rose: "from-rose-500/20 to-pink-500/10 border-rose-500/30",
};

type Session = { id: string; title: string; mode: string; tags: string[]; created_at: string; updated_at: string };
type Note = { id: string; title: string; content: string; color: string; tags: string[]; session_id: string | null; created_at: string };
type PinnedMessage = { id: string; content: string; role: string; highlight_color: string | null; created_at: string; session_id: string };

const Notebook = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [search, setSearch] = useState("");
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", content: "", color: "cyan" });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const [sessionsRes, notesRes, pinnedRes] = await Promise.all([
      supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false }),
      supabase.from("notebook_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("chat_messages").select("*").eq("is_pinned", true).order("created_at", { ascending: false }),
    ]);
    if (sessionsRes.data) setSessions(sessionsRes.data as Session[]);
    if (notesRes.data) setNotes(notesRes.data as Note[]);
    if (pinnedRes.data) setPinnedMessages(pinnedRes.data as PinnedMessage[]);
  };

  const createNote = async () => {
    if (!user || !newNote.title.trim()) return;
    const { error } = await supabase.from("notebook_notes").insert({
      user_id: user.id,
      title: newNote.title,
      content: newNote.content,
      color: newNote.color,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setNewNote({ title: "", content: "", color: "cyan" });
    setNewNoteOpen(false);
    loadData();
    toast({ title: "Note created ✨" });
  };

  const deleteNote = async (id: string) => {
    await supabase.from("notebook_notes").delete().eq("id", id);
    loadData();
  };

  const deleteSession = async (id: string) => {
    await supabase.from("chat_sessions").delete().eq("id", id);
    loadData();
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );
  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please sign in to access your notebook.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Notebook
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your AI-powered digital journal</p>
        </div>
        <Button variant="glow" size="sm" onClick={() => setNewNoteOpen(!newNoteOpen)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </motion.div>

      {/* New Note Form */}
      <AnimatePresence>
        {newNoteOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-xl p-5 space-y-4">
              <Input placeholder="Note title..." value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} className="text-base font-medium" />
              <Textarea placeholder="Write your thoughts..." value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })} className="min-h-[80px]" />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewNote({ ...newNote, color: c })}
                      className={`h-6 w-6 rounded-full bg-gradient-to-br ${COLOR_MAP[c]} border-2 transition-transform ${
                        newNote.color === c ? "scale-125 ring-2 ring-primary" : "hover:scale-110"
                      }`}
                    />
                  ))}
                </div>
                <Button size="sm" onClick={createNote}>Save Note</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search sessions, notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="sessions" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Sessions</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5"><Tag className="h-3.5 w-3.5" />Notes</TabsTrigger>
          <TabsTrigger value="pinned" className="gap-1.5"><Pin className="h-3.5 w-3.5" />Pinned</TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No chat sessions yet. Start chatting in Creator or Developer mode!</p>
            </div>
          ) : (
            filteredSessions.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-4 flex items-center justify-between group hover:glow-border transition-all duration-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                    session.mode === "developer" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-primary/10 border border-primary/20"
                  }`}>
                    {session.mode === "developer" ? <Code2 className="h-4 w-4 text-emerald-400" /> : <Sparkles className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{session.mode}</Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {format(new Date(session.updated_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7 text-destructive" onClick={() => deleteSession(session.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredNotes.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-muted-foreground">
                <Tag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No notes yet. Create one above!</p>
              </div>
            ) : (
              filteredNotes.map((note, i) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-xl p-4 border bg-gradient-to-br ${COLOR_MAP[note.color] || COLOR_MAP.cyan} group hover:shadow-lg transition-all duration-300`}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{note.title}</h3>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive" onClick={() => deleteNote(note.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{note.content}</p>
                  <span className="text-[10px] text-muted-foreground/60 mt-3 block">
                    {format(new Date(note.created_at), "MMM d, yyyy")}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Pinned Tab */}
        <TabsContent value="pinned" className="space-y-3">
          {pinnedMessages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Pin className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No pinned messages yet. Pin important messages from your chats!</p>
            </div>
          ) : (
            pinnedMessages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-4 border-l-4 border-l-primary/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Pin className="h-3 w-3 text-primary" />
                  <Badge variant="secondary" className="text-[10px]">{msg.role}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(msg.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-4">{msg.content}</p>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notebook;
