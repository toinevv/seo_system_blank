"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface ScanWebsiteButtonProps {
  websiteId: string;
}

export function ScanWebsiteButton({ websiteId }: ScanWebsiteButtonProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleScan = async () => {
    setIsScanning(true);
    setStatus("idle");
    setMessage("");

    try {
      // Get the worker URL from environment or use default
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || "https://seo-content-generator.ta-voeten.workers.dev";

      const response = await fetch(`${workerUrl}/scan?website_id=${websiteId}`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && !data.error) {
        setStatus("success");
        setMessage(data.message || "Scan completed successfully");
        // Reload the page to show updated scan data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setStatus("error");
        setMessage(data.error || "Scan failed");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Failed to connect to worker");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {status === "success" && (
        <span className="text-sm text-green-600 flex items-center gap-1">
          <CheckCircle className="h-4 w-4" />
          {message}
        </span>
      )}
      {status === "error" && (
        <span className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {message}
        </span>
      )}
      <Button
        onClick={handleScan}
        disabled={isScanning}
        variant="outline"
        size="sm"
      >
        {isScanning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Scan Website
          </>
        )}
      </Button>
    </div>
  );
}
