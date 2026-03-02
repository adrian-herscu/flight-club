"use client";

import { Suspense } from "react";
import AuthCallbackContent from "../callback-content";

function CallbackFallback() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Redirecting...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
