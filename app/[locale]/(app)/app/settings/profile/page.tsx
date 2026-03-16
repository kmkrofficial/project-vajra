import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession, getUserLocale } from "@/lib/actions/auth";
import ProfileForm from "./profile-form";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("profile");

  const session = await getSession();
  if (!session?.user) redirect("/login");

  const savedLocale = await getUserLocale();

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-6" data-testid="profile-page">
      <div>
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <ProfileForm
        defaultName={session.user.name ?? ""}
        email={session.user.email}
        defaultLocale={savedLocale}
      />
    </div>
  );
}
