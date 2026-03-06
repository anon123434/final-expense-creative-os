"use server";

/**
 * Auth actions — disabled for single-user local mode.
 * Stubs kept so auth can be re-added later.
 */

import { redirect } from "next/navigation";

export async function login(_formData: FormData) {
  redirect("/dashboard");
}

export async function logout() {
  redirect("/dashboard");
}
