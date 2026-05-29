"use client";

import { redirect } from "next/navigation";

// This page redirects to the existing home page structure
// until full migration is complete
export default function UserDashboardPage() {
  redirect("/home");
}
