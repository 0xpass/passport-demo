"use client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { SnackbarProvider } from "notistack";

export function Providers({ children }: { children: JSX.Element }) {
  return (
    <SnackbarProvider>
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
        {children}
      </GoogleOAuthProvider>
    </SnackbarProvider>
  );
}
