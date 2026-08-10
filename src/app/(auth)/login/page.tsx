import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Loading sign-in...</div>}>
      <LoginForm />
    </Suspense>
  );
}
