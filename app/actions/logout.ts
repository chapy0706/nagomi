"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export async function logoutAction(): Promise<void> {
  const client = await createSupabaseServerClient();
  await client.auth.signOut();
  redirect("/login");
}
