"use client";

import { redirect } from "next/navigation";

// Redirect to existing driver login
export default function ChauffeurLoginPage() {
  redirect("/driver/onboarding/login");
}
