import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/marketing/animations";
import { Check, ArrowRight, Zap, Building2, Crown } from "lucide-react";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");

  const plans = [
    {
      nameKey: "starterName",
      priceKey: "starterPrice",
      descKey: "starterDesc",
      icon: Zap,
      featured: false,
      features: [
        "starterF1",
        "starterF2",
        "starterF3",
        "starterF4",
        "starterF5",
      ] as const,
      ctaKey: "starterCta",
    },
    {
      nameKey: "proName",
      priceKey: "proPrice",
      descKey: "proDesc",
      icon: Crown,
      featured: true,
      features: [
        "proF1",
        "proF2",
        "proF3",
        "proF4",
        "proF5",
        "proF6",
        "proF7",
      ] as const,
      ctaKey: "proCta",
    },
    {
      nameKey: "enterpriseName",
      priceKey: "enterprisePrice",
      descKey: "enterpriseDesc",
      icon: Building2,
      featured: false,
      features: [
        "enterpriseF1",
        "enterpriseF2",
        "enterpriseF3",
        "enterpriseF4",
        "enterpriseF5",
      ] as const,
      ctaKey: "enterpriseCta",
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <MarketingNav />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-20 pb-12 sm:px-6 md:pt-32 md:pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <FadeIn delay={0.1}>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
                {t("heroTitle")}
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                {t("heroDescription")}
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Pricing Cards ─────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 md:pb-28">
        <StaggerContainer className="grid gap-6 md:grid-cols-3" stagger={0.12}>
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <StaggerItem key={plan.nameKey}>
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-8 transition-all ${
                    plan.featured
                      ? "border-primary bg-card shadow-xl shadow-primary/10 ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                      {t("mostPopular")}
                    </div>
                  )}

                  <div className="mb-5 inline-flex self-start rounded-xl bg-primary/10 p-3">
                    <Icon className="size-5 text-primary" strokeWidth={1.5} />
                  </div>

                  <h3 className="text-xl font-bold">{t(plan.nameKey)}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{t(plan.descKey)}</p>

                  <div className="mt-6 mb-6">
                    <span className="text-4xl font-extrabold tracking-tight">{t(plan.priceKey)}</span>
                    {plan.nameKey !== "enterpriseName" && (
                      <span className="ml-1.5 text-sm text-muted-foreground">{t("perMonth")}</span>
                    )}
                  </div>

                  <ul className="mb-8 flex-1 space-y-3">
                    {plan.features.map((fKey) => (
                      <li key={fKey} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} />
                        <span className="text-muted-foreground">{t(fKey)}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className={`group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                      plan.featured
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-xl"
                        : "border border-border hover:bg-muted"
                    }`}
                  >
                    {t(plan.ctaKey)}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                  </Link>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 md:py-28">
          <FadeIn>
            <h2 className="text-center text-3xl font-extrabold tracking-tight md:text-4xl">
              {t("faqTitle")}
            </h2>
          </FadeIn>

          <StaggerContainer className="mt-12 divide-y divide-border" stagger={0.08} delay={0.2}>
            {(["faq1", "faq2", "faq3", "faq4"] as const).map((faqKey) => (
              <StaggerItem key={faqKey} className="py-6">
                <h3 className="text-base font-semibold">{t(`${faqKey}Q`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`${faqKey}A`)}
                </p>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
