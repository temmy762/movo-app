"use client";

import { redirect } from "next/navigation";

// Redirect to existing driver home
export default function ChauffeurDashboardPage() {
  redirect("/driver/home");
}
