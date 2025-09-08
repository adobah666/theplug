import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth/context";
import { PWAProvider } from "@/lib/pwa/context";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PWAInstallPrompt } from "@/components/layout/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ThePlug - Fashion & Style",
  description: "Discover the latest fashion trends with ThePlug. Shop clothing, shoes, and accessories from top brands with fast delivery and easy returns.",
  keywords: "fashion, clothing, shoes, accessories, online shopping, style, trends",
  authors: [{ name: "ThePlug Team" }],
  creator: "ThePlug",
  publisher: "ThePlug",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ThePlug",
  },
  openGraph: {
    title: "ThePlug - Fashion & Style",
    description: "Discover the latest fashion trends with ThePlug. Shop clothing, shoes, and accessories from top brands.",
    url: "/",
    siteName: "ThePlug",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ThePlug Fashion Store",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ThePlug - Fashion & Style",
    description: "Discover the latest fashion trends with ThePlug. Shop clothing, shoes, and accessories from top brands.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'ThePlug',
    'application-name': 'ThePlug',
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#3b82f6',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-full flex flex-col`}
      >
        <ErrorBoundary>
          <PWAProvider>
            <AuthProvider>
              <CartProvider>
                <OfflineIndicator />
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-1">
                    <Suspense 
                      fallback={
                        <div className="flex items-center justify-center min-h-[400px]">
                          <LoadingSpinner size="lg" />
                        </div>
                      }
                    >
                      {children}
                    </Suspense>
                  </main>
                  <Footer />
                </div>
                <PWAInstallPrompt />
              </CartProvider>
            </AuthProvider>
          </PWAProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
