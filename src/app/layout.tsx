import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "@/styles/globals.css";
import Nav from "@/components/nav";
import { AuthProvider } from '../clients/authContext';

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
    <html lang="en" className="bg-[#0d0d0d]" data-theme="blip-main">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden`} >
        <AuthProvider>
          <Providers>
            <Nav />
            <main className="blip-main" >
              {children}
            </main>
          </Providers>
        </AuthProvider>
        
      </body>
    </html>
  );
}
