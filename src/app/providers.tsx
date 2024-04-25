"use client";
import { ClerkProvider } from "@clerk/nextjs";

export function Providers({ children }: { children: JSX.Element }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
