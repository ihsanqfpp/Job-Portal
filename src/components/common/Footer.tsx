import { Link } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

const COLS = [
  {
    title: "For job seekers",
    links: [
      { label: "Browse jobs", to: "/jobs" },
      { label: "Companies", to: "/companies" },
      { label: "Create account", to: "/auth?mode=register&role=seeker" },
    ],
  },
  {
    title: "For employers",
    links: [
      { label: "Post a job", to: "/auth?mode=register&role=employer" },
      { label: "Employer dashboard", to: "/employer/dashboard" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
    ],
  },
];

const SOCIAL = [
  { label: "LinkedIn", href: "https://linkedin.com", Icon: LinkedinIcon },
  { label: "Twitter / X", href: "https://x.com", Icon: TwitterIcon },
  { label: "GitHub", href: "https://github.com", Icon: GithubIcon },
];

export function Footer() {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1fr_repeat(3,auto)]">
          {/* Brand column */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 font-bold text-base">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Briefcase className="h-4 w-4" />
              </span>
              Hireway
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The modern job marketplace connecting great people with great companies.
            </p>
            <div className="flex items-center gap-3">
              {SOCIAL.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.title} className="space-y-3">
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.to}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Hireway. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
