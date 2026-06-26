import { useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";
import {
  LayoutDashboard,
  FileSearch,
  Sparkles,
  Bot,
  KanbanSquare,
  FileBarChart,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  User,
  Sun,
  Moon,
  Briefcase,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

const menuItems = [
  { label: "Dashboard",       to: "/dashboard",              icon: LayoutDashboard },
  { label: "Resume Analyzer", to: "/seeker/resume-analyzer", icon: FileSearch },
  { label: "Job Matches",     to: "/seeker/job-matches",     icon: Sparkles },
  { label: "AI Coach",        to: "/seeker/coach",           icon: Bot },
  { label: "Job Tracker",     to: "/seeker/tracker",         icon: KanbanSquare },
  { label: "Reports",         to: "/seeker/reports",         icon: FileBarChart },
  { label: "Settings",        to: "/seeker/settings",        icon: Settings },
];

export function AppShell({ children }: AppShellProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* Sync with Navbar's dark mode preference */
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });
  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const notifications = useQuery({
    queryKey: ["app-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: apps } = await supabase
        .from("applications")
        .select("id, status, applied_at, jobs(title, companies(name))")
        .eq("applicant_id", user!.id)
        .order("applied_at", { ascending: false })
        .limit(4);
      return (apps || []).map((a: any) => {
        const title = a.jobs?.title || "Position";
        const company = a.jobs?.companies?.name || "Company";
        const msgs: Record<string, string> = {
          reviewed: `Your application for ${title} at ${company} is under review.`,
          hired:    `Congratulations! You were hired for ${title} at ${company}!`,
          rejected: `Your application for ${title} at ${company} was reviewed.`,
          pending:  `You applied to ${title} at ${company}.`,
        };
        return {
          id: a.id,
          description: msgs[a.status] ?? `Application update for ${title}.`,
          timestamp: a.applied_at,
          status: a.status,
        };
      });
    },
  });

  const p = profile.data;
  const initial = (p?.full_name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();
  const notifs = notifications.data ?? [];
  const unreadCount = notifs.length;

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth" });
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("flex flex-col h-full", mobile ? "w-72" : "w-64")}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Briefcase className="h-4 w-4" />
        </span>
        <span className="font-bold text-base tracking-tight">Hireway</span>
        {mobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            className="ml-auto h-8 w-8"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active =
            location.pathname === item.to ||
            (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={p?.avatar_url ?? ""} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{p?.full_name ?? user?.email}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-surface-0">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col shrink-0 border-r bg-sidebar sticky top-0 h-screen">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div
            className="absolute inset-y-0 left-0 bg-sidebar border-r shadow-xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="hidden md:block text-sm font-medium text-muted-foreground">
              {menuItems.find((item) => location.pathname === item.to)?.label ?? ""}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-primary rounded-full ring-2 ring-background" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="info" className="text-[10px] py-0 h-4 px-1.5">
                      {unreadCount}
                    </Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifs.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No notifications yet.
                  </p>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifs.map((n) => (
                      <div key={n.id} className="px-4 py-3 hover:bg-muted/40 transition-colors">
                        <p className="text-xs leading-relaxed text-foreground">{n.description}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.timestamp)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-full p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/50 transition-colors">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={p?.avatar_url ?? ""} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold truncate">{p?.full_name ?? user?.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/seeker/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" /> Profile settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/seeker/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" /> App settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
