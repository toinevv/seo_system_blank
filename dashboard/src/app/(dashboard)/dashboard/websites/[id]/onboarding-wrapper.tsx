"use client";

import { OnboardingProgress } from "@/components/dashboard/onboarding-progress";
import { useRouter } from "next/navigation";

interface OnboardingProgressWrapperProps {
  websiteId: string;
  showOnboarding: boolean;
}

export function OnboardingProgressWrapper({
  websiteId,
  showOnboarding,
}: OnboardingProgressWrapperProps) {
  const router = useRouter();

  if (!showOnboarding) {
    return null;
  }

  const handleComplete = () => {
    // Refresh the page to show updated data
    router.refresh();
  };

  return <OnboardingProgress websiteId={websiteId} onComplete={handleComplete} />;
}
