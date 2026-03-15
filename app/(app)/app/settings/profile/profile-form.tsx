"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProfile } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-name">Full Name</Label>
            <Input
              id="profile-name"
              name="name"
              defaultValue={defaultName}
              required
              minLength={2}
              placeholder="Your name"
              data-testid="profile-name-input"
            />
          </div>

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
