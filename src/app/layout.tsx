import type { Metadata, Viewport } from 'next';
import { Inter } from "next/font/google";
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { SupabaseClientProvider } from '@/supabase/client-provider';
import { ThemeProvider } from '@/components/theme-provider';
import GoogleAnalytics from '@/components/google-analytics';
import VercelAnalytics from '@/components/vercel-analytics';
import CookieConsent from '@/components/cookie-consent';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://simupro.io';
/** Variable font subset (smaller download than stacking four discrete weights). */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SimuPro — AI-Powered EMS Simulation Training',
    template: '%s | SimuPro',
  },
  description:
    'Train smarter with SimuPro: AI-driven EMS simulation scenarios, dynamic patient responses, and personalized coaching for EMTs, AEMTs, and Paramedics.',
  applicationName: 'SimuPro',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SimuPro',
  },
  authors: [{ name: 'SimuPro' }],
  keywords: [
    'EMS training',
    'EMT simulation',
    'paramedic practice',
    'AEMT scenarios',
    'EMS protocols',
    'AI clinical simulation',
    'NREMT prep',
  ],
  category: 'education',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: 'SimuPro — AI-Powered EMS Simulation Training',
    description:
      'AI-driven EMS simulation scenarios with dynamic patient responses and personalized coaching for every certification level.',
    siteName: 'SimuPro',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SimuPro — AI-Powered EMS Simulation Training',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SimuPro — AI-Powered EMS Simulation Training',
    description:
      'AI-driven EMS simulation scenarios with dynamic patient responses and personalized coaching.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} font-body antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-foreground focus:shadow-md focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SupabaseClientProvider>{children}</SupabaseClientProvider>
          <CookieConsent />
          <GoogleAnalytics />
          <VercelAnalytics />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
