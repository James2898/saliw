import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/services/supabase/server";
import EditProfileForm from "@/components/client/EditProfileForm";
import Card from "@/components/server/card";

export const metadata: Metadata = {
  title: "Profile",
};

function formatRole(role?: string | null): string {
  if (!role) return "Member";
  const roleMap: Record<string, string> = {
    music_director: "Music Director",
    admin: "Admin",
    member: "Member",
  };
  return (
    roleMap[role] ??
    role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 flex-wrap mb-6">
          <h1 className="text-2xl font-semibold font-sans text-brand-espresso dark:text-brand-cream">
            Profile Settings
          </h1>
          {profile?.role && (
            <span className="text-xs font-semibold text-brand-brown dark:text-brand-tan bg-brand-cream dark:bg-brand-espresso rounded-lg px-2.5 py-1 border border-brand-brown/20 dark:border-brand-tan/20">
              {formatRole(profile.role)}
            </span>
          )}
        </div>
        <Card padding="lg">
          {!profile ? (
            <p className="text-brand-espresso dark:text-brand-cream">
              Profile not found. Please contact your administrator.
            </p>
          ) : (
            <EditProfileForm profile={profile} />
          )}
        </Card>
      </div>
    </main>
  );
}
