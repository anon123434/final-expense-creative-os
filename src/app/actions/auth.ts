"use server";

import { redirect } from "next/navigation";

/*
Auth is disabled for local single-user mode.
These functions exist only so existing imports don't break.
*/

export async function login() {
  redirect("/dashboard");
}

export async function logout() {
  redirect("/dashboard");
}
