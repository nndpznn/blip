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
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" className="bg-[#0d0d0d]" data-theme="blip-main">
      <body className={`${geistSans.variable} ${geistMono.variable} flex flex-col h-screen antialiased overflow-hidden`} >
        <AuthProvider>
          <Providers>
            <div className="flex flex-col h-screen min-h-0 overflow-hidden">
              <div className="shrink-0">
                <Nav />
              </div>
              <main className="blip-main flex flex-col flex-1 min-h-0 overflow-hidden" >
                {children}
              </main>
            </div>
          </Providers>
        </AuthProvider>
        
      </body>
    </html>
  );
}
