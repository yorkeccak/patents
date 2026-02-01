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
import { MigrationBanner } from "@/components/migration-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://patents.valyu.ai";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "PatentAI - AI Patent Search & Prior Art Analysis | Valyu",
    template: "%s | PatentAI | Valyu",
  },
  description:
    "AI-powered patent search and prior art analysis. Search USPTO, EPO, PCT patents with natural language. Freedom-to-operate analysis, competitive intelligence, and patent landscape research - all through conversational AI.",
  keywords: [
    "patent search AI",
    "prior art search",
    "USPTO search",
    "patent analysis",
    "freedom to operate",
    "FTO analysis",
    "patent database",
    "PatSnap alternative",
    "patent landscape",
    "competitive intelligence patents",
    "EPO patent search",
    "PCT patents",
    "patent research tool",
    "AI patent analysis",
    "patent portfolio analysis",
  ],
  applicationName: "PatentAI",
  authors: [{ name: "Valyu", url: "https://valyu.ai" }],
  creator: "Valyu",
  publisher: "Valyu",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    title: "PatentAI - AI Patent Search & Prior Art Analysis | Valyu",
    description:
      "Find prior art, analyze patent portfolios, and conduct freedom-to-operate searches using natural language. Professional-grade patent search made accessible. Search USPTO, EPO, PCT patents instantly.",
    url: baseUrl,
    siteName: "PatentAI",
    images: [
      {
        url: "/valyu.png",
        width: 1200,
        height: 630,
        alt: "PatentAI - AI Patent Search & Prior Art Analysis",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PatentAI - AI Patent Search & Prior Art Analysis | Valyu",
    description:
      "AI-powered patent search and prior art analysis. Search USPTO, EPO, PCT patents with natural language. Freedom-to-operate analysis and competitive intelligence.",
    images: ["/valyu.png"],
    creator: "@valaboratories",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [
      { url: "/favicon.ico", sizes: "180x180" },
    ],
  },
  manifest: "/manifest.json",
  category: "technology",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PatentAI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI-powered patent search and prior art analysis. Search USPTO, EPO, PCT patents with natural language. Freedom-to-operate analysis, competitive intelligence, and patent landscape research.",
  url: baseUrl,
  author: {
    "@type": "Organization",
    name: "Valyu",
    url: "https://valyu.ai",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
  },
  featureList: [
    "Prior art search",
    "Freedom-to-operate analysis",
    "USPTO patent search",
    "EPO patent search",
    "PCT patent search",
    "Patent landscape analysis",
    "Competitive intelligence",
    "Natural language queries",
  ],
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthInitializer>
              <PostHogProvider>
                <OllamaProvider>
                  <MissingKeysDialog />
                  <MigrationBanner />
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