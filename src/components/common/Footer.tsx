import { Link } from "@tanstack/react-router";
import { Briefcase, MapPin, Phone, Mail, ArrowRight, Send } from "lucide-react";
import { useState } from "react";

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function Footer() {
  const [email, setEmail] = useState("");
  const year = new Date().getFullYear();

  const companyLinks = [
    { label: "About Us", to: "/companies" },
    { label: "Browse Jobs", to: "/jobs" },
    { label: "All Companies", to: "/companies" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms of Service", to: "/terms" },
  ];

  const quickLinks = [
    { label: "For Job Seekers", to: "/auth" },
    { label: "Post A Job", to: "/auth" },
    { label: "Employer Dashboard", to: "/employer/dashboard" },
    { label: "Job Matches", to: "/seeker/job-matches" },
    { label: "AI Resume Analyzer", to: "/seeker/resume-analyzer" },
  ];

  const socials = [
    { Icon: TwitterIcon, label: "Twitter" },
    { Icon: LinkedInIcon, label: "LinkedIn" },
    { Icon: FacebookIcon, label: "Facebook" },
    { Icon: YoutubeIcon, label: "YouTube" },
  ];

  return (
    <footer style={{ backgroundColor: "#2b3940" }} className="text-white/80">
      {/* ── Main grid ─────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Col 1: Brand + socials */}
          <div>
            <Link
              to="/"
              className="mb-5 flex items-center gap-2 text-xl font-extrabold text-white"
            >
              <Briefcase className="h-6 w-6 text-primary" />
              Hireway
            </Link>
            <p className="mb-6 text-sm leading-relaxed text-white/55">
              Connecting talented professionals with great companies across
              every industry and region.
            </p>
            <div className="flex items-center gap-2">
              {socials.map(({ Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-white/20 text-white/55 transition-all duration-300 hover:border-primary hover:bg-primary hover:text-white"
                >
                  <Icon />
                </button>
              ))}
            </div>
          </div>

          {/* Col 2: Company */}
          <div>
            <h5 className="mb-5 text-sm font-extrabold uppercase tracking-wider text-white">
              Company
            </h5>
            <ul className="space-y-3">
              {companyLinks.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-sm text-white/55 transition-all duration-300 hover:text-primary hover:tracking-wide"
                  >
                    <ArrowRight className="h-3 w-3 shrink-0 text-primary" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Quick Links */}
          <div>
            <h5 className="mb-5 text-sm font-extrabold uppercase tracking-wider text-white">
              Quick Links
            </h5>
            <ul className="space-y-3">
              {quickLinks.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-sm text-white/55 transition-all duration-300 hover:text-primary hover:tracking-wide"
                  >
                    <ArrowRight className="h-3 w-3 shrink-0 text-primary" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact + Newsletter */}
          <div>
            <h5 className="mb-5 text-sm font-extrabold uppercase tracking-wider text-white">
              Contact
            </h5>
            <ul className="mb-6 space-y-4">
              <li className="flex items-start gap-3 text-sm text-white/55">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>123 Talent Street, Tech City, CA 90210</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-white/55">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>+1 234 567 8901</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-white/55">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span>hello@hireway.io</span>
              </li>
            </ul>

            <h6 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/80">
              Newsletter
            </h6>
            <div className="flex">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email..."
                className="min-w-0 flex-1 rounded-l-[2px] border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setEmail("")}
                aria-label="Subscribe to newsletter"
                className="flex items-center justify-center rounded-r-[2px] bg-primary px-3 py-2 text-white transition-colors hover:bg-primary/85"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────── */}
      <div className="border-t border-white/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row">
          <p className="text-xs text-white/40">
            © {year} Hireway. All rights reserved.
          </p>
          <div className="flex items-center text-xs text-white/40">
            {[
              { label: "Home", to: "/" },
              { label: "Cookies", to: "/privacy" },
              { label: "Help", to: "/terms" },
              { label: "FAQs", to: "/jobs" },
            ].map(({ label, to }, i) => (
              <span key={label} className="flex items-center">
                {i > 0 && <span className="mx-2 text-white/20">|</span>}
                <Link
                  to={to}
                  className="transition-colors hover:text-primary"
                >
                  {label}
                </Link>
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
