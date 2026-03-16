import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  CountUp,
} from "@/components/marketing/animations";
import {
  Dumbbell,
  IndianRupee,
  MessageCircle,
  ScanLine,
  Shield,
  Clock,
  ArrowRight,
  Check,
  Zap,
  Globe,
  Smartphone,
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
  const tm = await getTranslations("marketing");

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <MarketingNav />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-32 right-0 h-[300px] w-[400px] rounded-full bg-primary/3 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 md:pt-32 md:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <FadeIn delay={0.1}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                <Zap className="size-3 text-primary" strokeWidth={2} />
                {t("builtFor")}
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                {t("heroTitle")}
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {" "}{t("heroTitleHighlight")}
                </span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.3}>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl md:mt-8">
                {t("heroDescription")}
              </p>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2.5 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
                  data-testid="hero-cta"
                >
                  {t("startForFree")}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-xl border border-border px-8 py-3.5 text-base font-semibold transition-colors hover:bg-muted"
                  data-testid="hero-login"
                >
                  {t("haveAccount")}
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.5}>
              <div className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" strokeWidth={2.5} />
                  {t("noCreditCard")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" strokeWidth={2.5} />
                  {t("freeForever")}
                </span>
                <span className="hidden items-center gap-1.5 sm:inline-flex">
                  <Check className="size-3.5 text-primary" strokeWidth={2.5} />
                  {t("setupMinutes")}
                </span>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Social proof / Stats ──────────────────────────────────────── */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
          <StaggerContainer className="grid grid-cols-2 gap-8 md:grid-cols-4" stagger={0.1}>
            {[
              { value: 10, suffix: "s", labelKey: "statCheckin" },
              { value: 0, prefix: "₹", labelKey: "statPaymentFees" },
              { value: 5, suffix: " min", labelKey: "statSetup" },
              { value: 6, suffix: "+", labelKey: "statLanguages" },
            ].map(({ value, suffix, prefix, labelKey }) => (
              <StaggerItem key={labelKey} className="text-center">
                <div className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  <CountUp target={value} suffix={suffix} prefix={prefix} />
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{t(labelKey)}</p>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Features Grid ─────────────────────────────────────────────── */}
      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              {t("featuresTitle")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("featuresDescription")}
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08} delay={0.2}>
          {FEATURE_KEYS.map((key, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <StaggerItem key={key}>
                <div className="group relative h-full rounded-2xl border border-border bg-card p-7 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                  <div className="mb-5 inline-flex rounded-xl bg-primary/10 p-3 transition-colors group-hover:bg-primary/15">
                    <Icon className="size-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{t(key)}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(`${key}Desc`)}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      {/* ── Why Vajra section ─────────────────────────────────────────── */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                {tm("whyVajraTitle")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {tm("whyVajraDescription")}
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="mt-16 grid gap-8 md:grid-cols-3" stagger={0.15} delay={0.2}>
            {[
              { icon: Smartphone, titleKey: "whyMobileFirst", descKey: "whyMobileFirstDesc" },
              { icon: Globe, titleKey: "whyMultilingual", descKey: "whyMultilingualDesc" },
              { icon: Zap, titleKey: "whyFast", descKey: "whyFastDesc" },
            ].map(({ icon: Icon, titleKey, descKey }) => (
              <StaggerItem key={titleKey}>
                <div className="text-center">
                  <div className="mx-auto mb-5 inline-flex rounded-2xl bg-primary/10 p-4">
                    <Icon className="size-6 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{tm(titleKey)}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{tm(descKey)}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground shadow-2xl shadow-primary/20 md:px-16 md:py-20">
            {/* Decorative elements */}
            <div className="pointer-events-none absolute inset-0 -z-0">
              <div className="absolute -top-24 -right-24 size-64 rounded-full bg-primary-foreground/5" />
              <div className="absolute -bottom-20 -left-20 size-48 rounded-full bg-primary-foreground/5" />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                {t("ctaTitle")}
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/80">
                {t("ctaDescription")}
              </p>
              <Link
                href="/signup"
                className="group mt-8 inline-flex items-center gap-2.5 rounded-xl bg-primary-foreground px-8 py-3.5 text-base font-semibold text-primary shadow-lg transition-all hover:shadow-xl"
                data-testid="bottom-cta"
              >
                {t("ctaButton")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      <MarketingFooter />
    </div>
  );
}
