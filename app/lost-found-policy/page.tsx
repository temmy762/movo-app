import PolicyLayout, { PolicySection } from "@/components/legal/PolicyLayout";

export const metadata = { title: "Lost & Found Policy — Movo Privé" };

const UPDATED = "July 4, 2026";

export default function LostFoundPolicyPage() {
  return (
    <PolicyLayout
      title="Lost & Found Policy"
      updatedAt={UPDATED}
      intro="Left something behind? Here's how our Lost & Found process works."
    >
      <PolicySection title="1. Reporting a Lost Item">
        <p>If you believe you left an item in a Movo vehicle, submit a report through your ride history or the "Report an Issue" flow with a description of the item, the relevant ride, the date, and your contact information. We'll use this to try to match your item with anything reported found by the chauffeur.</p>
      </PolicySection>

      <PolicySection title="2. Chauffeurs Reporting Found Items">
        <p>Chauffeurs who find an item in their vehicle after a trip can report it directly from their dashboard, linking it to the relevant ride so our team can match it against any customer report.</p>
      </PolicySection>

      <PolicySection title="3. Matching and Return">
        <p>Our compliance team reviews reported items against customer claims for the same ride and coordinates the safest way to return the item — typically arranging a handoff with the chauffeur or a pickup at a Movo office. Movo does not guarantee recovery of lost items, as we act as a facilitator between rider and chauffeur.</p>
      </PolicySection>

      <PolicySection title="4. Fees">
        <p>Chauffeurs may be entitled to reasonable compensation for time and travel involved in returning an item, which will be communicated to the customer before any return is arranged.</p>
      </PolicySection>

      <PolicySection title="5. Unclaimed Items">
        <p>Items that remain unclaimed after a reasonable period may be disposed of or donated in accordance with applicable law.</p>
      </PolicySection>

      <p className="text-[11px] text-gray-400 mt-10 pt-4 border-t border-gray-100">
        This policy is a template and should be reviewed by qualified legal/compliance counsel before final publication.
      </p>
    </PolicyLayout>
  );
}
