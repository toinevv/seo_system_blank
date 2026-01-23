"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface ScanWebsiteButtonProps {
  websiteId: string;
  hasScan?: boolean;
}

export function ScanWebsiteButton({ websiteId, hasScan: initialHasScan }: ScanWebsiteButtonProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [hasScan, setHasScan] = useState(initialHasScan ?? false);

  // Check if scan exists on mount (if not provided via prop)
  useEffect(() => {
    if (initialHasScan !== undefined) return;

    const checkScanStatus = async () => {
      try {
        const response = await fetch(`/api/v1/websites/${websiteId}/scan`);
        if (response.ok) {
          const data = await response.json();
          setHasScan(data.data?.has_scan ?? false);
        }
      } catch {
        // Ignore errors - default to false
      }
    };

    checkScanStatus();
  }, [websiteId, initialHasScan]);

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
        setHasScan(true); // Mark that we now have a scan
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
        ) : hasScan ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Scan
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
