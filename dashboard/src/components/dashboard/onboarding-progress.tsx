"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface OnboardingProgressProps {
  websiteId: string;
  onComplete?: () => void;
}

type OnboardingStatus =
  | "not_started"
  | "scanning"
  | "discovering"
  | "generating"
  | "complete"
  | "failed";

interface OnboardingState {
  website_id: string;
  status: OnboardingStatus;
  scan_complete?: boolean;
  topics_count?: number;
  articles_generated?: number;
  error?: string;
  message?: string;
}

const steps = [
  {
    key: "scanning" as const,
    label: "Scanning Website",
    description: "Analyzing your website content and themes",
  },
  {
    key: "discovering" as const,
    label: "Discovering Topics",
    description: "Generating SEO-optimized topic ideas",
  },
  {
    key: "generating" as const,
    label: "Creating Content",
    description: "Generating your first article",
  },
  {
    key: "complete" as const,
    label: "Ready!",
    description: "Your SEO system is fully configured",
  },
];

export function OnboardingProgress({ websiteId, onComplete }: OnboardingProgressProps) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  const pollStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/websites/${websiteId}/onboard`);
      const result = await response.json();

      if (result.success && result.data) {
        setState(result.data);
        setError(null);

        // Stop polling if complete or failed
        if (result.data.status === "complete") {
          setIsPolling(false);
          onComplete?.();
        } else if (result.data.status === "failed") {
          setIsPolling(false);
          setError(result.data.error || "Onboarding failed");
        }
      } else {
        setError(result.error?.message || "Failed to fetch status");
      }
    } catch (err) {
      console.error("Polling error:", err);
      setError("Connection error");
    }
  }, [websiteId, onComplete]);

  useEffect(() => {
    if (!isPolling) return;

    // Initial poll
    pollStatus();

    // Poll every 3 seconds
    const interval = setInterval(pollStatus, 3000);

    return () => clearInterval(interval);
  }, [isPolling, pollStatus]);

  const handleRetry = async () => {
    setError(null);
    setIsPolling(true);

    try {
      // Restart onboarding
      await fetch(`/api/v1/websites/${websiteId}/onboard`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Retry error:", err);
      setError("Failed to restart onboarding");
    }
  };

  const getStepStatus = (stepKey: string): "complete" | "current" | "pending" => {
    if (!state) return "pending";

    const stepOrder: OnboardingStatus[] = ["scanning", "discovering", "generating", "complete"];
    const currentIndex = stepOrder.indexOf(state.status);
    const stepIndex = stepOrder.indexOf(stepKey as OnboardingStatus);

    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "current";
    return "pending";
  };

  // Don't show if not started
  if (state?.status === "not_started") {
    return null;
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-800">Setup Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (!state) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <p className="text-blue-800">Loading setup status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Completed state (compact)
  if (state.status === "complete") {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Setup Complete!</p>
              <p className="text-sm text-green-600">
                {state.topics_count} topics ready
                {state.articles_generated ? `, ${state.articles_generated} article generated` : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // In-progress state (full progress view)
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Setting Up Your SEO System
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step) => {
            const stepStatus = getStepStatus(step.key);
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {stepStatus === "complete" ? (
                    <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : stepStatus === "current" ? (
                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300 bg-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium ${
                      stepStatus === "pending" ? "text-gray-400" : "text-gray-900"
                    }`}
                  >
                    {step.label}
                    {step.key === "discovering" && state.topics_count !== undefined && state.topics_count > 0 && (
                      <span className="ml-2 text-sm font-normal text-blue-600">
                        ({state.topics_count} topics)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {state.message && (
          <p className="mt-4 text-sm text-blue-600 italic">{state.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
