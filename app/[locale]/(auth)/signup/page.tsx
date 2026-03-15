"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { signUpUser } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signUpUser(email, password, name);

    if (result.success) {
      toast.success(t("signUpSuccess"));
      router.push("/verify-email");
    } else {
      toast.error(result.error ?? "Signup failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t("createAccount")}</CardTitle>
        <CardDescription>{t("signUpDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label={t("fullName")} htmlFor="name" required constraint={t("nameConstraint")}>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={t("fullNamePlaceholder")}
              required
              autoComplete="name"
            />
          </FormField>
          <FormField label={t("email")} htmlFor="email" required>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              required
              autoComplete="email"
            />
          </FormField>
          <FormField label={t("password")} htmlFor="password" required constraint={t("passwordConstraint")}>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              required
              autoComplete="new-password"
              minLength={8}
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("creatingAccount") : t("signingUp")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/login" className="text-primary underline">
            {t("signInLink")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
