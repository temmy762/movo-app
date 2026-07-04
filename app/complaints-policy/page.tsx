import PolicyLayout, { PolicySection } from "@/components/legal/PolicyLayout";

export const metadata = { title: "Complaints Policy — Movo Privé" };

const UPDATED = "July 4, 2026";

export default function ComplaintsPolicyPage() {
  return (
    <PolicyLayout
      title="Complaints Policy"
      updatedAt={UPDATED}
      intro="We take every complaint seriously. This policy explains how to raise an issue and what happens after you do."
    >
      <PolicySection title="1. How to Submit a Complaint">
        <p>After every completed ride, customers can submit a complaint directly from their ride history using the "Report an Issue" option, covering: chauffeur complaints, vehicle complaints, billing issues, safety concerns, lost property, or general feedback. Photos may be attached where relevant. Complaints can also be submitted via <a href="/contact" className="underline text-gray-800">our Contact page</a> or by emailing <a href="mailto:support@movoprive.com" className="underline text-gray-800">support@movoprive.com</a>.</p>
      </PolicySection>

      <PolicySection title="2. What Happens Next">
        <p>Every complaint is logged with a unique complaint ID, linked to the relevant ride, customer, and chauffeur, and assigned a status: <strong>Open</strong>, <strong>Investigating</strong>, <strong>Resolved</strong>, or <strong>Closed</strong>. Our compliance team reviews new complaints and, where needed, contacts both the customer and chauffeur involved to gather information before reaching a resolution.</p>
      </PolicySection>

      <PolicySection title="3. Response Times">
        <p>Safety-related complaints are prioritized and reviewed as a matter of urgency. Other complaint categories are typically reviewed within a few business days; you will be notified once your complaint moves to Resolved or Closed.</p>
      </PolicySection>

      <PolicySection title="4. Outcomes">
        <p>Depending on the nature and severity of a complaint, outcomes may include a refund or fare adjustment, a warning or additional training for the chauffeur involved, temporary suspension, or permanent removal from the platform. Repeated or serious safety complaints are escalated for full review.</p>
      </PolicySection>

      <PolicySection title="5. Confidentiality">
        <p>Complaint details are shared only with the personnel needed to investigate and resolve the issue, and are kept on record to help us identify recurring problems and improve service quality.</p>
      </PolicySection>

      <p className="text-[11px] text-gray-400 mt-10 pt-4 border-t border-gray-100">
        This policy is a template and should be reviewed by qualified legal/compliance counsel before final publication.
      </p>
    </PolicyLayout>
  );
}
