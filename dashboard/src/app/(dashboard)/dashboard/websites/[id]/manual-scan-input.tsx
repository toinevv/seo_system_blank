"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Page {
  label: string;
  text: string;
}

const DEFAULT_PAGES: Page[] = [
  { label: "Homepage", text: "" },
  { label: "About / Services", text: "" },
  { label: "Additional page", text: "" },
];

export function ManualScanInput({ websiteId }: { websiteId: string }) {
  const [pages, setPages] = useState<Page[]>(DEFAULT_PAGES);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function updatePage(index: number, text: string) {
    setPages((prev) => prev.map((p, i) => (i === index ? { ...p, text } : p)));
  }

  async function handleSubmit() {
    const filled = pages.filter((p) => p.text.trim());
    if (!filled.length) {
      setErrorMsg("Paste at least one page's content.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/v1/websites/${websiteId}/analyze-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: filled }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("success");
      // Reload to show scan results
      window.location.reload();
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="text-sm text-green-600 font-medium">
        Analysis complete — reloading results…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <strong>Automatic scan blocked</strong> — your site may have bot protection enabled.
        Paste your page content below (Ctrl+A → Ctrl+C on each page) and we&apos;ll analyse it directly.
      </div>

      {pages.map((page, i) => (
        <div key={i} className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{page.label}</label>
          <Textarea
            placeholder={`Paste your ${page.label.toLowerCase()} content here…`}
            className="h-32 text-sm resize-y"
            value={page.text}
            onChange={(e) => updatePage(i, e.target.value)}
            disabled={status === "loading"}
          />
        </div>
      ))}

      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

      <Button
        onClick={handleSubmit}
        disabled={status === "loading"}
        className="w-full sm:w-auto"
      >
        {status === "loading" ? "Analysing…" : "Analyse content"}
      </Button>
    </div>
  );
}
