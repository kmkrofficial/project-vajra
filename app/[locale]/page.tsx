import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/features/language-switcher";
import {
  Dumbbell,
  IndianRupee,
  MessageCircle,
  ScanLine,
  Shield,
  Clock,
  ArrowRight,
} from "lucide-react";

const FEATURE_ICONS = [IndianRupee, MessageCircle, ScanLine, Shield, Clock, Dumbbell];
const FEATURE_KEYS = [
  "featureUpi",
  "featureWhatsapp",
  "featureKiosk",
  "featureRbac",
  "featureExpiry",
  "featureMultiBranch",
] as const;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" strokeWidth={1.5} />
            <span className="text-lg font-bold tracking-tight">{tc("vajra")}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              data-testid="nav-login"
            >
              {t("logIn")}
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              data-testid="nav-signup"
            >
              {t("startFree")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-20 pb-16 text-center md:pt-28 md:pb-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Dumbbell className="size-3" strokeWidth={1.5} />
          {t("builtFor")}
        </div>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
          {t("heroTitle")}
          <span className="block text-primary"> {t("heroTitleHighlight")}</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
          {t("heroDescription")}
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            data-testid="hero-cta"
          >
            {t("startForFree")}
            <ArrowRight className="size-4" strokeWidth={1.5} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-muted"
            data-testid="hero-login"
          >
            {t("haveAccount")}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl font-bold md:text-3xl">
          {t("featuresTitle")}
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
          {t("featuresDescription")}
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((key, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <div
                key={key}
                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5">
                  <Icon className="size-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-base font-semibold">{t(key)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(`${key}Desc`)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 px-6 py-12 text-center md:px-12">
          <h2 className="text-2xl font-bold md:text-3xl">
            {t("ctaTitle")}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t("ctaDescription")}
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            data-testid="bottom-cta"
          >
            {t("ctaButton")}
            <ArrowRight className="size-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Dumbbell className="size-4" strokeWidth={1.5} />
            <span>{tc("vajra")} — {tc("gymPlatform")}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {tc("selfHosted")}
          </p>
        </div>
      </footer>
    </div>
  );
}
