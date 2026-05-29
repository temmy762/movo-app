"use client";

import { redirect } from "next/navigation";

// Redirect to existing driver onboarding
export default function ChauffeurOnboardingPage() {
  redirect("/driver/onboarding");
}
