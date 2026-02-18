import { Metadata } from "next";
import Script from "next/script";
import { PricingTable } from "@/components/landing/pricing-table";
import { FAQ } from "@/components/landing/faq";
import { CTASection } from "@/components/landing/cta-section";

const siteUrl = "https://indexyourniche.com";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for SEO & GEO content generation. Start free with 5 articles/month, scale to unlimited. Built for indie hackers and niche builders.",
  openGraph: {
    title: "Pricing | IndexYourNiche",
    description: "Simple, transparent pricing for SEO & GEO content generation. Start free, scale as you grow.",
    type: "website",
    url: `${siteUrl}/pricing`,
  },
  alternates: {
    canonical: `${siteUrl}/pricing`,
  },
};

// Pricing JSON-LD for rich snippets
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "IndexYourNiche SEO Platform",
  description: "Automated SEO & GEO content generation for niche websites",
  brand: {
    "@type": "Brand",
    name: "IndexYourNiche",
  },
  offers: [
    {
      "@type": "Offer",
      name: "Free Plan",
      price: "0",
      priceCurrency: "USD",
      description: "5 articles per month, 1 website",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Builder Plan",
      price: "29",
      priceCurrency: "USD",
      description: "50 articles per month, 3 websites, partner backlinks",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Scale Plan",
      price: "99",
      priceCurrency: "USD",
      description: "Unlimited articles, unlimited websites, priority support",
      availability: "https://schema.org/InStock",
    },
  ],
};

export default function PricingPage() {
  return (
    <>
      <Script
        id="pricing-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <div className="pt-14">
        <PricingTable />
        <FAQ />
        <CTASection />
      </div>
    </>
  );
}
