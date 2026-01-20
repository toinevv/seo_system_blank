"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is GEO (Generative Engine Optimization)?",
    answer:
      "GEO is optimization for AI search engines like ChatGPT, Perplexity, and Claude. These tools often cite sources when answering questions. GEO ensures your content is structured so AI can understand and cite it, getting you traffic from AI-powered search.",
  },
  {
    question: "How does it connect to my Supabase database?",
    answer:
      "You provide read-only database credentials. We scan your tables to understand your content structure (products, articles, pages, etc.) and use that data to generate relevant SEO content. Your data stays secure — we only read, never write to your database.",
  },
  {
    question: "Do I need to write content myself?",
    answer:
      "No. Our AI analyzes your product data and generates SEO-optimized articles automatically. You can review and approve content before publishing, or set it to auto-publish. You can also provide your own content to optimize.",
  },
  {
    question: "What AI models do you use?",
    answer:
      "We use a combination of OpenAI GPT-4 and Claude for content generation. You can also bring your own API keys if you prefer to use your own accounts or have specific model preferences.",
  },
  {
    question: "Can I use my own API keys?",
    answer:
      "Yes! Pro and Agency plans let you configure your own OpenAI or Anthropic API keys. This gives you more control over costs and lets you use your preferred models. Keys are encrypted and stored securely.",
  },
  {
    question: "How long until I see ranking results?",
    answer:
      "SEO is a long game, but you'll typically see indexing within days and ranking improvements within 2-4 weeks for low-competition keywords. GEO results can be faster since AI search engines update more frequently than Google.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 px-4 scroll-mt-16">
      <div className="max-w-2xl mx-auto">
        {/* Section Label */}
        <p className="text-xs uppercase tracking-widest text-landing-text-muted text-center mb-3">
          FAQ
        </p>

        {/* Section Title */}
        <h2 className="text-xl md:text-2xl font-medium text-landing-text text-center mb-10">
          Frequently Asked Questions
        </h2>

        {/* FAQ Items */}
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-landing-border rounded-md overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between p-4 text-left bg-landing-card hover:bg-landing-card-hover transition-colors"
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
              >
                <span className="text-sm font-medium text-landing-text pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-landing-text-muted transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4 bg-landing-card">
                  <p className="text-xs text-landing-text-muted leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
