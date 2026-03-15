"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string).trim();

    if (name.length < 2) {
      toast.error("Name must be at least 2 characters.");
      setLoading(false);
      return;
    }

    const result = await updateProfile(name);

    if (result.success) {
      toast.success("Profile updated");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update profile.");
    }

    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Account Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Email"
            htmlFor="profile-email"
            tooltip="Your login email. Cannot be changed."
          >
            <Input
              id="profile-email"
              value={email}
              disabled
              className="bg-muted"
            />
          </FormField>

          <FormField
            label="Full Name"
            htmlFor="profile-name"
            required
            tooltip="Your display name across the platform"
            constraint="Min 2 characters"
          >
            <Input
              id="profile-name"
              name="name"
              defaultValue={defaultName}
              required
              minLength={2}
              placeholder="Your name"
              data-testid="profile-name-input"
            />
          </FormField>

          <Button
            type="submit"
            disabled={loading}
            data-testid="profile-save-btn"
          >
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
