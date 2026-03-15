"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateProfile } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileFormProps {
  defaultName: string;
  email: string;
}

export default function ProfileForm({ defaultName, email }: ProfileFormProps) {
  const router = useRouter();
  const t = useTranslations("profile");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string).trim();

    if (name.length < 2) {
      toast.error(t("nameTooShort"));
      setLoading(false);
      return;
    }

    const result = await updateProfile(name);

    if (result.success) {
      toast.success(t("updated"));
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update profile.");
    }

    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("accountDetails")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label={t("email")}
            htmlFor="profile-email"
            tooltip={t("emailTooltip")}
          >
            <Input
              id="profile-email"
              value={email}
              disabled
              className="bg-muted"
            />
          </FormField>

          <FormField
            label={t("fullName")}
            htmlFor="profile-name"
            required
            tooltip={t("fullNameTooltip")}
            constraint={t("fullNameConstraint")}
          >
            <Input
              id="profile-name"
              name="name"
              defaultValue={defaultName}
              required
              minLength={2}
              placeholder={t("fullNamePlaceholder")}
              data-testid="profile-name-input"
            />
          </FormField>

          <Button
            type="submit"
            disabled={loading}
            data-testid="profile-save-btn"
          >
            {loading ? t("saving") : t("saveChanges")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
