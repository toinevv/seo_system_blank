"use client";

import { useState, useEffect, Suspense } from "react";
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
import { CheckCircle2, Loader2 } from "lucide-react";

function SignupFormInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState<string | null>(null);
  const [linkingSubscription, setLinkingSubscription] = useState(false);

  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check if coming from successful checkout
  const checkoutSuccess = searchParams.get("checkout") === "success";
  const sessionId = searchParams.get("session_id");

  // Fetch checkout session email if coming from payment
  useEffect(() => {
    if (checkoutSuccess && sessionId) {
      fetch(`/api/stripe/session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.email) {
            setCheckoutEmail(data.email);
            setEmail(data.email);
          }
        })
        .catch(console.error);
    }
  }, [checkoutSuccess, sessionId]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // If coming from checkout, link the subscription to the new user
    if (checkoutSuccess && sessionId && data.user) {
      setLinkingSubscription(true);
      try {
        const linkResponse = await fetch("/api/stripe/link-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!linkResponse.ok) {
          const linkData = await linkResponse.json();
          console.error("Failed to link subscription:", linkData.error);
          // Don't fail signup, subscription can be linked later via email matching
        }
      } catch (err) {
        console.error("Error linking subscription:", err);
      }
      setLinkingSubscription(false);
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
              {checkoutSuccess && (
                <span className="block mt-2 text-green-600 font-medium">
                  Your subscription is ready and will be activated once you verify your email!
                </span>
              )}
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
          {checkoutSuccess ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">Payment successful!</span>
              </div>
              <CardTitle className="text-2xl font-bold">Complete your account</CardTitle>
              <CardDescription>
                Create your account to activate your subscription and start generating SEO content.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
              <CardDescription>
                Enter your details to create your SEO Dashboard account
              </CardDescription>
            </>
          )}
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
                disabled={!!checkoutEmail}
              />
              {checkoutEmail && (
                <p className="text-xs text-muted-foreground">
                  Using the email from your payment
                </p>
              )}
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
            <Button type="submit" className="w-full" disabled={loading || linkingSubscription}>
              {loading || linkingSubscription ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {linkingSubscription ? "Activating subscription..." : "Creating account..."}
                </>
              ) : checkoutSuccess ? (
                "Create account & activate subscription"
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
