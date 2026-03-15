import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-6" data-testid="profile-page">
      <div>
        <h1 className="text-xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Update your account details.
        </p>
      </div>

      <ProfileForm
        defaultName={session.user.name ?? ""}
        email={session.user.email}
      />
    </div>
  );
}
