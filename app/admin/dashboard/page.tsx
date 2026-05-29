"use client";

import { redirect } from "next/navigation";

// Redirect to admin panel root
export default function AdminDashboardPage() {
  redirect("/admin");
}
