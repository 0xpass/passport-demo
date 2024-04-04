"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { SnackbarProvider } from "notistack";

export function Providers({ children }: { children: JSX.Element }) {
  return (
    <SnackbarProvider>
      <ClerkProvider>{children}</ClerkProvider>
    </SnackbarProvider>
  );
}
