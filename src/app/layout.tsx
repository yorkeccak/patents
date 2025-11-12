import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MissingKeysDialog } from "@/components/missing-keys-dialog";
import { OllamaProvider } from "@/lib/ollama-context";
import { Analytics } from '@vercel/analytics/next';
import { AuthInitializer } from "@/components/auth/auth-initializer";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { logEnvironmentStatus } from "@/lib/env-validation";
import { ProviderSelector } from "@/components/providers/provider-selector";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  title: {
    default: "PatentAI - Conversational Patent Search | By Valyu",
    template: "%s | PatentAI | By Valyu",
  },
  description:
    "AI-powered conversational patent search powered by Valyu's specialized patent data infrastructure. Prior art search, freedom-to-operate analysis, competitive intelligence, and more - all through natural language.",
  applicationName: "PatentAI | By Valyu",
  openGraph: {
    title: "PatentAI - Conversational Patent Search | By Valyu",
    description:
      "Find prior art, analyze patent portfolios, and conduct freedom-to-operate searches using natural language. Professional-grade patent search made accessible. Search USPTO, EPO, PCT patents instantly.",
    url: "/",
    siteName: "PatentAI | By Valyu",
    images: [
      {
        url: "/valyu.png",
        width: 1200,
        height: 630,
        alt: "PatentAI - Conversational Patent Search",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PatentAI - Conversational Patent Search | By Valyu",
    description:
      "AI-powered patent search using Valyu's specialized patent data infrastructure. Prior art, FTO, competitive intelligence in natural language. Search millions of patents instantly.",
    images: ["/valyu.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Log environment status on server-side render
  if (typeof window === 'undefined') {
    logEnvironmentStatus();
  }
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthInitializer>
              <PostHogProvider>
                <OllamaProvider>
                  <MissingKeysDialog />
                  <ProviderSelector />
                  {children}
                  <Analytics />
                </OllamaProvider>
              </PostHogProvider>
            </AuthInitializer>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}