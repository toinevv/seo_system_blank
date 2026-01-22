"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-landing-bg/80 backdrop-blur-md border-b border-landing-border">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-landing-accent rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-semibold">IYN</span>
            </div>
            <span className="text-sm font-medium text-landing-text">
              IndexYourNiche
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="#features"
              className="text-xs text-landing-text-muted hover:text-landing-text transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-xs text-landing-text-muted hover:text-landing-text transition-colors"
            >
              How It Works
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
              href="/docs"
              className="text-xs text-landing-text-muted hover:text-landing-text transition-colors"
            >
              Docs
            </Link>
            <Link
              href="#faq"
              className="text-xs text-landing-text-muted hover:text-landing-text transition-colors"
            >
              FAQ
            </Link>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="landing-ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="landing" size="sm">
                Start Free
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-landing-text"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-landing-border">
            <div className="flex flex-col gap-3">
              <Link
                href="#features"
                className="text-sm text-landing-text-muted hover:text-landing-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-landing-text-muted hover:text-landing-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="#pricing"
                className="text-sm text-landing-text-muted hover:text-landing-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/blog"
                className="text-sm text-landing-text-muted hover:text-landing-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <Link
                href="/docs"
                className="text-sm text-landing-text-muted hover:text-landing-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                Docs
              </Link>
              <Link
                href="#faq"
                className="text-sm text-landing-text-muted hover:text-landing-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <div className="flex gap-2 pt-2">
                <Link href="/login" className="flex-1">
                  <Button variant="landing-outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup" className="flex-1">
                  <Button variant="landing" size="sm" className="w-full">
                    Start Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
