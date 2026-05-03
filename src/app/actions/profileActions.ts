"use server";

import { createClient } from "@/services/supabase/server";

export async function updateProfileAction(input: {
  full_name: string;
}): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: input.full_name })
      .eq("id", user.id);

    if (error) {
      return { error: "Unable to update profile. Please try again." };
    }

    return { success: true };
  } catch {
    return { error: "An unexpected error occurred. Please try again." };
  }
}
