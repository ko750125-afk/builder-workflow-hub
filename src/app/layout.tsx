import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { LayoutGrid } from 'lucide-react';
import AuthStatus from '@/components/AuthStatus';
import SettingsManager from '@/components/SettingsManager';
import Link from 'next/link';
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Builder Workflow Hub",
  description: "개인 개발자를 위한 앱 생애주기 관리 허브",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import PayPalProvider from '@/components/PayPalProvider';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={cn(inter.variable, outfit.variable, "antialiased bg-slate-200 text-slate-900 font-sans")} suppressHydrationWarning>
        <PayPalProvider>
          <div className="min-h-screen flex flex-col items-center">
            <header className="w-full sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
              <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-all group">
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 group-hover:rotate-6 transition-transform flex-shrink-0">
                      <LayoutGrid className="text-white" size={20} strokeWidth={3} />
                    </div>
                    <h1 className="text-2xl font-black font-outfit tracking-tight text-slate-950 hidden sm:block">BUILDER HUB</h1>
                  </Link>
                </div>
                <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                  <SettingsManager />
                  <div className="h-6 w-px bg-slate-100" />
                  <AuthStatus />
                </div>
              </div>
            </header>

            <main className="w-full flex-1">
              <div className="container mx-auto px-4 py-12">
                {children}
              </div>
            </main>

            <footer className="w-full py-10 border-t border-slate-100 text-center text-slate-400 text-xs font-bold tracking-[0.3em] uppercase">
              <div className="container mx-auto px-4">
                © {new Date().getFullYear()} Builder Workflow Hub • PREMIUM WORKFLOW SYSTEM
              </div>
            </footer>
          </div>
        </PayPalProvider>
      </body>
    </html>
  );
}
