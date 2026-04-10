import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotebookPanel } from "@/components/NotebookSidebar";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [notebookOpen, setNotebookOpen] = useState(false);
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border/50 px-2 shrink-0 justify-between">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            {user && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={() => setNotebookOpen(true)}>
                <BookOpen className="h-3.5 w-3.5" />
                Notebook
              </Button>
            )}
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <NotebookPanel open={notebookOpen} onClose={() => setNotebookOpen(false)} />
    </SidebarProvider>
  );
}
