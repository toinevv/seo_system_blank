"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

const PLAN_DETAILS: Record<string, { name: string; price: number; geoPrice: number }> = {
  starter: { name: "Starter", price: 30, geoPrice: 35 },
  pro: { name: "Pro", price: 75, geoPrice: 140 },
  business: { name: "Business", price: 150, geoPrice: 290 },
};

function SignupFormInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const searchParams = useSearchParams();

  // Get plan info from URL params
  const planKey = searchParams.get("plan");
  const withGeo = searchParams.get("geo") === "true";
  const planDetails = planKey ? PLAN_DETAILS[planKey] : null;
  const displayPrice = planDetails
    ? (withGeo ? planDetails.geoPrice : planDetails.price)
    : null;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Lazily create Supabase client only when user submits
    const supabase = createClient();

    // Build redirect URL with plan info for website setup
    const redirectUrl = planKey
      ? `/dashboard/websites/new?plan=${planKey}&geo=${withGeo}`
      : "/dashboard/websites/new";

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          selected_plan: planKey || null,
          selected_geo: withGeo,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl)}`,
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            </div>
            <CardDescription>
              We&apos;ve sent you a confirmation link. Please check your email to verify your account.
              <span className="block mt-2 font-medium text-foreground">
                After verification, you&apos;ll be taken to set up your first website.
              </span>
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                Back to login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>
            {planDetails ? (
              <>
                You selected the <strong>{planDetails.name}</strong> plan
                {withGeo && (
                  <span className="inline-flex items-center gap-1 ml-1">
                    with <Sparkles size={12} className="text-primary" /> GEO
                  </span>
                )}
                <span className="block mt-1 text-foreground font-medium">
                  €{displayPrice}/month
                </span>
              </>
            ) : (
              "Enter your details to get started"
            )}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function SignupLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}

export function SignupForm() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupFormInner />
    </Suspense>
  );
}
