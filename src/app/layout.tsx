
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {HeroUIProvider} from "@heroui/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "blip - home",
  description: "blip home page.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} >

        {/* <HeroUIProvider> */}
          {/* <main className="purple-dark" > */}
            {children}
          {/* </main> */}
        {/* </HeroUIProvider> */}
        
      </body>
    </html>
  );
}
