import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-md">
          <div className="h-96 animate-pulse rounded-xl bg-white" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
