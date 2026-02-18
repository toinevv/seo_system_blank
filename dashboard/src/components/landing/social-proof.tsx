import { ExternalLink } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

interface SocialProofWebsite {
  id: string;
  name: string;
  domain: string;
  logo_url: string | null;
}

interface SocialProofStat {
  id: string;
  label: string;
  value: string;
  suffix: string;
}

// Fallback data if Supabase is not configured
const fallbackStats: SocialProofStat[] = [
  { id: "1", value: "500", suffix: "+", label: "Articles Generated" },
  { id: "2", value: "50", suffix: "+", label: "Keywords Ranking" },
  { id: "3", value: "10", suffix: "", label: "Websites Indexed" },
];

async function getSocialProofData(): Promise<{
  websites: SocialProofWebsite[];
  stats: SocialProofStat[];
}> {
  // Skip during build time when env vars aren't available
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { websites: [], stats: fallbackStats };
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const [websitesResult, statsResult] = await Promise.all([
      supabase
        .from("social_proof_websites")
        .select("id, name, domain, logo_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("social_proof_stats")
        .select("id, label, value, suffix")
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
    ]);

    return {
      websites: (websitesResult.data as SocialProofWebsite[]) || [],
      stats: statsResult.data?.length ? (statsResult.data as SocialProofStat[]) : fallbackStats,
    };
  } catch {
    return { websites: [], stats: fallbackStats };
  }
}

export async function SocialProof() {
  noStore(); // Ensure this is always dynamic at runtime

  const { websites, stats } = await getSocialProofData();

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Section Label */}
        <p className="text-xs uppercase tracking-widest text-landing-text-muted text-center mb-3">
          Trusted By
        </p>

        {/* Section Title */}
        <h2 className="text-xl md:text-2xl font-medium text-landing-text text-center mb-8">
          Already Ranking
        </h2>

        {/* Logo Bar - Only show if we have websites */}
        {websites.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
            {websites.map((site) => (
              <a
                key={site.id}
                href={`https://${site.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-landing-card border border-landing-border rounded-md hover:bg-landing-card-hover transition-colors"
              >
                {site.logo_url ? (
                  <img
                    src={site.logo_url}
                    alt={site.name}
                    className="w-4 h-4 rounded-sm object-contain"
                  />
                ) : (
                  <div className="w-4 h-4 bg-landing-accent/20 rounded-sm flex items-center justify-center">
                    <span className="text-[8px] font-semibold text-landing-accent">
                      {site.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-xs text-landing-text-muted font-mono">
                  {site.domain}
                </span>
                <ExternalLink size={10} className="text-landing-text-muted/50" />
              </a>
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="text-center p-4 bg-landing-card border border-landing-border rounded-md"
            >
              <p className="text-2xl font-semibold text-landing-accent font-mono mb-1">
                {stat.value}
                {stat.suffix}
              </p>
              <p className="text-xs text-landing-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Integrations */}
        <div className="mt-10 pt-8 border-t border-landing-border">
          <p className="text-xs uppercase tracking-widest text-landing-text-muted text-center mb-4">
            Integrates With
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-2xl mx-auto">
            {/* Supabase */}
            <Link
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-3 bg-landing-card border border-landing-border rounded-md hover:border-landing-accent/30 hover:bg-landing-card-hover transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 109 113" fill="none">
                <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint0_linear)" />
                <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint1_linear)" fillOpacity="0.2" />
                <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="#3ECF8E" />
                <defs>
                  <linearGradient id="paint0_linear" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#249361" />
                    <stop offset="1" stopColor="#3ECF8E" />
                  </linearGradient>
                  <linearGradient id="paint1_linear" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse">
                    <stop />
                    <stop offset="1" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-sm text-landing-text group-hover:text-landing-accent transition-colors">
                Supabase
              </span>
            </Link>

            {/* Vercel */}
            <Link
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-3 bg-landing-card border border-landing-border rounded-md hover:border-landing-accent/30 hover:bg-landing-card-hover transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 76 65" fill="currentColor">
                <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
              </svg>
              <span className="text-sm text-landing-text group-hover:text-landing-accent transition-colors">
                Vercel
              </span>
            </Link>

            {/* Cloudflare */}
            <Link
              href="https://cloudflare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-3 bg-landing-card border border-landing-border rounded-md hover:border-landing-accent/30 hover:bg-landing-card-hover transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 65 65" fill="none">
                <path d="M43.6 43.8H21.3c-.4 0-.7-.2-.8-.5-.1-.3 0-.7.3-.9l7-5.7c.2-.1.4-.2.6-.2h11.7c.9 0 1.7-.6 1.9-1.5l1.8-6.8c.1-.4.1-.8-.1-1.2-.2-.3-.5-.6-.9-.7l-5.5-1.6c-.4-.1-.6-.5-.5-.9.1-.4.5-.6.9-.5l5.5 1.6c.8.2 1.4.7 1.8 1.4.4.7.5 1.5.3 2.3l-1.8 6.8c-.4 1.6-1.9 2.8-3.6 2.8H29.1l-4.3 3.5h18.8c.5 0 .9.4.9.9s-.4 1.1-.9 1.2z" fill="#F6821F"/>
                <path d="M48.5 43.8H43c-.5 0-.9-.4-.9-.9s.4-.9.9-.9h5.5c1.6 0 3-1.1 3.4-2.7l1.3-5c.1-.4.1-.8-.1-1.1-.2-.3-.5-.6-.8-.7L35 26.2c-.4-.1-.6-.5-.5-.9.1-.4.5-.6.9-.5l17.3 6.3c.7.3 1.3.8 1.6 1.4.3.7.4 1.4.2 2.1l-1.3 5c-.6 2.5-2.9 4.2-5.7 4.2z" fill="#FBAD41"/>
              </svg>
              <span className="text-sm text-landing-text group-hover:text-landing-accent transition-colors">
                Cloudflare
              </span>
            </Link>

            {/* Netlify */}
            <Link
              href="https://netlify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-3 bg-landing-card border border-landing-border rounded-md hover:border-landing-accent/30 hover:bg-landing-card-hover transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 256 256" fill="none">
                <path d="M170.3 87.7l-45.4-45.4c-1.1-1.1-2.9-1.1-4 0l-45.4 45.4c-1.1 1.1-1.1 2.9 0 4l45.4 45.4c1.1 1.1 2.9 1.1 4 0l45.4-45.4c1.1-1.1 1.1-2.9 0-4z" fill="#05BDBA"/>
                <path d="M127.9 137.1l45.4 45.4c1.1 1.1 1.1 2.9 0 4l-45.4 45.4c-1.1 1.1-2.9 1.1-4 0l-45.4-45.4c-1.1-1.1-1.1-2.9 0-4l45.4-45.4c1.1-1.1 2.9-1.1 4 0z" fill="#014847"/>
              </svg>
              <span className="text-sm text-landing-text group-hover:text-landing-accent transition-colors">
                Netlify
              </span>
            </Link>
          </div>
          <p className="text-xs text-landing-text-muted text-center mt-4">
            Works with any Postgres database • Deploy anywhere
          </p>
        </div>
      </div>
    </section>
  );
}
