import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-landing-border">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-landing-accent rounded-sm flex items-center justify-center">
              <span className="text-white text-[10px] font-semibold">IYN</span>
            </div>
            <span className="text-xs text-landing-text-muted">
              Built for builders, by builders
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="#features"
              className="text-xs text-landing-text-muted hover:text-landing-text transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-xs text-landing-text-muted hover:text-landing-text transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="text-xs text-landing-text-muted hover:text-landing-text transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="text-xs text-landing-text-muted hover:text-landing-text transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="text-xs text-landing-text-muted hover:text-landing-text transition-colors"
            >
              Sign Up
            </Link>
          </div>

          {/* Legal */}
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-xs text-landing-text-muted/70 hover:text-landing-text-muted transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-landing-text-muted/70 hover:text-landing-text-muted transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-4 border-t border-landing-border">
          <p className="text-[10px] text-landing-text-muted/50 text-center">
            &copy; {new Date().getFullYear()} IndexYourNiche. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
