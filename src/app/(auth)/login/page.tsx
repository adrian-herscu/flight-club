"use client";

import { Suspense } from "react";
import LoginContent from "../login-content";

function LoginFallback() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Loading...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
