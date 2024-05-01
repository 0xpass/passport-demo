"use client";
import { SignOutButton } from "@clerk/nextjs";

export function SignOut() {
  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/"; // Redirect to the home page
      window.location.reload(); // Force reload of the page
    }
  };

  return <SignOutButton signOutCallback={handleSignOut} />;
}
