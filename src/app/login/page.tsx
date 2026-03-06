import { redirect } from "next/navigation";

/**
 * Login page disabled — single-user local mode.
 * Redirects to dashboard in case anyone hits /login directly.
 */
export default function LoginPage() {
  redirect("/dashboard");
}
