import { redirect } from "next/navigation";

/* The Safe Ride explanation page was removed from the flow — old links go
   straight to the Safe Ride address step. */
export default function CareRidePage() {
  redirect("/home/pickup?service=care&tier=black");
}
