import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/marketing/animations";
import { Target, Heart, Lightbulb, Shield } from "lucide-react";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

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

      {/* ── Story ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              {t("storyTitle")}
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              {t("storyP1")}
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {t("storyP2")}
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {t("storyP3")}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                {t("valuesTitle")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t("valuesDescription")}
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="mt-16 grid gap-8 sm:grid-cols-2" stagger={0.1} delay={0.2}>
            {[
              { icon: Target, titleKey: "valueSimplicity", descKey: "valueSimplicityDesc" },
              { icon: Heart, titleKey: "valueAccessibility", descKey: "valueAccessibilityDesc" },
              { icon: Lightbulb, titleKey: "valueTransparency", descKey: "valueTransparencyDesc" },
              { icon: Shield, titleKey: "valueReliability", descKey: "valueReliabilityDesc" },
            ].map(({ icon: Icon, titleKey, descKey }) => (
              <StaggerItem key={titleKey}>
                <div className="h-full rounded-2xl border border-border bg-card p-8">
                  <div className="mb-5 inline-flex rounded-xl bg-primary/10 p-3">
                    <Icon className="size-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{t(titleKey)}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Mission statement ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <blockquote className="text-2xl font-semibold leading-relaxed tracking-tight md:text-3xl">
              &ldquo;{t("missionQuote")}&rdquo;
            </blockquote>
            <p className="mt-6 text-muted-foreground">{t("missionAttribution")}</p>
          </div>
        </FadeIn>
      </section>

      <MarketingFooter />
    </div>
  );
}
