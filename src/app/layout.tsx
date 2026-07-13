import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, IBM_Plex_Sans, Geist } from "next/font/google";

import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";
import { AppSessionProvider } from "@/components/providers/app-session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ActionToastProvider } from "@/components/ui/action-toast";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const bodyFont = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const headingFont = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Specia Local — BEP ve Değerlendirmeler",
    template: "%s | Specia Local",
  },
  description: "Öğrenci, BEP, değerlendirme, belge, iletişim ve kurum süreçlerini dijital ortamda yönetmek için geliştirilen özel eğitim çözümleri platformu.",
  keywords: [
    "bep",
    "bireyselleştirilmiş eğitim programı",
    "özel eğitim",
    "kaba değerlendirme",
    "gelişim raporu",
    "özel eğitim yazılımı",
    "ram raporu",
    "bep hazırlama",
    "bep hazırlama programı",
    "öğrenci gelişim takibi",
  ],
  authors: [{ name: "Specia Team", url: "https://specia.com.tr" }],
  creator: "Specia Dijital Eğitim Çözümleri",
  publisher: "Specia Dijital Eğitim Çözümleri",
  metadataBase: new URL("https://specia.com.tr"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Specia Dijital Eğitim Çözümleri",
    description: "Öğrenci, BEP, değerlendirme, belge, iletişim ve kurum süreçlerini dijital ortamda yönetmek için geliştirilen özel eğitim çözümleri platformu.",
    url: "https://specia.com.tr",
    siteName: "Specia",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Specia Dijital Eğitim Çözümleri",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Specia Dijital Eğitim Çözümleri",
    description: "Öğrenci, BEP, değerlendirme, belge, iletişim ve kurum süreçlerini dijital ortamda yönetmek için geliştirilen özel eğitim çözümleri platformu.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={cn(bodyFont.variable, headingFont.variable, "font-sans", geist.variable)} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AppSessionProvider>
            <ActionToastProvider>
              <Suspense fallback={null}>
                <NavigationProgress />
              </Suspense>
              <div className="flex min-h-screen flex-col">
                <div className="flex-1">{children}</div>
                <ScrollToTopButton />
              </div>
            </ActionToastProvider>
          </AppSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
