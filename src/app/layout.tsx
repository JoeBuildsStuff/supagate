import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner"
import MainNavHeader from "@/components/main-nav-header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
title: "Next SupaGate",
description: "A NextJS Authentication System with Supabase",
};

export default async function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return (
  <html lang="en" suppressHydrationWarning>
    <body className={inter.className} suppressHydrationWarning> 
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="flex flex-col h-screen mx-2 mt-2">
          <MainNavHeader />
          {children}
        </div>
        <Toaster />
      </ThemeProvider>
    </body>
  </html>
);
}