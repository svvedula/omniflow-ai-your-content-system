import {
  Code2, Sparkles, Briefcase, LayoutGrid, Zap, Lock,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const modes = [
  { title: "Creator Mode", url: "/", icon: Sparkles, active: true },
  { title: "Developer Mode", url: "/developer", icon: Code2, active: true },
  { title: "Business Mode", url: "#", icon: Briefcase, active: false },
  { title: "Workspace Mode", url: "#", icon: LayoutGrid, active: false },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground">OmniFlow AI</h1>
              <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">AI Workspace</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground/60">
            Modes
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modes.map((mode) => (
                <SidebarMenuItem key={mode.title}>
                  <SidebarMenuButton
                    asChild={mode.active}
                    className={
                      mode.active
                        ? ""
                        : "opacity-40 cursor-not-allowed"
                    }
                  >
                    {mode.active ? (
                      <NavLink
                        to={mode.url}
                        end
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-primary/10 text-primary border border-primary/20"
                      >
                        <mode.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{mode.title}</span>}
                      </NavLink>
                    ) : (
                      <div className="flex items-center gap-2 w-full">
                        <mode.icon className="mr-2 h-4 w-4" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{mode.title}</span>
                            <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-muted-foreground/50">
                              <Lock className="h-2.5 w-2.5" />
                              Soon
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground/40 font-mono text-center">
            v0.1.0 — MVP
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
