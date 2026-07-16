import PolicyLayout, { PolicySection } from "@/components/legal/PolicyLayout";

export const metadata = { title: "Data Security Policy — Movo" };

const UPDATED = "July 4, 2026";

export default function DataSecurityPage() {
  return (
    <PolicyLayout
      title="Data Security Policy"
      updatedAt={UPDATED}
      intro="This policy describes the technical and organizational measures Movo uses to protect customer, chauffeur, and business data."
    >
      <PolicySection title="1. Encryption of Sensitive Information">
        <p>All data in transit between your device and Movo's servers is encrypted using TLS. Sensitive fields — such as banking details used for chauffeur payouts — are stored encrypted at rest. Full payment card data is never stored on Movo's servers; it is tokenized and held by our PCI-DSS certified payment processor, Stripe.</p>
      </PolicySection>

      <PolicySection title="2. Password Security">
        <p>Account passwords are hashed using a strong, industry-standard one-way hashing algorithm before storage — Movo staff cannot view or recover a user's plaintext password. Password reset requests are verified via one-time codes sent to the account's registered email or phone number.</p>
      </PolicySection>

      <PolicySection title="3. Secure Payment Processing">
        <p>All payments, refunds, and chauffeur payouts are processed through Stripe. Movo's servers never see or store raw card numbers, CVV codes, or full bank account numbers — only tokenized references and the minimum masked information (e.g. last 4 digits) needed for support and receipts.</p>
      </PolicySection>

      <PolicySection title="4. Access Controls">
        <p>Access to production systems and customer data is restricted to authorized personnel on a need-to-know basis. Administrative accounts require authentication, and admin actions that affect bookings, payments, or user accounts are attributable to the admin who performed them.</p>
      </PolicySection>

      <PolicySection title="5. Internal Admin Permissions">
        <p>The Movo admin panel separates operational functions (bookings, drivers, financials, compliance) so staff can be granted access appropriate to their role. Sensitive actions — refunds, payout approvals, driver approvals, and compliance case management — are logged for audit purposes.</p>
      </PolicySection>

      <PolicySection title="6. Data Retention Period">
        <p>We retain data only as long as necessary for the purposes described in our Privacy Policy:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Active account data — retained while the account remains active</li>
          <li>Completed ride and payment records — retained for a period sufficient to meet tax, accounting, and legal obligations (typically several years, per applicable financial record-keeping law)</li>
          <li>Chauffeur onboarding documents — retained for the duration of the chauffeur's activity on the platform plus a reasonable post-deactivation period for compliance verification</li>
          <li>Support tickets, complaints, and incident reports — retained for a period sufficient to resolve disputes and satisfy regulatory/insurance requirements</li>
        </ul>
      </PolicySection>

      <PolicySection title="7. Data Breach Response Process">
        <p>In the event of a suspected data breach, Movo will: (1) contain and assess the scope of the incident, (2) notify affected individuals and applicable regulators as required by law, including any mandatory breach-reporting obligations under PIPEDA, (3) take corrective action to prevent recurrence, and (4) document the incident and response for internal review.</p>
      </PolicySection>

      <PolicySection title="8. Secure Server Practices">
        <p>Production infrastructure is kept current with security patches, database access is restricted to the application layer (no direct public access), and backups are taken regularly to protect against data loss. Third-party services we rely on (payments, email, SMS) are selected for their own security and compliance certifications.</p>
      </PolicySection>

      <p className="text-[11px] text-gray-400 mt-10 pt-4 border-t border-gray-100">
        This policy is a template describing current and intended practices. Specific retention periods and breach-notification timelines should be finalized with legal counsel to ensure compliance with PIPEDA and any municipal licensing requirements.
      </p>
    </PolicyLayout>
  );
}
