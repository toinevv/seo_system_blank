import { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { Footer } from "@/components/landing/footer";
import Script from "next/script";

const siteUrl = "https://indexyourniche.com";
const siteName = "IndexYourNiche";
const siteDescription = "SEO + GEO for niche builders. Connect your Supabase, get indexed on Google and AI search engines. Built for Lovable, Replit, Claude Code & Cursor projects.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "IndexYourNiche - SEO & GEO for Niche Builders",
    template: "%s | IndexYourNiche",
  },
  description: siteDescription,
  keywords: [
    "SEO for developers",
    "GEO optimization",
    "generative engine optimization",
    "Supabase SEO",
    "niche website SEO",
    "AI search optimization",
    "Lovable SEO",
    "Replit SEO",
    "Claude Code SEO",
    "Cursor SEO",
    "programmatic SEO",
    "indie hacker SEO",
    "startup SEO tools",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: siteName,
    title: "IndexYourNiche - SEO & GEO for Niche Builders",
    description: siteDescription,
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "IndexYourNiche - Get your niche project indexed and ranking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IndexYourNiche - SEO & GEO for Niche Builders",
    description: siteDescription,
    images: [`${siteUrl}/og-image.png`],
    creator: "@indexyourniche",
  },
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    // Add these when you have them:
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteName,
  description: siteDescription,
  url: siteUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "0",
    highPrice: "99",
    offerCount: "3",
  },
  // Note: Add aggregateRating once you have real reviews
  // aggregateRating: {
  //   "@type": "AggregateRating",
  //   ratingValue: "4.8",
  //   ratingCount: "50",
  // },
  featureList: [
    "Supabase/Postgres Integration",
    "Automated Content Generation",
    "GEO Optimization for AI Search",
    "Multi-site Management",
    "Topic Discovery",
  ],
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  sameAs: [
    "https://twitter.com/indexyourniche",
    // Add more social profiles when available
  ],
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-landing-bg text-landing-text">
      {/* JSON-LD Structured Data */}
      <Script
        id="json-ld-software"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Script
        id="json-ld-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* Google Analytics - Add your GA4 ID via environment variable */}
      {process.env.NEXT_PUBLIC_GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('consent', 'default', {
                'analytics_storage': 'granted'
              });
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      )}

      <LandingNav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
