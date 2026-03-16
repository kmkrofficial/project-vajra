import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Dumbbell } from "lucide-react";

export async function MarketingFooter() {
  const tc = await getTranslations("common");
  const t = await getTranslations("marketing");

  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                <Dumbbell className="size-4 text-primary-foreground" strokeWidth={2} />
              </div>
              <span className="text-lg font-bold tracking-tight">{tc("vajra")}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("footerTagline")}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold">{t("footerProduct")}</h4>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href="/#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t("features")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold">{t("footerCompany")}</h4>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t("about")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Get started */}
          <div>
            <h4 className="text-sm font-semibold">{t("footerGetStarted")}</h4>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href="/signup" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t("createAccount")}
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t("signIn")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {tc("vajra")}. {t("allRightsReserved")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("madeInIndia")}
          </p>
        </div>
      </div>
    </footer>
  );
}
