import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionFromCookieHeader } from "@/lib/session";
import LandingPage from "./landing/page";

export default async function RootPage() {
  const cookieHeader = (await cookies()).toString();
  const session = await getSessionFromCookieHeader(cookieHeader);

  if (session) {
    if (session.role === "USER")   redirect("/home");
    if (session.role === "DRIVER") redirect("/driver/home");
    if (session.role === "ADMIN")  redirect("/admin/dashboard");
  }

  return <LandingPage />;
}
