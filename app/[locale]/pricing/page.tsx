import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/marketing/animations";
import { Check, ArrowRight, Gift } from "lucide-react";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");

  const features = [
    "freeF1",
    "freeF2",
    "freeF3",
    "freeF4",
    "freeF5",
    "freeF6",
    "freeF7",
    "freeF8",
  ] as const;

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

      {/* ── Free Plan Card ────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-xl px-4 pb-20 sm:px-6 md:pb-28">
        <FadeIn delay={0.3}>
          <div className="relative flex flex-col rounded-2xl border border-primary bg-card p-8 shadow-xl shadow-primary/10 ring-1 ring-primary/20">
            <div className="mb-5 inline-flex self-start rounded-xl bg-primary/10 p-3">
              <Gift className="size-5 text-primary" strokeWidth={1.5} />
            </div>

            <h3 className="text-xl font-bold">{t("freeName")}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{t("freeDesc")}</p>

            <div className="mt-6 mb-6">
              <span className="text-4xl font-extrabold tracking-tight">{t("freePrice")}</span>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {features.map((fKey) => (
                <li key={fKey} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} />
                  <span className="text-muted-foreground">{t(fKey)}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl"
            >
              {t("freeCta")}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t("paidPlansNote")}
          </p>
        </FadeIn>
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
            {(["faq1", "faq2", "faq3"] as const).map((faqKey) => (
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
