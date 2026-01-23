import { LoginForm } from "./login-form";

// Force dynamic rendering to prevent build-time Supabase client initialization
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm />;
}
