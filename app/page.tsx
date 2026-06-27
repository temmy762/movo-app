import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionFromCookieHeader } from "@/lib/session";

export default async function RootPage() {
  // Check for existing session on the server
  const cookieHeader = (await cookies()).toString();
  const session = await getSessionFromCookieHeader(cookieHeader);

  if (session) {
    // Redirect based on role
    if (session.role === "USER") {
      redirect("/user/dashboard");
    } else if (session.role === "DRIVER") {
      redirect("/chauffeur/dashboard");
    } else if (session.role === "ADMIN") {
      redirect("/admin/dashboard");
    }
  }

  // No session: redirect to auth select page
  redirect("/auth/select");
}
