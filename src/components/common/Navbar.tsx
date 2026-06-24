import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Briefcase, LogOut, Menu, Moon, Sun, User as UserIcon, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    return stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }
  return { dark, toggle };
}

function NavLink({
  to,
  children,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const location = useRouterState({ select: (s) => s.location });
  const isActive = location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "text-sm font-medium transition-colors px-1 py-0.5",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { dark, toggle } = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const location = useRouterState({ select: (s) => s.location });
  // Don't show the compact navbar search on the landing page (it has its own hero search)
  const showNavSearch = location.pathname !== "/";

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQ.trim()) {
      navigate({ to: "/jobs", search: { q: searchQ } as never });
      setSearchQ("");
      searchRef.current?.blur();
    }
  }

  const initial = (user?.email?.[0] ?? "U").toUpperCase();

  /* Role-aware navigation links */
  const seekerLinks = (
    <>
      <NavLink to="/jobs" onClick={() => setMobileOpen(false)}>Browse jobs</NavLink>
      <NavLink to="/companies" onClick={() => setMobileOpen(false)}>Companies</NavLink>
      <NavLink to="/seeker/applications" onClick={() => setMobileOpen(false)}>Applications</NavLink>
      <NavLink to="/seeker/saved-jobs" onClick={() => setMobileOpen(false)}>Saved</NavLink>
    </>
  );

  const employerLinks = (
    <>
      <NavLink to="/jobs" onClick={() => setMobileOpen(false)}>Jobs</NavLink>
      <NavLink to="/employer/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</NavLink>
      <NavLink to="/employer/jobs" onClick={() => setMobileOpen(false)}>My jobs</NavLink>
      <NavLink to="/employer/company" onClick={() => setMobileOpen(false)}>Company</NavLink>
    </>
  );

  const adminLinks = (
    <>
      <NavLink to="/admin/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</NavLink>
      <NavLink to="/admin/employers" onClick={() => setMobileOpen(false)}>Employers</NavLink>
      <NavLink to="/admin/users" onClick={() => setMobileOpen(false)}>Users</NavLink>
      <NavLink to="/admin/jobs" onClick={() => setMobileOpen(false)}>Jobs</NavLink>
    </>
  );

  const guestLinks = (
    <>
      <NavLink to="/jobs" onClick={() => setMobileOpen(false)}>Browse jobs</NavLink>
      <NavLink to="/companies" onClick={() => setMobileOpen(false)}>Companies</NavLink>
    </>
  );

  const navLinks =
    role === "seeker"
      ? seekerLinks
      : role === "employer"
        ? employerLinks
        : role === "admin"
          ? adminLinks
          : guestLinks;

  return (
    <header
      className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm"
      style={{ boxShadow: "var(--shadow-nav-val)" }}
    >
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {/* ── Logo ─────────────────────────────────────────────── */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 font-bold text-lg tracking-tight mr-2"
          aria-label="Hireway home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Briefcase className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">Hireway</span>
        </Link>

        {/* ── Compact search (hidden on landing & mobile) ─────── */}
        {showNavSearch && (
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-sm items-center relative"
          >
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchRef}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search jobs…"
              className="pl-9 pr-3 h-9 bg-muted/50 border-transparent focus:border-border focus:bg-background transition-colors"
            />
          </form>
        )}

        {/* ── Primary nav links ─────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-5 flex-1 justify-end mr-4">
          {navLinks}
        </nav>

        {/* ── Right actions ────────────────────────────────────── */}
        <div className="flex items-center gap-1 ml-auto md:ml-0">
          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="h-9 w-9 rounded-full"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-1 flex items-center gap-2 rounded-full p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity hover:opacity-90"
                  aria-label="Account menu"
                >
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-semibold truncate">
                    {user.email}
                  </div>
                  <div className="text-xs text-muted-foreground truncate capitalize mt-0.5">
                    {role ?? "—"}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {role === "seeker" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => navigate({ to: "/seeker/profile" })}
                    >
                      <UserIcon className="mr-2 h-4 w-4" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate({ to: "/dashboard" })}
                    >
                      Dashboard
                    </DropdownMenuItem>
                  </>
                )}
                {role === "employer" && (
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/employer/company" })}
                  >
                    Company profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/" });
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth" search={{ mode: "register" } as never}>
                  Get started
                </Link>
              </Button>
            </div>
          )}

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 rounded-full"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 flex flex-col p-0">
              {/* Mobile header */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <Link
                  to="/"
                  className="flex items-center gap-2 font-bold"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                  </span>
                  Hireway
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile search */}
              <div className="px-5 py-3 border-b">
                <form
                  onSubmit={(e) => {
                    handleSearch(e);
                    setMobileOpen(false);
                  }}
                  className="relative"
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search jobs…"
                    className="pl-9 h-9"
                  />
                </form>
              </div>

              {/* Mobile nav */}
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navLinks}
              </nav>

              {/* Mobile footer actions */}
              <div className="px-5 py-4 border-t space-y-2">
                {!user && (
                  <>
                    <Button className="w-full" asChild>
                      <Link to="/auth" onClick={() => setMobileOpen(false)}>
                        Sign in
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <Link
                        to="/auth"
                        search={{ mode: "register" } as never}
                        onClick={() => setMobileOpen(false)}
                      >
                        Create account
                      </Link>
                    </Button>
                  </>
                )}
                {user && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={async () => {
                      await signOut();
                      setMobileOpen(false);
                      navigate({ to: "/" });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggle}
                  className="w-full justify-start"
                >
                  {dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {dark ? "Light mode" : "Dark mode"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
