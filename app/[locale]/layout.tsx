import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { routing } from "@/i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <meta name="theme-color" content="#09090b" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="antialiased">
        <NextTopLoader color="hsl(var(--primary))" showSpinner={false} height={3} />
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <WorkspaceProvider>
              {children}
            </WorkspaceProvider>
            <Toaster richColors position="bottom-right" />
          </ThemeProvider>
        </NextIntlClientProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
