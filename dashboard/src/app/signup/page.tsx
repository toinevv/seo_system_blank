import { SignupForm } from "./signup-form";

// Force dynamic rendering to prevent build-time Supabase client initialization
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return <SignupForm />;
}
