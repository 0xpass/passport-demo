import { Inter } from "next/font/google";
import { Providers } from "./providers";
import localFont from "next/font/local";
import "./globals.css";
import { SignOutButton, auth } from "@clerk/nextjs";
import { SignOut } from "./components/SignOut";

const myFont = localFont({ src: "../../public/fonts/PPNeueMontreal-Book.otf" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();

  return (
    <html lang="en">
      <Providers>
        <>
          <body className={`${myFont.className} bg-black text-white`}>
            <div className="flex items-center justify-end pr-8 pt-4">
              {userId && <SignOut />}
            </div>
            {children}
          </body>
        </>
      </Providers>
    </html>
  );
}
