import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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

async function getSocialProofData() {
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
    stats: (statsResult.data as SocialProofStat[]) || [],
  };
}

// Fallback data if Supabase is not configured
const fallbackStats = [
  { id: "1", value: "500", suffix: "+", label: "Articles Generated" },
  { id: "2", value: "50", suffix: "+", label: "Keywords Ranking" },
  { id: "3", value: "10", suffix: "", label: "Websites Indexed" },
];

export async function SocialProof() {
  let websites: SocialProofWebsite[] = [];
  let stats: SocialProofStat[] = fallbackStats;

  try {
    const data = await getSocialProofData();
    websites = data.websites;
    if (data.stats.length > 0) {
      stats = data.stats;
    }
  } catch {
    // Use fallback data if Supabase fetch fails
  }

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
      </div>
    </section>
  );
}
