import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SessionMode = "creator" | "developer";

export function useSession() {
  const { user } = useAuth();

  const createSession = useCallback(
    async (mode: SessionMode, title: string) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({ user_id: user.id, mode, title })
        .select("id")
        .single();
      if (error) {
        console.error("Failed to create session:", error);
        return null;
      }
      return data.id as string;
    },
    [user]
  );

  const saveMessage = useCallback(
    async (sessionId: string, role: string, content: string) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({ user_id: user.id, session_id: sessionId, role, content })
        .select("id")
        .single();
      if (error) {
        console.error("Failed to save message:", error);
        return null;
      }
      return data.id as string;
    },
    [user]
  );

  const loadSession = useCallback(
    async (sessionId: string) => {
      const [sessionRes, messagesRes] = await Promise.all([
        supabase.from("chat_sessions").select("*").eq("id", sessionId).single(),
        supabase
          .from("chat_messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true }),
      ]);
      return {
        session: sessionRes.data,
        messages: messagesRes.data || [],
      };
    },
    []
  );

  const updateSessionTitle = useCallback(
    async (sessionId: string, title: string) => {
      await supabase
        .from("chat_sessions")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    },
    []
  );

  const listSessions = useCallback(
    async (mode: SessionMode) => {
      if (!user) return [];
      const { data } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("mode", mode)
        .order("updated_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    [user]
  );

  return { createSession, saveMessage, loadSession, updateSessionTitle, listSessions };
}
