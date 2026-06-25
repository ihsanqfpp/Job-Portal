import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Briefcase,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Menu,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
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
    return (
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
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
  const isActive =
    location.pathname === to ||
    (to !== "/" && location.pathname.startsWith(to + "/"));
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "block text-[13px] font-semibold uppercase tracking-wider transition-colors duration-300",
        isActive ? "text-primary" : "text-foreground hover:text-primary",
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const initial = (user?.email?.[0] ?? "U").toUpperCase();

  const seekerLinks = [
    { to: "/jobs", label: "Job List" },
    { to: "/companies", label: "Companies" },
    { to: "/seeker/applications", label: "Applications" },
    { to: "/seeker/saved-jobs", label: "Saved Jobs" },
  ];
  const employerLinks = [
    { to: "/jobs", label: "Browse Jobs" },
    { to: "/employer/dashboard", label: "Dashboard" },
    { to: "/employer/jobs", label: "My Jobs" },
    { to: "/employer/company", label: "Company" },
  ];
  const adminLinks = [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/jobs", label: "Jobs" },
    { to: "/admin/employers", label: "Employers" },
  ];
  const guestLinks = [
    { to: "/jobs", label: "Job List" },
    { to: "/companies", label: "Companies" },
  ];

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
      className={cn(
        "sticky top-0 z-50 w-full bg-background transition-all duration-500",
        scrolled
          ? "border-b border-border shadow-[var(--shadow-nav-val)]"
          : "border-b border-transparent",
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* ── Logo ──────────────────────────────────────────── */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 font-extrabold text-xl text-primary"
          aria-label="Hireway home"
        >
          <Briefcase className="h-5 w-5" />
          <span>Hireway</span>
        </Link>

        {/* ── Desktop nav ───────────────────────────────────── */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-7">
          <NavLink to="/">Home</NavLink>
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* ── Right actions ─────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-[2px] text-muted-foreground transition-colors hover:text-primary"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Auth */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden sm:flex items-center gap-1.5 rounded-[2px] border border-border px-2.5 py-1.5 text-sm transition-colors hover:border-primary/60"
                  aria-label="Account menu"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block max-w-[110px] truncate text-sm font-medium">
                    {user.email}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="pb-1 font-normal">
                  <span className="block text-sm font-semibold truncate">
                    {user.email}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {role ?? "—"}
                  </span>
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
                    Company Profile
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
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center rounded-[2px] border border-border px-4 py-1.5 text-[13px] font-semibold uppercase tracking-wider text-foreground transition-all duration-300 hover:border-primary hover:text-primary"
            >
              Sign In
            </Link>
          )}

          {/* Post A Job CTA */}
          <Link
            to={role === "employer" ? "/employer/jobs/new" : "/auth"}
            search={
              role === "employer"
                ? undefined
                : ({ mode: "register", role: "employer" } as never)
            }
            className="hidden sm:flex items-center rounded-[2px] bg-primary px-4 py-2 text-[13px] font-bold uppercase tracking-wider text-white transition-all duration-500 hover:bg-primary/85"
          >
            Post A Job
          </Link>

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-border lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col p-0">
              {/* Mobile header */}
              <div className="flex items-center justify-between border-b px-5 py-4">
                <Link
                  to="/"
                  className="flex items-center gap-2 font-extrabold text-lg text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  <Briefcase className="h-5 w-5" />
                  Hireway
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-[2px] text-muted-foreground hover:text-primary"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile nav */}
              <nav className="flex-1 space-y-1 overflow-y-auto px-5 py-4">
                <NavLink to="/" onClick={() => setMobileOpen(false)}>
                  Home
                </NavLink>
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              {/* Mobile footer */}
              <div className="space-y-2 border-t px-5 py-4">
                {!user ? (
                  <>
                    <Link
                      to="/auth"
                      className="block w-full rounded-[2px] bg-primary px-4 py-2.5 text-center text-sm font-bold uppercase tracking-wider text-white"
                      onClick={() => setMobileOpen(false)}
                    >
                      Post A Job
                    </Link>
                    <Link
                      to="/auth"
                      className="block w-full rounded-[2px] border border-border px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-wider transition-colors hover:border-primary hover:text-primary"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign In
                    </Link>
                  </>
                ) : (
                  <button
                    onClick={async () => {
                      await signOut();
                      setMobileOpen(false);
                      navigate({ to: "/" });
                    }}
                    className="flex w-full items-center gap-2 rounded-[2px] border border-destructive/30 px-4 py-2 text-sm text-destructive"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                )}
                <button
                  onClick={toggle}
                  className="flex w-full items-center gap-2 rounded-[2px] border border-border px-4 py-2 text-sm text-muted-foreground"
                >
                  {dark ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  {dark ? "Light mode" : "Dark mode"}
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
