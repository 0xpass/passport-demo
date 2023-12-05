import { Inter } from "next/font/google";
import { Providers } from "./providers";
import localFont from "next/font/local";
import "./globals.css";

const myFont = localFont({ src: "../../public/fonts/PPNeueMontreal-Book.otf" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <Providers>
        <body className={`${myFont.className} bg-black text-white`}>
          {children}
        </body>
      </Providers>
    </html>
  );
}
