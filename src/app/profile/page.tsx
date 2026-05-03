import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/services/supabase/server";
import EditProfileForm from "@/components/client/EditProfileForm";

export const metadata: Metadata = {
  title: "Profile",
};

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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold font-sans text-brand-espresso dark:text-brand-cream">
        Profile Settings
      </h1>
      {!profile ? (
        <p className="text-brand-espresso dark:text-brand-cream">
          Profile not found. Please contact your administrator.
        </p>
      ) : (
        <EditProfileForm profile={profile} />
      )}
    </div>
  );
}
